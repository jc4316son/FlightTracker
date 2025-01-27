/*
  # Add company field to flights table

  1. Changes
    - Add company column to flights table with default empty string
*/

ALTER TABLE flights ADD COLUMN IF NOT EXISTS company text DEFAULT '';