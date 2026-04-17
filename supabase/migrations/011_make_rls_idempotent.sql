-- 011: Idempotent re-apply of RLS SELECT fixes.
-- 009 assumed a clean pre-state and CREATEs failed on re-run when the new
-- policy names already existed. This version drops BOTH old and new names
-- before recreating, so it's safe to run any number of times.

-- sessions SELECT — permissive (auth'd users can view)
DROP POLICY IF EXISTS "Users can view their sessions or waiting sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON sessions;
CREATE POLICY "Authenticated users can view sessions"
  ON sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- session_members SELECT — permissive (fixes the recursive self-ref from 008)
DROP POLICY IF EXISTS "Anyone can view session members" ON session_members;
DROP POLICY IF EXISTS "Anyone can view members of sessions they know about" ON session_members;
DROP POLICY IF EXISTS "Members can view their session members" ON session_members;
DROP POLICY IF EXISTS "Authenticated users can view session members" ON session_members;
CREATE POLICY "Authenticated users can view session members"
  ON session_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
