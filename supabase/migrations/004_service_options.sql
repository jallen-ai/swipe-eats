-- Add service option columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery BOOLEAN;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS dine_in BOOLEAN;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS takeout BOOLEAN;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservable BOOLEAN;
