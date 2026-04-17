import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { haptics } from './utils/haptics';
import { PreferenceEngine } from './utils/PreferenceEngine';
import { FALLBACK_RESTAURANTS } from './data/restaurants';
import { calcDistanceMi, formatDistance } from './utils/cuisine';
import { supabase, authReadyPromise, getUserId } from './utils/supabase';
import { useSession } from './hooks/useSession';
import { useRealtimeSwipes } from './hooks/useRealtimeSwipes';
import { useRestaurants } from './hooks/useRestaurants';
import { isOpenNow } from './utils/hours';
import { saveActiveSession, getActiveSession, clearActiveSession } from './utils/activeSession';
import SwipeCard from './components/SwipeCard';
import ShakeUpButton from './components/ShakeUpButton';
import MatchTray from './components/MatchTray';
import MatchNotification from './components/MatchNotification';
import ShuffleOverlay from './components/ShuffleOverlay';
import SessionScreen from './components/SessionScreen';
import GroupLinkScreen from './components/GroupLinkScreen';
import LockInScreen from './components/LockInScreen';
import ReviewMatchesScreen from './components/ReviewMatchesScreen';
import ChooseForMeAnimation from './components/ChooseForMeAnimation';
import SwipeFilterDrawer from './components/SwipeFilterDrawer';
import GroupMembersPanel from './components/GroupMembersPanel';

// Check if this is a join link: /s/{sessionId} (accounting for base path)
function getJoinSessionId() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/s\\/([a-z0-9]+)$`, 'i');
  const match = window.location.pathname.match(re);
  return match ? match[1] : null;
}

const initialJoinId = getJoinSessionId();

export default function App() {
  const [screen, setScreen] = useState(initialJoinId ? 'joining' : 'session');
  const [mode, setMode] = useState(initialJoinId ? 'group' : null);
  const [myUserId, setMyUserId] = useState(null);
  const engineRef = useRef(new PreferenceEngine());
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [lockedRestaurant, setLockedRestaurant] = useState(null);
  const [matchNotif, setMatchNotif] = useState(null);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [choosingForMe, setChoosingForMe] = useState(false);
  // Whether the current tentative pick came from Choose For Me (controls Spin Again button)
  const [cfmTentative, setCfmTentative] = useState(false);
  // Shown in the late-joiner Lock-In case ("group picked this while you were away")
  const [lateJoinerBanner, setLateJoinerBanner] = useState(false);
  // Bump to force ChooseForMeAnimation to re-run (spin again)
  const [cfmReplayKey, setCfmReplayKey] = useState(0);
  const [showSwipeFilters, setShowSwipeFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ maxDistance: 5, selectedPrices: [], openNow: false, delivery: false, reservations: false });
  const [showMatchPrompt, setShowMatchPrompt] = useState(false);
  const [locationName, setLocationName] = useState(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const matchPromptShownRef = useRef(false);

  const session = useSession();
  const isGroupActive = mode === 'group' && (session.sessionStatus === 'active' || session.sessionStatus === 'waiting');
  const realtime = useRealtimeSwipes(session.sessionId, isGroupActive);
  const { restaurants: liveRestaurants, loading: restaurantsLoading, error: restaurantsError, coords, setCoords } = useRestaurants(activeFilters.maxDistance);
  const geolocateCoordsRef = useRef(null);

  // Save initial geolocation coords so we can revert from manual location
  useEffect(() => {
    if (coords && !geolocateCoordsRef.current) {
      geolocateCoordsRef.current = coords;
    }
  }, [coords]);

  // Cache our own user id so we can pick our nickname out of the members list.
  useEffect(() => { getUserId().then(setMyUserId); }, []);

  // Use live restaurants or fallback, with dynamic distances
  const availableRestaurants = (() => {
    if (liveRestaurants && liveRestaurants.length > 0) return liveRestaurants;
    if (restaurantsLoading) return null;
    // Apply dynamic distances to fallback data
    return FALLBACK_RESTAURANTS.map(r => {
      if (coords && r.lat && r.lng) {
        const distMi = calcDistanceMi(coords.lat, coords.lng, r.lat, r.lng);
        return { ...r, distance: formatDistance(distMi), distanceMi: distMi };
      }
      return { ...r, distance: r.distance || '—' };
    }).sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999));
  })();

  // "Return to your group" candidate shown on the home screen.
  // null = none; { sessionId, groupName, memberCount } = active candidate.
  const [rejoinCandidate, setRejoinCandidate] = useState(null);

  // Handle join links — wait for auth (not geolocation), with error handling and retry
  const joinAttemptedRef = useRef(false);
  const [joinError, setJoinError] = useState(null);

  const attemptJoin = useCallback(async (sessionId) => {
    setJoinError(null);
    try {
      // Wait for auth to be ready before attempting any DB operations
      await authReadyPromise;
      const result = await session.joinSession(sessionId, coords);
      if (result.success && result.deck) {
        saveActiveSession(sessionId);
        setDeck(result.deck);
        setCardKey(k => k + 1);

        if (result.swipedIds && result.swipedIds.size > 0) {
          let resumeIndex = 0;
          for (let i = 0; i < result.deck.length; i++) {
            if (result.swipedIds.has(result.deck[i].id)) {
              resumeIndex = i + 1;
            } else {
              break;
            }
          }
          setCurrentIndex(resumeIndex);

          if (result.matchIds && result.matchIds.size > 0) {
            const restoredMatches = result.deck.filter(r => result.matchIds.has(r.id));
            setMatches(restoredMatches);
          }
        } else {
          setCurrentIndex(0);
        }

        // Late joiner: session is already locked — skip swiping, go straight to Lock-In.
        if (result.lockedRestaurantId) {
          const lockedRest = result.deck.find(r => r.id === result.lockedRestaurantId);
          if (lockedRest) {
            setLockedRestaurant(lockedRest);
            setLateJoinerBanner(!result.isReturning);
            setScreen('lockin');
            return;
          }
        }

        if (result.isReturning && result.status === 'active') {
          setScreen('swiping');
        } else {
          setScreen('groupLink');
        }
      } else {
        setJoinError(result.error || 'Could not join session');
      }
    } catch (e) {
      console.error('Join failed:', e);
      setJoinError('Something went wrong. Check your connection and try again.');
    }
  }, [coords, session]);

  useEffect(() => {
    if (!initialJoinId || joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;
    attemptJoin(initialJoinId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On home-screen load, check if there's a stored active session we can offer
  // to return to. Validates the session is still valid and the user is still
  // a member before showing the banner — otherwise clears the stored entry.
  useEffect(() => {
    if (initialJoinId) return; // URL join takes precedence
    if (screen !== 'session') return; // only relevant on home
    const storedId = getActiveSession();
    if (!storedId) return;
    let cancelled = false;
    (async () => {
      try {
        await authReadyPromise;
        const { data: sess, error } = await supabase
          .from('sessions').select('id, group_name, expires_at').eq('id', storedId).maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn('Rejoin check: sessions lookup error', error.message);
          clearActiveSession();
          return;
        }
        if (!sess) {
          console.warn('Rejoin check: session not found (may have expired/been deleted)', storedId);
          clearActiveSession();
          return;
        }
        if (new Date(sess.expires_at) < new Date()) { clearActiveSession(); return; }
        const userId = await getUserId();
        if (!userId) return;
        const { data: member, error: memberErr } = await supabase
          .from('session_members').select('user_id')
          .eq('session_id', storedId).eq('user_id', userId).maybeSingle();
        if (cancelled) return;
        if (memberErr) {
          console.warn('Rejoin check: member lookup error', memberErr.message);
          return;
        }
        if (!member) { clearActiveSession(); return; }
        const { count } = await supabase
          .from('session_members').select('*', { count: 'exact', head: true })
          .eq('session_id', storedId);
        if (cancelled) return;
        setRejoinCandidate({
          sessionId: storedId,
          groupName: sess.group_name || null,
          memberCount: count || 1,
        });
      } catch (e) {
        console.warn('Rejoin check: unexpected error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [screen]);

  const handleRejoinStored = useCallback(() => {
    if (!rejoinCandidate) return;
    setRejoinCandidate(null);
    setMode('group'); // goHome cleared this; restore before rejoining so group UI + realtime activate
    setScreen('joining');
    joinAttemptedRef.current = false;
    attemptJoin(rejoinCandidate.sessionId);
  }, [rejoinCandidate, attemptJoin]);

  const handleDismissRejoin = useCallback(() => {
    clearActiveSession();
    setRejoinCandidate(null);
  }, []);

  // When session deck is ready (for duo mode), use it
  useEffect(() => {
    if (session.deck && mode === 'group' && deck.length === 0) {
      setDeck(session.deck);
      setCurrentIndex(0);
      setCardKey(k => k + 1);
    }
  }, [session.deck, mode, deck.length]);

  // (No coordinated start needed — each member clicks "Start Swiping" independently)

  // When partner triggers a match via realtime
  useEffect(() => {
    if (realtime.newPartnerMatch) {
      const restaurant = deck.find(r => r.id === realtime.newPartnerMatch);
      if (restaurant && !matches.find(m => m.id === restaurant.id)) {
        setMatches(prev => [...prev, restaurant]);
        setMatchNotif(restaurant);
        haptics.match();
      }
      realtime.clearPartnerMatch();
    }
  }, [realtime.newPartnerMatch, realtime.clearPartnerMatch, matches, deck]);

  // Non-creator receives a tentative pick from the creator — navigate to Lock-In
  useEffect(() => {
    if (mode !== 'group' || session.isCreator) return;
    if (!realtime.tentativePick) return;
    const restaurant = deck.find(r => r.id === realtime.tentativePick.restaurantId);
    if (!restaurant) return;
    setLockedRestaurant(restaurant);
    setLateJoinerBanner(false);
    setScreen('lockin');
  }, [realtime.tentativePick, mode, session.isCreator, deck]);

  // Non-creator sees tentative cleared while on Lock-In — pull them back to review
  useEffect(() => {
    if (mode !== 'group' || session.isCreator) return;
    if (screen !== 'lockin') return;
    if (realtime.tentativePick) return;
    if (realtime.lockedRestaurantId || session.lockedRestaurantId) return;
    setLockedRestaurant(null);
    setScreen(matches.length > 0 ? 'review' : 'swiping');
  }, [realtime.tentativePick, realtime.lockedRestaurantId, session.lockedRestaurantId, mode, session.isCreator, screen, matches.length]);

  // Committed lock-in from DB (realtime) — everyone transitions to Lock-In (non-tentative)
  useEffect(() => {
    const lockedId = realtime.lockedRestaurantId;
    if (!lockedId || mode !== 'group') return;
    const restaurant = deck.find(r => r.id === lockedId);
    if (!restaurant) return;
    setLockedRestaurant(restaurant);
    setCfmTentative(false);
    setLateJoinerBanner(false);
    setScreen('lockin');
  }, [realtime.lockedRestaurantId, deck, mode]);

  // Prompt at 5 matches
  useEffect(() => {
    if (matches.length >= 5 && !matchPromptShownRef.current && screen === 'swiping') {
      matchPromptShownRef.current = true;
      // Small delay so the match notification can show first
      setTimeout(() => setShowMatchPrompt(true), 800);
    }
  }, [matches.length, screen]);

  const initDeck = useCallback((restaurantList) => {
    const source = restaurantList || availableRestaurants || FALLBACK_RESTAURANTS;
    const sorted = engineRef.current.sortRestaurants(source);
    setDeck(sorted);
    setCurrentIndex(0);
    setCardKey(k => k + 1);
  }, [availableRestaurants]);

  const goHome = () => {
    // If we're leaving an active group session, pre-populate the rejoin banner
    // so it appears immediately on home (vs. waiting for async validation).
    if (mode === 'group' && session.sessionId) {
      setRejoinCandidate({
        sessionId: session.sessionId,
        groupName: displayedGroupName,
        memberCount: realtime.members?.length || 1,
      });
    }
    setScreen('session');
    setMode(null);
    setMatches([]);
    setLockedRestaurant(null);
    setMatchNotif(null);
    setCurrentIndex(0);
    setDeck([]);
    setShowMatchPrompt(false);
    setShowGroupPanel(false);
    matchPromptShownRef.current = false;
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
    if (window.location.pathname !== basePath) {
      window.history.replaceState(null, '', basePath);
    }
  };

  const applyFilters = useCallback((restaurants, filters) => {
    if (!filters) return restaurants;
    let filtered = restaurants;
    if (filters.maxDistance < 20) {
      filtered = filtered.filter(r => r.distanceMi != null && r.distanceMi <= filters.maxDistance);
    }
    if (filters.selectedPrices && filters.selectedPrices.length > 0) {
      const priceLevels = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
      filtered = filtered.filter(r => {
        const level = priceLevels[r.price] || 2;
        return filters.selectedPrices.includes(level);
      });
    }
    if (filters.openNow) {
      filtered = filtered.filter(r => {
        const status = isOpenNow(r.hours);
        return status.isOpen !== false; // keep open and unknown (null)
      });
    }
    if (filters.delivery) {
      filtered = filtered.filter(r => r.delivery !== false);
    }
    if (filters.reservations) {
      filtered = filtered.filter(r => r.reservations !== false);
    }
    return filtered;
  }, []);

  const handleStart = async (selectedMode, filters) => {
    setMode(selectedMode);
    setActiveFilters(filters);
    const source = availableRestaurants || FALLBACK_RESTAURANTS;
    const filtered = applyFilters(source, filters);
    if (selectedMode === 'group') {
      const id = await session.createSession(filtered);
      if (id) {
        saveActiveSession(id);
        setScreen('groupLink');
      }
    } else {
      initDeck(filtered);
      setScreen('swiping');
    }
  };

  const handleGoSolo = useCallback(() => {
    setMode('solo');
    const deckToUse = (session.deck && session.deck.length > 0)
      ? session.deck
      : applyFilters(availableRestaurants || FALLBACK_RESTAURANTS, activeFilters);
    initDeck(deckToUse);
    setScreen('swiping');
  }, [session.deck, availableRestaurants, activeFilters, applyFilters, initDeck]);

  const handleGroupContinue = async (nickname, groupNameInput) => {
    // Save nickname if provided
    if (nickname) {
      await session.updateNickname(nickname);
    }
    // Save group name if creator provided one (update DB)
    if (groupNameInput && session.isCreator && session.sessionId) {
      await supabase.from('sessions')
        .update({ group_name: groupNameInput })
        .eq('id', session.sessionId);
    }
    if (session.deck) {
      setDeck(session.deck);
      setCurrentIndex(0);
      setCardKey(k => k + 1);
    }
    // Ensure session is active so swipes can be recorded
    if (session.sessionStatus === 'waiting') {
      await session.startSession();
    }
    setScreen('swiping');
  };

  const handleSwipe = useCallback(async (direction) => {
    const restaurant = deck[currentIndex];
    if (!restaurant) return;

    engineRef.current.recordSwipe(restaurant, direction);

    if (direction === 'right') {
      if (mode === 'group') {
        const { isMatch } = await realtime.recordSwipe(restaurant.id, direction);
        if (isMatch) {
          setMatches(prev => {
            if (prev.find(m => m.id === restaurant.id)) return prev;
            return [...prev, restaurant];
          });
          setMatchNotif(restaurant);
          haptics.match();
        }
      } else {
        setMatches(prev => [...prev, restaurant]);
      }
    } else if (mode === 'group') {
      await realtime.recordSwipe(restaurant.id, direction);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 50);
  }, [deck, currentIndex, mode, realtime]);

  const handleShakeUp = useCallback(() => {
    engineRef.current.shakeUp();
    setShuffleActive(true);
  }, []);

  const handleShuffleDone = useCallback(() => {
    setShuffleActive(false);
    const remaining = deck.slice(currentIndex + 1);
    const sorted = engineRef.current.sortRestaurants(remaining);
    setDeck(prev => [...prev.slice(0, currentIndex), prev[currentIndex], ...sorted]);
    setCardKey(k => k + 1);
  }, [deck, currentIndex]);

  const handleRemoveMatch = useCallback((restaurantId) => {
    setMatches(prev => prev.filter(m => m.id !== restaurantId));
  }, []);

  // Called when a user selects a restaurant (match card tap, MatchTray tap, or CFM result).
  // Solo: direct lock-in.
  // Group creator: broadcast TENTATIVE pick (no DB write yet), show Lock-In with confirm/spin-again.
  // Group non-creator: local-only preview, no broadcast, no DB write.
  const handleLockIn = (restaurant, opts = {}) => {
    const { fromCFM = false } = opts;
    engineRef.current.recordOrder(restaurant);
    setLockedRestaurant(restaurant);
    setChoosingForMe(false);
    setCfmTentative(fromCFM);
    setLateJoinerBanner(false);
    if (mode === 'group' && session.isCreator) {
      realtime.broadcastTentativePick(restaurant.id);
    }
    setScreen('lockin');
    haptics.lockIn();
  };

  const handleChooseForMe = () => {
    setChoosingForMe(true);
  };

  const handleChosenForMe = (restaurant) => {
    handleLockIn(restaurant, { fromCFM: true });
  };

  // Creator confirms the tentative pick — persists to DB; realtime fires for all members.
  const handleConfirmLockIn = useCallback(async () => {
    if (!lockedRestaurant || !session.isCreator) return;
    const res = await session.lockInRestaurant(lockedRestaurant.id);
    if (res?.success) {
      setCfmTentative(false);
      haptics.lockIn();
    }
  }, [lockedRestaurant, session]);

  // Creator re-spins Choose For Me. Clears tentative for all members and restarts animation.
  const handleSpinAgain = useCallback(() => {
    realtime.broadcastClearTentative();
    setLockedRestaurant(null);
    setCfmTentative(false);
    setCfmReplayKey(k => k + 1);
    setScreen('review');
    setChoosingForMe(true);
  }, [realtime]);

  // Creator backs out of a tentative pick — clears for everyone, returns to review.
  const handleTentativeBack = useCallback(() => {
    realtime.broadcastClearTentative();
    setLockedRestaurant(null);
    setCfmTentative(false);
    setScreen(matches.length > 0 ? 'review' : 'swiping');
  }, [realtime, matches.length]);

  const handleSwipeFilterApply = useCallback((newFilters) => {
    setActiveFilters(newFilters);
    setShowSwipeFilters(false);
    // Re-filter remaining cards from the full source
    const source = availableRestaurants || FALLBACK_RESTAURANTS;
    const filtered = applyFilters(source, newFilters);
    // Keep already-swiped cards, replace the rest with newly filtered+sorted
    const alreadySwiped = new Set(deck.slice(0, currentIndex).map(r => r.id));
    const remaining = filtered.filter(r => !alreadySwiped.has(r.id));
    const sorted = engineRef.current.sortRestaurants(remaining);
    setDeck([...deck.slice(0, currentIndex), ...sorted]);
    setCardKey(k => k + 1);
  }, [availableRestaurants, applyFilters, deck, currentIndex]);

  const handleViewMatches = () => {
    setScreen('review');
  };

  // Decorate + sort matches for the Review screen.
  // Vote count = other-member right-swipes + 1 (for the current user — matches only
  // appear in this list if they're a mutual right-swipe with this user). Higher vote
  // count floats up so unanimous picks show first in 3+ groups.
  const reviewMatches = useMemo(() => {
    if (mode !== 'group') return matches;
    const total = realtime.members?.length || 1;
    return matches.map(r => {
      const others = realtime.otherRightSwipes?.get(r.id);
      const voteCount = (others ? others.size : 0) + 1;
      return { ...r, voteCount, totalMembers: total };
    }).sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  }, [matches, mode, realtime.members, realtime.otherRightSwipes]);

  // Show the (i) icon only when the sort order is meaningful (3+ members, some non-unanimous)
  const showMatchOrderInfo = useMemo(() => {
    if (mode !== 'group') return false;
    const total = realtime.members?.length || 1;
    if (total < 3) return false;
    return reviewMatches.some(r => (r.voteCount ?? 0) < total);
  }, [mode, realtime.members, reviewMatches]);

  const currentCard = deck[currentIndex];
  const nextCard = deck[currentIndex + 1];
  const cardsRemaining = deck.length - currentIndex;

  // Prefer the realtime-synced group name so joiners see it immediately when
  // the creator sets it after sharing the link.
  const displayedGroupName = realtime.liveGroupName ?? session.groupName;

  // Session error screen
  if (session.sessionStatus === 'full') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '32px', gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Session is full</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>
          This group session is full.
        </p>
        <button onClick={goHome} style={{
          marginTop: '12px', padding: '14px 32px', borderRadius: 'var(--radius-btn)',
          border: 'none', background: 'var(--accent-primary)', color: 'white',
          fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito',
        }}>Go Home</button>
      </div>
    );
  }

  const handleLocationChange = useCallback((newCoords, name) => {
    if (newCoords) {
      setCoords(newCoords);
      if (name) setLocationName(name);
    } else {
      // Revert to geolocation
      setLocationName(null);
      if (geolocateCoordsRef.current) {
        setCoords(geolocateCoordsRef.current);
      } else {
        navigator.geolocation?.getCurrentPosition(
          (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      }
    }
  }, [setCoords]);

  if (screen === 'joining') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', gap: '16px',
        padding: '32px',
      }}>
        {joinError ? (
          <>
            <div style={{ fontSize: '48px' }}>😕</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center' }}>
              Couldn't join the group
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
              {joinError}
            </p>
            <button
              onClick={() => {
                joinAttemptedRef.current = false;
                setJoinError(null);
                attemptJoin(initialJoinId);
              }}
              style={{
                marginTop: '8px', padding: '14px 32px', borderRadius: 'var(--radius-btn)',
                border: 'none', background: 'var(--accent-primary)', color: 'white',
                fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito',
              }}
            >Try Again</button>
            <button
              onClick={goHome}
              style={{
                marginTop: '4px', padding: '10px 24px', borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--bg-surface)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Nunito',
              }}
            >Go Home</button>
          </>
        ) : (
          <>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '3px solid var(--bg-surface)',
              borderTopColor: 'var(--accent-primary)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700 }}>
              Joining group...
            </p>
          </>
        )}
      </div>
    );
  }

  if (screen === 'session') {
    return (
      <SessionScreen
        onStart={handleStart}
        loading={restaurantsLoading}
        coords={coords}
        onLocationChange={handleLocationChange}
        locationError={restaurantsError}
        rejoinCandidate={rejoinCandidate}
        onRejoin={handleRejoinStored}
        onDismissRejoin={handleDismissRejoin}
      />
    );
  }

  if (screen === 'groupLink') {
    const myMember = realtime.members?.find(m => m.user_id === myUserId);
    return (
      <GroupLinkScreen
        sessionId={session.sessionId}
        memberCount={realtime.memberCount || 1}
        onContinue={handleGroupContinue}
        onBack={goHome}
        onSolo={handleGoSolo}
        isJoiner={!session.isCreator}
        groupName={displayedGroupName}
        existingNickname={myMember?.nickname || ''}
      />
    );
  }

  if (screen === 'review') {
    return (
      <>
        <ReviewMatchesScreen
          matches={reviewMatches}
          mode={mode}
          onSelect={handleLockIn}
          onChooseForMe={handleChooseForMe}
          onBack={() => setScreen('swiping')}
          isCreator={mode !== 'group' || session.isCreator}
          showOrderInfo={showMatchOrderInfo}
        />
        {choosingForMe && (
          <ChooseForMeAnimation
            key={cfmReplayKey}
            matches={reviewMatches}
            onChosen={handleChosenForMe}
          />
        )}
      </>
    );
  }

  if (screen === 'lockin') {
    // Decide UI state:
    //   - committed: session.locked_restaurant_id set (via DB or realtime)
    //   - tentative: group, not committed, creator broadcast a pick OR member received one
    //   - preview: non-creator tapped a match card locally (no broadcast, no commit)
    const committed = !!(realtime.lockedRestaurantId || session.lockedRestaurantId);
    const inTentative = mode === 'group' && !committed && (
      (session.isCreator && !!lockedRestaurant)
      || (!session.isCreator && !!realtime.tentativePick)
    );
    const preview = mode === 'group' && !committed && !inTentative && !session.isCreator && !!lockedRestaurant;
    const creatorMember = realtime.members?.find(m => m.user_id === session.creatorId);
    const creatorName = creatorMember?.nickname || null;
    const tentativeProps = inTentative ? {
      isCreator: !!session.isCreator,
      setByName: creatorName,
      onConfirm: handleConfirmLockIn,
      onSpinAgain: cfmTentative && session.isCreator ? handleSpinAgain : null,
    } : null;
    const banner = lateJoinerBanner
      ? 'The group picked this while you were away'
      : null;
    const handleLockInBack = inTentative && session.isCreator
      ? handleTentativeBack
      : () => setScreen(matches.length > 0 ? 'review' : 'swiping');
    return (
      <LockInScreen
        restaurant={lockedRestaurant}
        mode={mode}
        onBack={handleLockInBack}
        tentative={tentativeProps}
        banner={banner}
        preview={preview}
      />
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              haptics.navTransition();
              // Group creator: back goes to the group homepage (keeps the session alive).
              // Solo / group member: back exits all the way home.
              // Keying on session.isCreator (not mode) — `mode` can drift after rejoin,
              // but isCreator is always true iff this user created the active session.
              if (session.isCreator && session.sessionId) {
                setMode('group'); // self-heal in case it was cleared during goHome
                setScreen('groupLink');
              } else {
                goHome();
              }
            }}
            style={{
              width: '32px', height: '32px', borderRadius: '10px',
              border: 'none', background: 'var(--bg-surface)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span style={{
            fontSize: '20px', fontWeight: 900,
            background: 'linear-gradient(135deg, var(--accent-primary), #FF8A65)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Nosh Pit</span>
          {mode === 'group' && (
            <button
              onClick={() => {
                haptics.light();
                setShowGroupPanel(true);
                // Refresh from DB in case state drifted (timing, RLS hiccup, etc.)
                realtime.refetchMembers?.();
              }}
              style={{
                marginLeft: '8px', fontSize: '11px', fontWeight: 700,
                background: 'var(--accent-primary)', color: 'white',
                padding: '2px 8px', borderRadius: '6px',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontFamily: 'Nunito',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayedGroupName || 'GROUP'}
              <span style={{ fontSize: '11px', flexShrink: 0 }}>
                {realtime.members.length > 0 ? ` ${realtime.members.length}` : ''}
              </span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(mode !== 'group' || session.isCreator) && (
            <button
              onClick={() => { haptics.filterTap(); setShowSwipeFilters(true); }}
              style={{
                width: '32px', height: '32px', borderRadius: '10px',
                border: 'none', background: 'var(--bg-surface)',
                color: (activeFilters.maxDistance < 20 || activeFilters.selectedPrices.length > 0 || activeFilters.openNow || activeFilters.delivery || activeFilters.reservations)
                  ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
                <circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/><circle cx="16" cy="6" r="2" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Loading overlay when fetching more restaurants after filter change */}
        {restaurantsLoading && (
          <div style={{
            position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, background: 'var(--bg-card)', borderRadius: '12px',
            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--accent-secondary)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Loading more restaurants...
            </span>
          </div>
        )}
        {cardsRemaining <= 0 ? (
          <div style={{ textAlign: 'center', width: '100%', padding: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>That's all for now!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600 }}>
              {matches.length > 0
                ? `You matched with ${matches.length} restaurant${matches.length > 1 ? 's' : ''}!`
                : 'No matches this round. Try again!'}
            </p>
            {matches.length > 0 && (
              <button
                onClick={() => { haptics.navTransition(); handleViewMatches(); }}
                style={{
                  marginTop: '20px', padding: '14px 32px',
                  borderRadius: 'var(--radius-btn)', border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
                  color: 'white', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Nunito', boxShadow: '0 4px 16px var(--accent-primary-glow)',
                }}
              >Review Matches</button>
            )}
            {mode !== 'group' && (
              <button
                onClick={() => {
                  const source = availableRestaurants || FALLBACK_RESTAURANTS;
                  const filtered = applyFilters(source, activeFilters);
                  initDeck(filtered);
                }}
                style={{
                  marginTop: '12px', padding: '14px 32px',
                  borderRadius: 'var(--radius-btn)',
                  border: matches.length > 0 ? '1px solid var(--bg-surface)' : 'none',
                  background: matches.length > 0 ? 'transparent' : 'var(--accent-primary)',
                  color: matches.length > 0 ? 'var(--text-secondary)' : 'white',
                  fontSize: '16px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Nunito',
                }}
              >Reshuffle</button>
            )}
          </div>
        ) : (
          <>
            {nextCard && (
              <SwipeCard
                key={`next-${nextCard.id}-${cardKey}`}
                restaurant={nextCard}
                isTop={false}
                onSwipe={() => {}}
                style={{ transform: 'scale(0.95)', filter: 'brightness(0.7)', top: '8px' }}
              />
            )}
            {currentCard && (
              <SwipeCard
                key={`top-${currentCard.id}-${cardKey}`}
                restaurant={currentCard}
                isTop={true}
                onSwipe={handleSwipe}
              />
            )}
          </>
        )}
      </div>

      {/* Match tray */}
      <MatchTray matches={matches} onSelect={handleLockIn} onRemove={handleRemoveMatch} onViewAll={handleViewMatches} />

      {/* Bottom controls */}
      <div style={{
        padding: '12px 32px 32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        zIndex: 20,
      }}>
        <button
          onClick={() => { if (currentCard) { haptics.light(); handleSwipe('left'); } }}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            border: '2px solid var(--bg-surface)', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <ShakeUpButton onShakeUp={handleShakeUp} disabled={cardsRemaining <= 1 || mode === 'group'} />

        <button
          onClick={() => { if (currentCard) { haptics.swipeRight(); handleSwipe('right'); } }}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            border: 'none', background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px var(--accent-primary-glow)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      {/* Shuffle overlay */}
      <ShuffleOverlay active={shuffleActive} onDone={handleShuffleDone} />

      {/* Match notification */}
      {matchNotif && (
        <MatchNotification
          restaurant={matchNotif}
          onDismiss={() => setMatchNotif(null)}
        />
      )}

      {/* Filter drawer */}
      {showSwipeFilters && (
        <SwipeFilterDrawer
          filters={activeFilters}
          onApply={handleSwipeFilterApply}
          onClose={() => setShowSwipeFilters(false)}
          locationName={locationName}
          onLocationChange={handleLocationChange}
          canChangeLocation={mode === 'solo' || (mode === 'group' && session.isCreator)}
        />
      )}

      {/* Group members panel — also serves as the re-share hub for the creator */}
      {showGroupPanel && mode === 'group' && (
        <GroupMembersPanel
          members={realtime.members}
          creatorId={session.creatorId}
          deckSize={deck.length}
          groupName={displayedGroupName}
          sessionId={session.sessionId}
          isCreator={session.isCreator}
          onClose={() => setShowGroupPanel(false)}
        />
      )}

      {/* Match prompt at 5 matches */}
      {showMatchPrompt && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            padding: '28px', width: '100%', maxWidth: '340px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              {matches.length} matches!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>
              Ready to pick a restaurant, or want to keep swiping?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { haptics.medium(); setShowMatchPrompt(false); handleViewMatches(); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 'var(--radius-btn)',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
                  color: 'white', fontSize: '16px', fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'Nunito',
                  boxShadow: '0 4px 16px var(--accent-primary-glow)',
                }}
              >
                Review Matches
              </button>
              <button
                onClick={() => { haptics.light(); setShowMatchPrompt(false); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--bg-surface)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Nunito',
                }}
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
