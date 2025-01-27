/*
  # Add flight status and update UI

  1. Changes
    - Add status column to flights table
    - Update existing flights to 'active' status
  
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE flights ADD COLUMN status text NOT NULL DEFAULT 'active';