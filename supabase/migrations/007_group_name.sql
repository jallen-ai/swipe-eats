-- Add group_name column for named group sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_name TEXT;
