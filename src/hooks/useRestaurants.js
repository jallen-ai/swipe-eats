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

  // Request geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('Geolocation denied:', err.message);
        // Don't silently fall back to a random location — let the UI handle it
        setError('location_denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Fetch restaurants when coords are available
  const fetchRestaurants = useCallback(async (lat, lng) => {
    setLoading(true);
    setError(null);

    try {
      const resp = await supabase.functions.invoke('fetch-restaurants', {
        body: { lat, lng, radiusMi },
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
      const mapped = data.restaurants
        .filter((r) => !excludeCuisines.has(r.cuisine))
        .map((r) => mapRestaurant(r, lat, lng))
        .filter((r) => r.photo) // Only show restaurants with photos
        .sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999));

      setRestaurants(mapped);
    } catch (e) {
      console.error('Fetch restaurants error:', e);
      setError(e.message);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [radiusMi]);

  // Fetch on first coords, and re-fetch only when radius expands beyond what we've already fetched
  useEffect(() => {
    if (coords && radiusMi > fetchedRadiusRef.current) {
      fetchRestaurants(coords.lat, coords.lng);
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
