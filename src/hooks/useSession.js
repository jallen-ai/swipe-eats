import { useState, useCallback } from 'react';
import { supabase, getUserId } from '../utils/supabase';
import { PreferenceEngine } from '../utils/PreferenceEngine';
import { fetchRestaurantsByIds } from './useRestaurants';
import { FALLBACK_RESTAURANTS } from '../data/restaurants';
import { getCuisineColor, formatPriceLevel, getCuisineGroup, calcDistanceMi, formatDistance } from '../utils/cuisine';

function generateSessionId() {
  return Math.random().toString(36).substring(2, 8);
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Map a DB restaurant row to app shape
function mapDbRestaurant(row, userLat, userLng) {
  const distance = (userLat != null && userLng != null)
    ? calcDistanceMi(userLat, userLng, parseFloat(row.lat), parseFloat(row.lng))
    : null;

  return {
    id: row.place_id,
    name: row.name,
    cuisine: row.cuisine || 'Restaurant',
    cuisineGroup: row.cuisine_group || getCuisineGroup(row.cuisine || 'Restaurant'),
    price: formatPriceLevel(row.price_level),
    distance: distance != null ? formatDistance(distance) : '',
    distanceMi: distance,
    rating: row.rating ? parseFloat(row.rating) : null,
    ratingCount: row.rating_count,
    photo: row.photo_path
      ? `${SUPABASE_URL}/storage/v1/object/public/restaurant-photos/${row.photo_path}`
      : null,
    photoAttribution: row.photo_attributions?.[0]?.displayName || null,
    color: getCuisineColor(row.cuisine || 'Restaurant'),
    address: row.address,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    hours: row.hours,
  };
}

export function useSession() {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [deckIds, setDeckIds] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [deck, setDeck] = useState(null);
  const [creatorId, setCreatorId] = useState(null);
  const [groupName, setGroupName] = useState(null);

  const createSession = useCallback(async (restaurants, nickname, groupNameParam) => {
    const userId = await getUserId();
    if (!userId) {
      setSessionError('Not authenticated');
      return null;
    }

    const engine = new PreferenceEngine();
    const sorted = engine.sortRestaurants(restaurants);
    const orderedIds = sorted.map(r => r.id);

    const id = generateSessionId();

    const { error } = await supabase.from('sessions').insert({
      id,
      creator_id: userId,
      deck_ids: orderedIds,
      status: 'waiting',
      group_name: groupNameParam || null,
    });

    if (error) {
      setSessionError(error.message);
      return null;
    }

    // Register creator as a session member
    await supabase.from('session_members').insert({
      session_id: id,
      user_id: userId,
      nickname: nickname || null,
    });

    setSessionId(id);
    setSessionStatus('waiting');
    setDeckIds(orderedIds);
    setIsCreator(true);
    setCreatorId(userId);
    setGroupName(groupNameParam || null);
    setDeck(sorted);
    return id;
  }, []);

  const joinSession = useCallback(async (id, userCoords, nickname) => {
    try {
      const userLat = userCoords?.lat ?? null;
      const userLng = userCoords?.lng ?? null;
      const userId = await getUserId();
      if (!userId) {
        const err = 'Not authenticated — please try again';
        setSessionError(err);
        return { success: false, error: err };
      }

      const { data: sess, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !sess) {
        const err = fetchError?.message || 'Session not found — the link may be invalid';
        setSessionError(err);
        setSessionStatus('error');
        return { success: false, error: err };
      }

      if (new Date(sess.expires_at) < new Date()) {
        const err = 'This session has expired';
        setSessionStatus('expired');
        setSessionError(err);
        return { success: false, error: err };
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('session_members')
        .select('user_id')
        .eq('session_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      const isReturning = !!existingMember;
      const amCreator = sess.creator_id === userId;

      if (!isReturning) {
        const { error: insertErr } = await supabase.from('session_members').insert({
          session_id: id,
          user_id: userId,
          nickname: nickname || null,
        });
        if (insertErr) {
          console.error('session_members insert failed:', insertErr);
        }

        // Activate session when first non-creator joins
        if (sess.status === 'waiting' && !amCreator) {
          await supabase.from('sessions')
            .update({ status: 'active' })
            .eq('id', id)
            .eq('status', 'waiting');
        }
      }

      const currentStatus = (!isReturning && sess.status === 'waiting' && !amCreator)
        ? 'active' : sess.status;

      setSessionId(id);
      setDeckIds(sess.deck_ids);
      setIsCreator(amCreator);
      setCreatorId(sess.creator_id);
      setGroupName(sess.group_name || null);
      setSessionStatus(currentStatus);

      const builtDeck = await buildDeckFromIds(sess.deck_ids, userLat, userLng);

      if (!builtDeck || builtDeck.length === 0) {
        const err = 'Could not load restaurants for this session';
        setSessionError(err);
        return { success: false, error: err };
      }

      // Fetch existing swipes for this user (for resume)
      const { data: mySwipes } = await supabase
        .from('swipes')
        .select('restaurant_id, direction')
        .eq('session_id', id)
        .eq('user_id', userId);

      const swipedIds = new Set((mySwipes || []).map(s => s.restaurant_id));
      const myRightSwipes = new Set((mySwipes || []).filter(s => s.direction === 'right').map(s => s.restaurant_id));

      // Fetch all right swipes from others (for rebuilding matches)
      const { data: otherSwipes } = await supabase
        .from('swipes')
        .select('restaurant_id, user_id, direction')
        .eq('session_id', id)
        .neq('user_id', userId)
        .eq('direction', 'right');

      const otherRightIds = new Set((otherSwipes || []).map(s => s.restaurant_id));
      const matchIds = new Set([...myRightSwipes].filter(rid => otherRightIds.has(rid)));

      return {
        success: true,
        deck: builtDeck,
        status: currentStatus,
        swipedIds,
        matchIds,
        isReturning,
      };
    } catch (e) {
      console.error('joinSession error:', e);
      const err = e.message || 'Something went wrong joining the session';
      setSessionError(err);
      return { success: false, error: err };
    }
  }, []);

  const buildDeckFromIds = async (ids, userLat, userLng) => {
    if (!ids || ids.length === 0) {
      setDeck([]);
      return [];
    }

    // Try DB first
    const rows = await fetchRestaurantsByIds(ids);
    let mapped;

    if (rows.length > 0) {
      mapped = rows.map(r => mapDbRestaurant(r, userLat, userLng));
    } else {
      // Fallback: IDs might be from hardcoded fallback restaurants (not in DB)
      const fallbackById = Object.fromEntries(FALLBACK_RESTAURANTS.map(r => [r.id, r]));
      mapped = ids.map(id => fallbackById[id]).filter(Boolean).map(r => {
        if (userLat != null && userLng != null && r.lat && r.lng) {
          const dist = calcDistanceMi(userLat, userLng, r.lat, r.lng);
          return { ...r, distance: formatDistance(dist), distanceMi: dist };
        }
        return { ...r, distance: r.distance || '—' };
      });
    }

    const byId = Object.fromEntries(mapped.map(r => [r.id, r]));
    const ordered = ids.map(id => byId[id]).filter(Boolean);
    setDeck(ordered);
    return ordered;
  };

  const activateSession = useCallback(() => {
    setSessionStatus('active');
  }, []);

  const startSession = useCallback(async () => {
    if (!sessionId) return;
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'active' })
      .eq('id', sessionId);
    if (error) {
      console.error('Failed to start session:', error.message);
      return;
    }
    setSessionStatus('active');
  }, [sessionId]);

  const updateNickname = useCallback(async (nickname) => {
    if (!sessionId) return;
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('session_members')
      .update({ nickname })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  }, [sessionId]);

  return {
    sessionId,
    sessionStatus,
    sessionError,
    deck,
    deckIds,
    isCreator,
    creatorId,
    groupName,
    createSession,
    joinSession,
    activateSession,
    startSession,
    updateNickname,
  };
}
