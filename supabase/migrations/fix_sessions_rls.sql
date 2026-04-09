-- Update sessions RLS to use session_members instead of partner_id

-- SELECT: creator, any session member, or waiting sessions (for new joiners to read before joining)
DROP POLICY IF EXISTS "Users can view their sessions or waiting sessions" ON sessions;
CREATE POLICY "Users can view their sessions or waiting sessions"
  ON sessions FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = sessions.id
      AND sm.user_id = auth.uid()
    )
    OR (status = 'waiting')
  );

-- UPDATE: creator can update anything, session members can update status to active
DROP POLICY IF EXISTS "Partner can join or creator can update" ON sessions;
CREATE POLICY "Session members can update"
  ON sessions FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = sessions.id
      AND sm.user_id = auth.uid()
    )
    OR (status = 'waiting')
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = sessions.id
      AND sm.user_id = auth.uid()
    )
  );
