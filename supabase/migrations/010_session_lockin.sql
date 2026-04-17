-- 010: Session lock-in persistence
-- Lets group sessions record a chosen restaurant so late joiners and
-- reconnecting members land on the Lock-In screen instead of the deck.
--
-- session_members already exists (see add_session_members.sql / setup.sql)
-- and N-player matching is supported via swipes + the hook, so this
-- migration focuses on the lock-in piece.

-- 1. Add lock-in columns (nullable; only set once creator confirms)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS locked_restaurant_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS locked_at            TIMESTAMPTZ;

-- 2. Extend status enum to include 'locked'
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('waiting', 'active', 'locked', 'complete', 'expired'));

-- 3. Enforce creator-only lock-in.
-- RLS is row-level, not column-level. Existing UPDATE policy lets any
-- member update sessions (needed for waiting→active transitions), so we
-- use a BEFORE UPDATE trigger to veto lock-in changes from non-creators.
CREATE OR REPLACE FUNCTION enforce_creator_only_lockin()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.locked_restaurant_id IS DISTINCT FROM OLD.locked_restaurant_id
    OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
    OR (NEW.status = 'locked' AND OLD.status IS DISTINCT FROM 'locked')
  ) AND auth.uid() IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'Only the session creator can lock in a restaurant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_creator_only_lockin_trigger ON sessions;
CREATE TRIGGER enforce_creator_only_lockin_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_creator_only_lockin();

-- 4. Enable realtime on sessions so all members receive lock-in events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
END $$;
