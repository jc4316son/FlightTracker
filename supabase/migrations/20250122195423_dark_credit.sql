-- Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_tails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flight_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flight_locks ENABLE ROW LEVEL SECURITY;

-- Recreate policies with proper permissions
DO $$ 
BEGIN
  -- Flights policies
  DROP POLICY IF EXISTS "Users can read all flights" ON flights;
  DROP POLICY IF EXISTS "Users can insert their own flights" ON flights;
  DROP POLICY IF EXISTS "Users can update any flight" ON flights;
  DROP POLICY IF EXISTS "Users can delete flights" ON flights;

  CREATE POLICY "Users can read all flights"
    ON flights FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can insert their own flights"
    ON flights FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

  CREATE POLICY "Users can update any flight"
    ON flights FOR UPDATE
    TO authenticated
    USING (true);

  CREATE POLICY "Users can delete flights"
    ON flights FOR DELETE
    TO authenticated
    USING (true);

  -- Companies policies
  DROP POLICY IF EXISTS "Users can read all companies" ON companies;
  DROP POLICY IF EXISTS "Users can insert companies" ON companies;
  DROP POLICY IF EXISTS "Users can update companies" ON companies;

  CREATE POLICY "Users can read all companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can insert companies"
    ON companies FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

  CREATE POLICY "Users can update companies"
    ON companies FOR UPDATE
    TO authenticated
    USING (true);

  -- Company tails policies
  DROP POLICY IF EXISTS "Users can read all company tails" ON company_tails;
  DROP POLICY IF EXISTS "Users can manage company tails" ON company_tails;

  CREATE POLICY "Users can read all company tails"
    ON company_tails FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can manage company tails"
    ON company_tails FOR ALL
    TO authenticated
    USING (true);

  -- Flight tasks policies
  DROP POLICY IF EXISTS "Users can read flight tasks" ON flight_tasks;
  DROP POLICY IF EXISTS "Users can insert flight tasks" ON flight_tasks;
  DROP POLICY IF EXISTS "Users can update flight tasks" ON flight_tasks;
  DROP POLICY IF EXISTS "Users can delete flight tasks" ON flight_tasks;

  CREATE POLICY "Users can read flight tasks"
    ON flight_tasks FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can insert flight tasks"
    ON flight_tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

  CREATE POLICY "Users can update flight tasks"
    ON flight_tasks FOR UPDATE
    TO authenticated
    USING (true);

  CREATE POLICY "Users can delete flight tasks"
    ON flight_tasks FOR DELETE
    TO authenticated
    USING (true);

  -- Audit logs policies
  DROP POLICY IF EXISTS "Users can read all audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;

  CREATE POLICY "Users can read all audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can insert audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Flight locks policies
  DROP POLICY IF EXISTS "Users can read all locks" ON flight_locks;
  DROP POLICY IF EXISTS "Users can manage their own locks" ON flight_locks;

  CREATE POLICY "Users can read all locks"
    ON flight_locks FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can manage their own locks"
    ON flight_locks FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Add missing indexes
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_flight_id ON audit_logs(flight_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_flight_locks_user_id ON flight_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_locks_locked_at ON flight_locks(locked_at);