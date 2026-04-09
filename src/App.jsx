import { useState, useRef, useCallback, useEffect } from 'react';
import { haptics } from './utils/haptics';
import { PreferenceEngine } from './utils/PreferenceEngine';
import { FALLBACK_RESTAURANTS } from './data/restaurants';
import { calcDistanceMi, formatDistance } from './utils/cuisine';
import { useSession } from './hooks/useSession';
import { useRealtimeSwipes } from './hooks/useRealtimeSwipes';
import { useRestaurants } from './hooks/useRestaurants';
import { isOpenNow } from './utils/hours';
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
  const engineRef = useRef(new PreferenceEngine());
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [lockedRestaurant, setLockedRestaurant] = useState(null);
  const [matchNotif, setMatchNotif] = useState(null);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [choosingForMe, setChoosingForMe] = useState(false);
  const [showSwipeFilters, setShowSwipeFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ maxDistance: 5, selectedPrices: [], openNow: true });
  const [showMatchPrompt, setShowMatchPrompt] = useState(false);
  const matchPromptShownRef = useRef(false);

  const session = useSession();
  const isGroupActive = mode === 'group' && (session.sessionStatus === 'active' || session.sessionStatus === 'waiting');
  const realtime = useRealtimeSwipes(session.sessionId, isGroupActive);
  const { restaurants: liveRestaurants, loading: restaurantsLoading, error: restaurantsError, coords, setCoords } = useRestaurants();
  const geolocateCoordsRef = useRef(null);

  // Save initial geolocation coords so we can revert from manual location
  useEffect(() => {
    if (coords && !geolocateCoordsRef.current) {
      geolocateCoordsRef.current = coords;
    }
  }, [coords]);

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

  // Handle join links on mount
  useEffect(() => {
    if (initialJoinId) {
      session.joinSession(initialJoinId).then(result => {
        if (result.success && result.deck) {
          setDeck(result.deck);
          setCurrentIndex(0);
          setCardKey(k => k + 1);
          setScreen('swiping');
        } else {
          setMode(null);
          setScreen('session');
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When session deck is ready (for duo mode), use it
  useEffect(() => {
    if (session.deck && mode === 'group' && deck.length === 0) {
      setDeck(session.deck);
      setCurrentIndex(0);
      setCardKey(k => k + 1);
    }
  }, [session.deck, mode, deck.length]);

  // When partner joins (creator detects via presence), activate session
  useEffect(() => {
    if (mode === 'group' && session.isCreator && realtime.partnerConnected && session.sessionStatus === 'waiting') {
      session.activateSession();
    }
  }, [mode, session.isCreator, realtime.partnerConnected, session.sessionStatus, session.activateSession]);

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
    setScreen('session');
    setMode(null);
    setMatches([]);
    setLockedRestaurant(null);
    setMatchNotif(null);
    setCurrentIndex(0);
    setDeck([]);
    setShowMatchPrompt(false);
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
        setScreen('groupLink');
      }
    } else {
      initDeck(filtered);
      setScreen('swiping');
    }
  };

  const handleGroupContinue = () => {
    if (session.deck) {
      setDeck(session.deck);
      setCurrentIndex(0);
      setCardKey(k => k + 1);
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

  const handleLockIn = (restaurant) => {
    engineRef.current.recordOrder(restaurant);
    setLockedRestaurant(restaurant);
    setChoosingForMe(false);
    setScreen('lockin');
    haptics.lockIn();
  };

  const handleChooseForMe = () => {
    setChoosingForMe(true);
  };

  const handleChosenForMe = (restaurant) => {
    handleLockIn(restaurant);
  };

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

  const currentCard = deck[currentIndex];
  const nextCard = deck[currentIndex + 1];
  const cardsRemaining = deck.length - currentIndex;

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

  const handleLocationChange = useCallback((newCoords) => {
    if (newCoords) {
      setCoords(newCoords);
    } else {
      // Revert to geolocation
      if (geolocateCoordsRef.current) {
        setCoords(geolocateCoordsRef.current);
      } else {
        // Re-trigger geolocation
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
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid var(--bg-surface)',
          borderTopColor: 'var(--accent-primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700 }}>
          Joining group...
        </p>
      </div>
    );
  }

  if (screen === 'session') {
    return <SessionScreen onStart={handleStart} loading={restaurantsLoading} coords={coords} onLocationChange={handleLocationChange} />;
  }

  if (screen === 'groupLink') {
    return (
      <GroupLinkScreen
        sessionId={session.sessionId}
        memberCount={realtime.memberCount || 1}
        onContinue={handleGroupContinue}
        onBack={goHome}
      />
    );
  }

  if (screen === 'review') {
    return (
      <>
        <ReviewMatchesScreen
          matches={matches}
          mode={mode}
          onSelect={handleLockIn}
          onChooseForMe={handleChooseForMe}
          onBack={() => setScreen('swiping')}
        />
        {choosingForMe && (
          <ChooseForMeAnimation
            matches={matches}
            onChosen={handleChosenForMe}
          />
        )}
      </>
    );
  }

  if (screen === 'lockin') {
    return <LockInScreen restaurant={lockedRestaurant} mode={mode} onBack={() => setScreen(matches.length > 0 ? 'review' : 'swiping')} />;
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
            onClick={() => { haptics.navTransition(); goHome(); }}
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
          }}>SwipeEats</span>
          {mode === 'group' && (
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: 700,
              background: 'var(--accent-primary)', color: 'white',
              padding: '2px 8px', borderRadius: '6px', verticalAlign: 'middle',
            }}>GROUP</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {mode !== 'group' && (
            <button
              onClick={() => { haptics.filterTap(); setShowSwipeFilters(true); }}
              style={{
                width: '32px', height: '32px', borderRadius: '10px',
                border: 'none', background: 'var(--bg-surface)',
                color: (activeFilters.maxDistance < 20 || activeFilters.selectedPrices.length > 0 || activeFilters.openNow)
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
            {mode !== 'duo' && (
              <button
                onClick={() => { initDeck(); }}
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
            background: 'var(--bg-card)', borderRadius: '20px',
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
