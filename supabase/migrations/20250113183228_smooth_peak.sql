/*
  # Fix cascade delete for audit logs

  1. Changes
    - Drop existing foreign key constraint
    - Re-create foreign key constraint with ON DELETE CASCADE
*/

ALTER TABLE audit_logs
  DROP CONSTRAINT audit_logs_flight_id_fkey,
  ADD CONSTRAINT audit_logs_flight_id_fkey
    FOREIGN KEY (flight_id)
    REFERENCES flights(id)
    ON DELETE CASCADE;