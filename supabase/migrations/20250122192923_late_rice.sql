/*
  # Add flight locks table
  
  1. New Tables
    - `flight_locks`
      - `flight_id` (uuid, primary key, references flights)
      - `user_id` (uuid, references auth.users)
      - `user_email` (text)
      - `locked_at` (timestamptz)
  
  2. Security
    - Enable RLS on `flight_locks` table
    - Add policies for authenticated users to:
      - Read all locks
      - Manage their own locks
  
  3. Performance
    - Add index on user_id for faster lookups
*/

-- Create flight_locks table
CREATE TABLE flight_locks (
  flight_id uuid REFERENCES flights ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  PRIMARY KEY (flight_id)
);

-- Enable RLS
ALTER TABLE flight_locks ENABLE ROW LEVEL SECURITY;

-- Policies for flight_locks
CREATE POLICY "Users can read all locks"
  ON flight_locks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own locks"
  ON flight_locks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_flight_locks_user ON flight_locks(user_id);