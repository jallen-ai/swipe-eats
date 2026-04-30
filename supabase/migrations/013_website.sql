-- Add website column for restaurant homepage URL from Google Places
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS website TEXT;
