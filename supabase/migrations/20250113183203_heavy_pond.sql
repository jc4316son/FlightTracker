/*
  # Add delete policy for flights

  1. Security Changes
    - Add policy to allow authenticated users to delete flights
*/

CREATE POLICY "Users can delete flights"
  ON flights FOR DELETE
  TO authenticated
  USING (true);