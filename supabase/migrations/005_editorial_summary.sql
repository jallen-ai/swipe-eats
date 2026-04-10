-- Add editorial_summary column for Google Places editorial blurbs
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS editorial_summary TEXT;
