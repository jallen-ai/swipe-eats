import { useState, useCallback } from 'react';
import { supabase, getUserId } from '../utils/supabase';
import { PreferenceEngine } from '../utils/PreferenceEngine';
import { fetchRestaurantsByIds } from './useRestaurants';
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

  const createSession = useCallback(async (restaurants, nickname) => {
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
    setDeck(sorted);
    return id;
  }, []);

  const joinSession = useCallback(async (id, userCoords, nickname) => {
    const userLat = userCoords?.lat ?? null;
    const userLng = userCoords?.lng ?? null;
    const userId = await getUserId();
    if (!userId) {
      setSessionError('Not authenticated');
      return { success: false };
    }

    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !session) {
      setSessionError('Session not found');
      setSessionStatus('error');
      return { success: false };
    }

    if (new Date(session.expires_at) < new Date()) {
      setSessionStatus('expired');
      setSessionError('Session has expired');
      return { success: false };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('session_members')
      .select('user_id')
      .eq('session_id', id)
      .eq('user_id', userId)
      .single();

    const isReturning = !!existingMember;
    const amCreator = session.creator_id === userId;

    if (!isReturning) {
      // Register as a new member
      await supabase.from('session_members').insert({
        session_id: id,
        user_id: userId,
        nickname: nickname || null,
      });

      // Activate session when first non-creator joins
      if (session.status === 'waiting' && !amCreator) {
        await supabase.from('sessions')
          .update({ status: 'active' })
          .eq('id', id)
          .eq('status', 'waiting');
      }
    }

    const currentStatus = (!isReturning && session.status === 'waiting' && !amCreator)
      ? 'active' : session.status;

    setSessionId(id);
    setDeckIds(session.deck_ids);
    setIsCreator(amCreator);
    setCreatorId(session.creator_id);
    setSessionStatus(currentStatus);

    const builtDeck = await buildDeckFromIds(session.deck_ids, userLat, userLng);

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
    // Matches = restaurants I swiped right AND at least one other person swiped right
    const matchIds = new Set([...myRightSwipes].filter(rid => otherRightIds.has(rid)));

    return {
      success: true,
      deck: builtDeck,
      status: currentStatus,
      swipedIds,
      matchIds,
      isReturning,
    };
  }, []);

  const buildDeckFromIds = async (ids, userLat, userLng) => {
    if (!ids || ids.length === 0) {
      setDeck([]);
      return [];
    }

    const rows = await fetchRestaurantsByIds(ids);
    const mapped = rows.map(r => mapDbRestaurant(r, userLat, userLng));
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
    createSession,
    joinSession,
    activateSession,
    startSession,
    updateNickname,
  };
}
