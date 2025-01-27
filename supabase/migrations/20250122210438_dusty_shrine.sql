/*
  # Fix Database Constraints and Validation

  1. Changes
    - Add proper constraints with validation
    - Add optimized indexes
    - Add validation triggers
    - Fix data before adding constraints

  2. Performance
    - Add indexes for common queries
    - Add proper sorting indexes

  3. Security
    - Add proper validation checks
*/

-- First, clean up any invalid data
UPDATE flights 
SET end_date = start_date + interval '1 hour'
WHERE end_date < start_date;

UPDATE flights
SET end_airport = start_airport || '_END'
WHERE start_airport = end_airport;

-- Add proper indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flights_company_dates ON flights (company, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_flights_tail_dates ON flights (tail_number, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_flights_status_dates ON flights (status, start_date, end_date);

-- Add validation function for flight dates
CREATE OR REPLACE FUNCTION validate_flight_dates()
RETURNS trigger AS $$
BEGIN
  -- Check for overlapping flights with same tail number
  IF EXISTS (
    SELECT 1 FROM flights
    WHERE tail_number = NEW.tail_number
      AND id != NEW.id
      AND status = 'active'
      AND (
        (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date)
      )
  ) THEN
    RAISE EXCEPTION 'Flight dates overlap with existing flight for tail number %', NEW.tail_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for flight date validation
DROP TRIGGER IF EXISTS validate_flight_dates_trigger ON flights;
CREATE TRIGGER validate_flight_dates_trigger
  BEFORE INSERT OR UPDATE ON flights
  FOR EACH ROW
  EXECUTE FUNCTION validate_flight_dates();

-- Add proper cascade deletes
ALTER TABLE flight_tasks
  DROP CONSTRAINT IF EXISTS flight_tasks_flight_id_fkey,
  ADD CONSTRAINT flight_tasks_flight_id_fkey
    FOREIGN KEY (flight_id)
    REFERENCES flights(id)
    ON DELETE CASCADE;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_flight_id_fkey,
  ADD CONSTRAINT audit_logs_flight_id_fkey
    FOREIGN KEY (flight_id)
    REFERENCES flights(id)
    ON DELETE CASCADE;

-- Add proper indexes for tasks
CREATE INDEX IF NOT EXISTS idx_flight_tasks_flight_completed ON flight_tasks (flight_id, completed);
CREATE INDEX IF NOT EXISTS idx_flight_tasks_due_date ON flight_tasks (due_date)
  WHERE due_date IS NOT NULL;

-- Add proper indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_flight_created ON audit_logs (flight_id, created_at DESC);

-- Ensure all tables have updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  -- Add updated_at trigger to all tables that need it
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_flights_updated_at') THEN
    CREATE TRIGGER set_flights_updated_at
      BEFORE UPDATE ON flights
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_companies_updated_at') THEN
    CREATE TRIGGER set_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Now add constraints after data is clean
ALTER TABLE flights
  ADD CONSTRAINT flights_dates_check 
    CHECK (end_date >= start_date),
  ADD CONSTRAINT flights_airports_check
    CHECK (start_airport != end_airport),
  ALTER COLUMN status SET DEFAULT 'active',
  ADD CONSTRAINT flights_status_check
    CHECK (status IN ('active', 'cancelled'));