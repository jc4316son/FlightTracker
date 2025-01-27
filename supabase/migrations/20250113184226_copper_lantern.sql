/*
  # Add flight tasks

  1. New Tables
    - `flight_tasks`
      - `id` (uuid, primary key)
      - `flight_id` (uuid, references flights)
      - `description` (text)
      - `completed` (boolean)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `flight_tasks` table
    - Add policies for authenticated users to manage their tasks
*/

CREATE TABLE flight_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid REFERENCES flights ON DELETE CASCADE,
  description text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE flight_tasks ENABLE ROW LEVEL SECURITY;

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