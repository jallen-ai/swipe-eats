-- Phase C: Real restaurant data tables

-- Change swipes.restaurant_id from INTEGER to TEXT (for Google Place IDs)
ALTER TABLE swipes ALTER COLUMN restaurant_id TYPE TEXT;
-- restaurants table: cached Google Places data (30-day TTL per ToS)
CREATE TABLE restaurants (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT,
  cuisine_group TEXT,
  price_level INT,
  rating NUMERIC(2,1),
  rating_count INT,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  address TEXT,
  photo_path TEXT,
  photo_ref TEXT,
  photo_attributions JSONB,
  hours JSONB,
  types TEXT[],
  grid_cell TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_restaurants_grid ON restaurants (grid_cell);
CREATE INDEX idx_restaurants_location ON restaurants (lat, lng);

-- grid_cache: tracks freshness per grid cell
CREATE TABLE grid_cache (
  grid_cell TEXT PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restaurant_count INT,
  expires_at TIMESTAMPTZ NOT NULL
);

-- RLS: public read, only service_role can write
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read restaurants" ON restaurants FOR SELECT USING (true);

ALTER TABLE grid_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grid_cache" ON grid_cache FOR SELECT USING (true);

-- Storage bucket for restaurant photos (run via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-photos', 'restaurant-photos', true);
