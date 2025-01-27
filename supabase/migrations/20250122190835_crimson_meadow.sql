/*
  # Add due dates to flight tasks

  1. Changes
    - Add `due_date` column to `flight_tasks` table
*/

ALTER TABLE flight_tasks ADD COLUMN due_date timestamptz;