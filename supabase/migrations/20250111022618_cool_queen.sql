/*
  # Flight Tracker Schema

  1. New Tables
    - `flights`
      - `id` (uuid, primary key)
      - `tail_number` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `start_airport` (text)
      - `end_airport` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
    
    - `audit_logs`
      - `id` (uuid, primary key)
      - `flight_id` (uuid, references flights)
      - `user_id` (uuid, references auth.users)
      - `action` (text)
      - `changes` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Flights table
CREATE TABLE flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tail_number text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  start_airport text NOT NULL,
  end_airport text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid REFERENCES flights NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for flights
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

-- Policies for audit logs
CREATE POLICY "Users can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);