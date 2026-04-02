-- ============================================================
-- SwipeEats: Duo Sessions Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Sessions table
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  creator_id  UUID NOT NULL,
  partner_id  UUID,
  status      TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'complete', 'expired')),
  deck_ids    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

CREATE INDEX idx_sessions_status ON sessions(status) WHERE status IN ('waiting', 'active');

-- Swipes table
CREATE TABLE swipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  user_id       UUID NOT NULL,
  restaurant_id INTEGER NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id, restaurant_id)
);

CREATE INDEX idx_swipes_session ON swipes(session_id);
CREATE INDEX idx_swipes_session_restaurant ON swipes(session_id, restaurant_id);

-- Matches view (derived from swipes)
CREATE VIEW session_matches AS
SELECT
  s1.session_id,
  s1.restaurant_id,
  GREATEST(s1.created_at, s2.created_at) AS matched_at
FROM swipes s1
JOIN swipes s2
  ON s1.session_id = s2.session_id
  AND s1.restaurant_id = s2.restaurant_id
  AND s1.user_id < s2.user_id
WHERE s1.direction = 'right'
  AND s2.direction = 'right';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- Sessions: SELECT
CREATE POLICY "Users can view their sessions or waiting sessions"
  ON sessions FOR SELECT
  USING (
    creator_id = auth.uid()
    OR partner_id = auth.uid()
    OR (status = 'waiting' AND partner_id IS NULL)
  );

-- Sessions: INSERT
CREATE POLICY "Authenticated users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Sessions: UPDATE (join or status change)
CREATE POLICY "Partner can join or creator can update"
  ON sessions FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR (status = 'waiting' AND partner_id IS NULL)
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR partner_id = auth.uid()
  );

-- Swipes: INSERT
CREATE POLICY "Users can insert own swipes in active sessions"
  ON swipes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

-- Swipes: SELECT
CREATE POLICY "Users can read swipes in their sessions"
  ON swipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid())
    )
  );

-- ============================================================
-- Enable Realtime on swipes table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE swipes;
