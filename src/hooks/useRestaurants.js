import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { getCuisineColor, getCuisineGroup, formatPriceLevel, calcDistanceMi, formatDistance } from '../utils/cuisine';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Map a DB restaurant row to the app's restaurant shape
function mapRestaurant(row, userLat, userLng) {
  const distance = (userLat != null && userLng != null)
    ? calcDistanceMi(userLat, userLng, row.lat, row.lng)
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
    photo: row.photo_url || row.photo_path
      ? `${SUPABASE_URL}/storage/v1/object/public/restaurant-photos/${row.photo_path}`
      : null,
    photoAttribution: row.photo_attributions?.[0]?.displayName || null,
    color: getCuisineColor(row.cuisine || 'Restaurant'),
    address: row.address,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    hours: row.hours,
    editorialSummary: row.editorial_summary || null,
    phone: row.phone || null,
    website: row.website || null,
    delivery: row.delivery,
    dineIn: row.dine_in,
    takeout: row.takeout,
    reservable: row.reservable,
  };
}

export function useRestaurants(radiusMi = 5) {
  const [restaurants, setRestaurants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState(null);
  const fetchedRadiusRef = useRef(0);
  const fetchedCoordsRef = useRef(null);

  // Request geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('location_denied');
      return;
    }

    let resolved = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolved = true;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        resolved = true;
        console.warn('Geolocation denied:', err.message);
        setError('location_denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );

    // Hard fallback: some browsers silently swallow the geolocation request
    // without calling either callback. After 12 s, surface the manual input.
    const fallback = setTimeout(() => {
      if (!resolved) setError('location_denied');
    }, 12000);

    return () => clearTimeout(fallback);
  }, []);

  // Fetch restaurants when coords are available
  const fetchRestaurants = useCallback(async (lat, lng) => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await supabase.functions.invoke('fetch-restaurants', {
        body: { lat, lng, radiusMi },
        signal: controller.signal,
      });

      if (resp.error) {
        throw new Error(resp.error.message || 'Failed to fetch restaurants');
      }

      const data = resp.data;
      if (!data?.restaurants?.length) {
        setRestaurants([]);
        setError('no_restaurants');
        return;
      }

      const excludeCuisines = new Set([
        'Convenience Store', 'Gas Station', 'Shopping Mall', 'Pharmacy', 'Drugstore',
      ]);
      const seenNames = new Set();
      const mapped = data.restaurants
        .filter((r) => !excludeCuisines.has(r.cuisine))
        .map((r) => mapRestaurant(r, lat, lng))
        .sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999))
        .filter((r) => {
          const key = r.name.trim().toLowerCase();
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });

      setRestaurants(mapped);
    } catch (e) {
      console.error('Fetch restaurants error:', e);
      setError(e.message);
      setRestaurants([]);
    } finally {
      clearTimeout(fetchTimeout);
      setLoading(false);
    }
  }, [radiusMi]);

  // Fetch when coords change (new location) or radius expands beyond what we've already fetched
  useEffect(() => {
    if (!coords) return;
    const coordsChanged = !fetchedCoordsRef.current ||
      fetchedCoordsRef.current.lat !== coords.lat ||
      fetchedCoordsRef.current.lng !== coords.lng;
    const radiusExpanded = radiusMi > fetchedRadiusRef.current;

    if (coordsChanged || radiusExpanded) {
      if (coordsChanged) {
        // Clear stale restaurants so the app shows loading state for the new location
        setRestaurants(null);
        fetchedRadiusRef.current = 0;
      }
      fetchRestaurants(coords.lat, coords.lng);
      fetchedCoordsRef.current = { lat: coords.lat, lng: coords.lng };
      fetchedRadiusRef.current = radiusMi;
    }
  }, [coords, radiusMi, fetchRestaurants]);

  return {
    restaurants,
    loading: loading || (!coords && error !== 'location_denied' && !error),
    error,
    coords,
    setCoords,
    refetch: () => coords && fetchRestaurants(coords.lat, coords.lng),
  };
}

// Fetch restaurants by Place IDs (for duo mode partner)
export async function fetchRestaurantsByIds(placeIds) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .in('place_id', placeIds);

  if (error || !data) return [];
  return data;
}
