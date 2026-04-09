-- Add session_members table
CREATE TABLE IF NOT EXISTS session_members (
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  nickname    TEXT,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_members_session ON session_members(session_id);

ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_members
DO $$ BEGIN
  CREATE POLICY "Anyone can view session members"
    ON session_members FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert themselves"
    ON session_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own row"
    ON session_members FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime on session_members
ALTER PUBLICATION supabase_realtime ADD TABLE session_members;

-- Update swipes RLS to use session_members instead of creator_id/partner_id
DROP POLICY IF EXISTS "Users can insert own swipes in active sessions" ON swipes;
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
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = swipes.session_id
      AND sm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read swipes in their sessions" ON swipes;
CREATE POLICY "Users can read swipes in their sessions"
  ON swipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = swipes.session_id
      AND sm.user_id = auth.uid()
    )
  );
