import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CACHE_DAYS = 30;

// Supabase client with service role (can write to restaurants table)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Tiered grid configuration based on user's distance filter
const TIERS = {
  near: { cellSize: 0.01, searchRadius: 800,  gridSpan: 3 },  // ~2mi coverage
  mid:  { cellSize: 0.04, searchRadius: 3000, gridSpan: 5 },  // ~8.5mi coverage
  far:  { cellSize: 0.10, searchRadius: 8000, gridSpan: 7 },  // ~24mi coverage
};

type Tier = typeof TIERS[keyof typeof TIERS];

function getTier(radiusMi: number): Tier {
  if (radiusMi <= 3) return TIERS.near;
  if (radiusMi <= 8) return TIERS.mid;
  return TIERS.far;
}

// Compute grid cell string with tier-aware snapping
function toGridCell(lat: number, lng: number, cellSize: number): string {
  const snappedLat = Math.round(lat / cellSize) * cellSize;
  const snappedLng = Math.round(lng / cellSize) * cellSize;
  const precision = cellSize < 0.02 ? 2 : cellSize < 0.1 ? 2 : 1;
  // Prefix with cell size to avoid cache collisions between tiers
  return `${cellSize}:${snappedLat.toFixed(precision)}_${snappedLng.toFixed(precision)}`;
}

// Build grid of cells around user's location based on tier
function getNearbyCells(lat: number, lng: number, tier: Tier): string[] {
  const { cellSize, gridSpan } = tier;
  const cLat = Math.round(lat / cellSize) * cellSize;
  const cLng = Math.round(lng / cellSize) * cellSize;
  const half = Math.floor(gridSpan / 2);
  const cells: string[] = [];
  const precision = cellSize < 0.02 ? 2 : cellSize < 0.1 ? 2 : 1;
  for (let dLat = -half; dLat <= half; dLat++) {
    for (let dLng = -half; dLng <= half; dLng++) {
      const gLat = cLat + dLat * cellSize;
      const gLng = cLng + dLng * cellSize;
      cells.push(`${cellSize}:${gLat.toFixed(precision)}_${gLng.toFixed(precision)}`);
    }
  }
  return cells;
}

// Map Google place type to a cuisine name
function deriveCuisine(place: any): string {
  const typeDisplay = place.primaryTypeDisplayName?.text;
  if (typeDisplay) {
    // Clean up Google's display names
    const cleaned = typeDisplay.replace(/ restaurant$/i, "").replace(/ place$/i, "");
    if (cleaned && cleaned.toLowerCase() !== "restaurant") return cleaned;
  }

  // Fall back to types array
  const cuisineTypes: Record<string, string> = {
    japanese_restaurant: "Japanese",
    sushi_restaurant: "Japanese",
    ramen_restaurant: "Japanese",
    chinese_restaurant: "Chinese",
    thai_restaurant: "Thai",
    vietnamese_restaurant: "Vietnamese",
    korean_restaurant: "Korean",
    indian_restaurant: "Indian",
    mexican_restaurant: "Mexican",
    italian_restaurant: "Italian",
    greek_restaurant: "Greek",
    mediterranean_restaurant: "Mediterranean",
    american_restaurant: "American",
    hamburger_restaurant: "American",
    pizza_restaurant: "Pizza",
    seafood_restaurant: "Seafood",
    steak_house: "Steakhouse",
    barbecue_restaurant: "BBQ",
    breakfast_restaurant: "Breakfast",
    brunch_restaurant: "Brunch",
    sandwich_shop: "Sandwiches",
    ice_cream_shop: "Dessert",
    bakery: "Bakery",
    cafe: "Cafe",
    coffee_shop: "Coffee",
  };

  const types = place.types || [];
  for (const t of types) {
    if (cuisineTypes[t]) return cuisineTypes[t];
  }

  return "Restaurant";
}

// Map cuisine to cuisine group
function getCuisineGroup(cuisine: string): string {
  const groups: Record<string, string[]> = {
    Asian: ["Japanese", "Thai", "Vietnamese", "Korean", "Chinese"],
    "South Asian": ["Indian"],
    Latin: ["Mexican"],
    European: ["Italian", "Greek", "Mediterranean", "French"],
    American: ["American", "BBQ", "Steakhouse", "Breakfast", "Brunch", "Sandwiches"],
    Island: ["Hawaiian"],
  };
  for (const [group, cuisines] of Object.entries(groups)) {
    if (cuisines.includes(cuisine)) return group;
  }
  return "Other";
}

// Fetch restaurants from Google Places API for a single grid cell
async function fetchFromGoogle(cellLat: number, cellLng: number, searchRadius: number): Promise<any[]> {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes: ["restaurant"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: cellLat, longitude: cellLng },
        radius: searchRadius,
      },
    },
  };
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.types",
    "places.priceLevel",
    "places.rating",
    "places.userRatingCount",
    "places.location",
    "places.formattedAddress",
    "places.photos",
    "places.regularOpeningHours",
    "places.delivery",
    "places.dineIn",
    "places.takeout",
    "places.reservable",
    "places.editorialSummary",
    "places.nationalPhoneNumber",
  ].join(",");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Google Places API error:", resp.status, err);
    return [];
  }

  const data = await resp.json();
  return data.places || [];
}

// Download a photo from Google Places and upload to Supabase Storage
async function cachePhoto(
  placeId: string,
  photoRef: string,
  gridCell: string
): Promise<{ path: string; attributions: any[] } | null> {
  try {
    // Google Places photo URL
    const photoUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=800&maxWidthPx=600&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(photoUrl);
    if (!resp.ok) return null;

    const blob = await resp.blob();
    const path = `${gridCell}/${placeId}.jpg`;

    const { error } = await supabase.storage
      .from("restaurant-photos")
      .upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Photo upload error:", error.message);
      return null;
    }

    return { path, attributions: [] };
  } catch (e) {
    console.error("Photo fetch error:", e);
    return null;
  }
}

// Map a Google Place to our restaurant row
async function mapPlace(place: any, gridCell: string) {
  const placeId = place.id;
  const cuisine = deriveCuisine(place);

  // Price level mapping
  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  const priceLevel = place.priceLevel ? (priceLevelMap[place.priceLevel] ?? null) : null;

  // Photo handling
  let photoPath: string | null = null;
  let photoRef: string | null = null;
  let photoAttributions: any[] = [];

  if (place.photos && place.photos.length > 0) {
    const firstPhoto = place.photos[0];
    photoRef = firstPhoto.name;
    photoAttributions = firstPhoto.authorAttributions || [];

    const cached = await cachePhoto(placeId, photoRef, gridCell);
    if (cached) {
      photoPath = cached.path;
    }
  }

  return {
    place_id: placeId,
    name: place.displayName?.text || "Unknown",
    cuisine,
    cuisine_group: getCuisineGroup(cuisine),
    price_level: priceLevel,
    rating: place.rating ?? null,
    rating_count: place.userRatingCount ?? null,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress ?? null,
    photo_path: photoPath,
    photo_ref: photoRef,
    photo_attributions: photoAttributions,
    hours: place.regularOpeningHours ?? null,
    editorial_summary: place.editorialSummary?.text ?? null,
    phone: place.nationalPhoneNumber ?? null,
    delivery: place.delivery ?? null,
    dine_in: place.dineIn ?? null,
    takeout: place.takeout ?? null,
    reservable: place.reservable ?? null,
    types: place.types ?? [],
    grid_cell: gridCell,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusMi = 5 } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat and lng are required numbers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tier = getTier(radiusMi);
    const cells = getNearbyCells(lat, lng, tier);
    const now = new Date();

    // Check which cells are cached
    const { data: cachedCells } = await supabase
      .from("grid_cache")
      .select("grid_cell, expires_at")
      .in("grid_cell", cells);

    const cachedSet = new Set<string>();
    for (const c of cachedCells || []) {
      if (new Date(c.expires_at) > now) {
        cachedSet.add(c.grid_cell);
      }
    }

    const staleCells = cells.filter((c) => !cachedSet.has(c));

    // Filter out non-restaurant places (hotels, lodging, etc.)
    const excludeTypes = new Set([
      "hotel", "lodging", "motel", "resort_hotel", "extended_stay_hotel",
      "convenience_store", "gas_station", "grocery_store", "supermarket",
      "liquor_store", "drugstore", "pharmacy",
    ]);

    // Process a single stale cell: fetch from Google, filter, cache photo, upsert
    async function processCell(cell: string) {
      // Strip the tier prefix to get lat/lng
      const coordPart = cell.split(":")[1]; // e.g. "42.05_-87.94"
      const [cellLatStr, cellLngStr] = coordPart.split("_");
      const cellLat = parseFloat(cellLatStr);
      const cellLng = parseFloat(cellLngStr);

      const places = await fetchFromGoogle(cellLat, cellLng, tier.searchRadius);
      const filteredPlaces = places.filter((p: any) => {
        const primary = p.primaryType || "";
        if (excludeTypes.has(primary)) return false;
        const types = p.types || [];
        if (types.includes("lodging") && !types.includes("restaurant")) return false;
        return true;
      });

      if (filteredPlaces.length > 0) {
        const restaurants = await Promise.all(
          filteredPlaces.map((p: any) => mapPlace(p, cell))
        );

        const { error: upsertError } = await supabase
          .from("restaurants")
          .upsert(restaurants, { onConflict: "place_id" });

        if (upsertError) {
          console.error("Upsert error:", upsertError.message);
        }
      }

      // Update grid_cache
      const expiresAt = new Date(now.getTime() + CACHE_DAYS * 24 * 60 * 60 * 1000);
      await supabase.from("grid_cache").upsert({
        grid_cell: cell,
        fetched_at: now.toISOString(),
        restaurant_count: places.length,
        expires_at: expiresAt.toISOString(),
      });
    }

    // Process stale cells in parallel batches of 10
    for (let i = 0; i < staleCells.length; i += 10) {
      const batch = staleCells.slice(i, i + 10);
      await Promise.all(batch.map(processCell));
    }

    // Query restaurants by bounding box (works across all tiers)
    const latDelta = (tier.gridSpan * tier.cellSize) / 2 + 0.01;
    const lngDelta = (tier.gridSpan * tier.cellSize) / 2 + 0.01;
    const { data: restaurants, error: fetchError } = await supabase
      .from("restaurants")
      .select("*")
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build public photo URLs
    const storageBase = `${SUPABASE_URL}/storage/v1/object/public/restaurant-photos`;
    const mapped = (restaurants || []).map((r: any) => ({
      ...r,
      photo_url: r.photo_path ? `${storageBase}/${r.photo_path}` : null,
    }));

    return new Response(
      JSON.stringify({
        restaurants: mapped,
        fromCache: staleCells.length === 0,
        cellsFetched: staleCells.length,
        totalCells: cells.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
