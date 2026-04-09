import { useState, useCallback } from 'react';
import { supabase, getUserId } from '../utils/supabase';
import { PreferenceEngine } from '../utils/PreferenceEngine';
import { fetchRestaurantsByIds } from './useRestaurants';
import { getCuisineColor, formatPriceLevel, getCuisineGroup, calcDistanceMi, formatDistance } from '../utils/cuisine';

function generateSessionId() {
  return Math.random().toString(36).substring(2, 8);
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Map a DB restaurant row to app shape (for duo partner lookups)
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

  const createSession = useCallback(async (restaurants) => {
    const userId = await getUserId();
    if (!userId) {
      setSessionError('Not authenticated');
      return null;
    }

    // Compute deck order from provided restaurants
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

    setSessionId(id);
    setSessionStatus('waiting');
    setDeckIds(orderedIds);
    setIsCreator(true);
    // Store the ordered deck directly (creator already has the restaurant data)
    setDeck(sorted);
    return id;
  }, []);

  // Returns { success, deck } so the caller can set deck synchronously
  const joinSession = useCallback(async (id, userCoords) => {
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

    if (session.creator_id === userId) {
      setSessionId(id);
      setDeckIds(session.deck_ids);
      setIsCreator(true);
      setSessionStatus(session.status);
      const builtDeck = await buildDeckFromIds(session.deck_ids, userLat, userLng);
      return { success: true, deck: builtDeck, status: session.status };
    }

    if (session.partner_id && session.partner_id !== userId) {
      setSessionStatus('full');
      setSessionError('Session is full');
      return { success: false };
    }

    if (session.partner_id === userId) {
      setSessionId(id);
      setDeckIds(session.deck_ids);
      setIsCreator(false);
      setSessionStatus(session.status);
      const builtDeck = await buildDeckFromIds(session.deck_ids, userLat, userLng);
      return { success: true, deck: builtDeck, status: session.status };
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ partner_id: userId })
      .eq('id', id)
      .eq('status', 'waiting')
      .is('partner_id', null);

    if (updateError) {
      setSessionError('Could not join session');
      setSessionStatus('error');
      return { success: false };
    }

    setSessionId(id);
    setDeckIds(session.deck_ids);
    setIsCreator(false);
    setSessionStatus('waiting');
    const builtDeck = await buildDeckFromIds(session.deck_ids, userLat, userLng);
    return { success: true, deck: builtDeck, status: 'waiting' };
  }, []);

  // Fetch restaurant data from DB and order by deck_ids
  const buildDeckFromIds = async (ids, userLat, userLng) => {
    if (!ids || ids.length === 0) {
      setDeck([]);
      return [];
    }

    const rows = await fetchRestaurantsByIds(ids);
    const mapped = rows.map(r => mapDbRestaurant(r, userLat, userLng));
    // Preserve the deck order from deck_ids
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

  return {
    sessionId,
    sessionStatus,
    sessionError,
    deck,
    deckIds,
    isCreator,
    createSession,
    joinSession,
    activateSession,
    startSession,
  };
}
