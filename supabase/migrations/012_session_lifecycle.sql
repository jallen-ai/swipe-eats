-- 012: Round out the session lifecycle
-- Adds the 'closed' terminal status (creator explicitly ends the session after
-- a lock-in) and extends the creator-only trigger to cover the two new
-- transitions: reopening swiping (clearing the lock) and closing the session.

-- 1. Extend status check to include 'closed'
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('waiting', 'active', 'locked', 'closed', 'complete', 'expired'));

-- 2. Update the trigger so only the creator can:
--    - set/clear locked_restaurant_id (already covered)
--    - transition status into 'closed'
--    - transition status back out of 'locked' (reopen)
CREATE OR REPLACE FUNCTION enforce_creator_only_lockin()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.locked_restaurant_id IS DISTINCT FROM OLD.locked_restaurant_id
    OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
    OR (NEW.status = 'locked' AND OLD.status IS DISTINCT FROM 'locked')
    OR (NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed')
    OR (OLD.status = 'locked' AND NEW.status IS DISTINCT FROM 'locked')
  ) AND auth.uid() IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'Only the session creator can change the lock / close state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
