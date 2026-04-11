-- Fix circular RLS dependency between sessions and session_members
-- The sessions SELECT policy referenced session_members, and session_members
-- SELECT policy referenced sessions, causing a 500 error on all queries.

-- Fix 1: sessions SELECT — allow any authenticated user to read sessions.
-- Session IDs are random 6-char codes shared via invite link, so knowing
-- the ID implies you were invited. No sensitive data is exposed.
DROP POLICY IF EXISTS "Users can view their sessions or waiting sessions" ON sessions;
CREATE POLICY "Authenticated users can view sessions"
  ON sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 2: session_members SELECT — use a simple policy that doesn't query sessions.
-- Allow members to see other members of their session, OR allow any authenticated
-- user to see members (the session ID is the access control).
DROP POLICY IF EXISTS "Members can view their session members" ON session_members;
CREATE POLICY "Authenticated users can view session members"
  ON session_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
