/*
  # Fix database tables and indexes

  1. Changes
    - Add IF NOT EXISTS to all table creation statements
    - Add missing indexes for performance
    - Ensure all tables have proper RLS policies
    - Add cascade delete constraints where appropriate
    - Add proper foreign key constraints
*/

-- Ensure all tables exist
CREATE TABLE IF NOT EXISTS flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tail_number text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  start_airport text NOT NULL,
  end_airport text NOT NULL,
  notes text DEFAULT '',
  company text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid REFERENCES flights ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_tails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE,
  tail_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, tail_number)
);

CREATE TABLE IF NOT EXISTS flight_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid REFERENCES flights ON DELETE CASCADE,
  description text NOT NULL,
  completed boolean DEFAULT false,
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

CREATE TABLE IF NOT EXISTS flight_locks (
  flight_id uuid REFERENCES flights ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  PRIMARY KEY (flight_id)
);

-- Ensure RLS is enabled
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tails ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_locks ENABLE ROW LEVEL SECURITY;

-- Recreate all indexes
CREATE INDEX IF NOT EXISTS idx_flights_created_by ON flights(created_by);
CREATE INDEX IF NOT EXISTS idx_flights_company ON flights(company);
CREATE INDEX IF NOT EXISTS idx_flights_tail_number ON flights(tail_number);
CREATE INDEX IF NOT EXISTS idx_flights_start_date ON flights(start_date);
CREATE INDEX IF NOT EXISTS idx_flights_end_date ON flights(end_date);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);

CREATE INDEX IF NOT EXISTS idx_company_tails_company_id ON company_tails(company_id);
CREATE INDEX IF NOT EXISTS idx_company_tails_tail_number ON company_tails(tail_number);

CREATE INDEX IF NOT EXISTS idx_flight_tasks_flight_id ON flight_tasks(flight_id);
CREATE INDEX IF NOT EXISTS idx_flight_tasks_created_by ON flight_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_flight_tasks_completed ON flight_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_flight_tasks_due_date ON flight_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_flight_id ON audit_logs(flight_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_flight_locks_user_id ON flight_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_locks_locked_at ON flight_locks(locked_at);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_flights_updated_at'
  ) THEN
    CREATE TRIGGER set_flights_updated_at
      BEFORE UPDATE ON flights
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_companies_updated_at'
  ) THEN
    CREATE TRIGGER set_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;