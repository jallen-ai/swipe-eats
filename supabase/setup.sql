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

-- Swipes: INSERT (must be a session member and session must be active)
CREATE POLICY "Users can insert own swipes in active sessions"
  ON swipes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
      AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM session_members
      WHERE session_id = swipes.session_id
      AND user_id = auth.uid()
    )
  );

-- Swipes: SELECT (must be a session member)
CREATE POLICY "Users can read swipes in their sessions"
  ON swipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_members
      WHERE session_id = swipes.session_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- Session Members table (persistent group membership + nicknames)
-- ============================================================

CREATE TABLE session_members (
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  nickname    TEXT,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX idx_session_members_session ON session_members(session_id);

ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view members of sessions they know about"
  ON session_members FOR SELECT USING (true);

CREATE POLICY "Users can insert themselves"
  ON session_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own row"
  ON session_members FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Enable Realtime on swipes and session_members tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE swipes;
ALTER PUBLICATION supabase_realtime ADD TABLE session_members;
