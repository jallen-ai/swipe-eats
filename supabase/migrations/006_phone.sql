-- Add phone column for restaurant phone numbers from Google Places
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
