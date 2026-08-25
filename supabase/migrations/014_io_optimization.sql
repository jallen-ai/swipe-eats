-- Refresh query-planner statistics so the (lat, lng) index is used
-- correctly for bounding-box queries regardless of table size.
ANALYZE restaurants;
ANALYZE grid_cache;

-- The B-tree (lat, lng) index exists but only helps on the lat dimension
-- for a 2D range query. A GiST index on a point() covers both dimensions
-- simultaneously and is far more selective, cutting disk reads significantly.
CREATE INDEX IF NOT EXISTS idx_restaurants_point
  ON restaurants USING gist (point(lng::float8, lat::float8));

-- Drop the old composite B-tree if the new GiST is present (redundant for bbox queries).
-- Leave in place if it was somehow missed during initial setup.
DROP INDEX IF EXISTS idx_restaurants_location;
