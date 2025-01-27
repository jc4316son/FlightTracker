/*
  # Add lock cleanup functionality

  1. Functions
    - Added cleanup_old_locks function to remove stale locks
    - Added trigger for automatic cleanup

  2. Indexes
    - Added performance index for locked_at timestamp
*/

-- Create a function to clean up old locks
CREATE OR REPLACE FUNCTION cleanup_old_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM flight_locks
  WHERE locked_at < now() - interval '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled trigger to clean up old locks
CREATE OR REPLACE FUNCTION trigger_cleanup_old_locks()
RETURNS trigger AS $$
BEGIN
  PERFORM cleanup_old_locks();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS cleanup_locks_trigger ON flight_locks;
CREATE TRIGGER cleanup_locks_trigger
  AFTER INSERT OR UPDATE ON flight_locks
  EXECUTE FUNCTION trigger_cleanup_old_locks();

-- Add index for lock cleanup performance
CREATE INDEX IF NOT EXISTS idx_flight_locks_locked_at ON flight_locks(locked_at);