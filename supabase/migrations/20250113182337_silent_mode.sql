/*
  # Clean up flight data
  
  1. Changes
    - Delete all existing flight entries
    - Delete all existing audit logs (since they reference flights)
*/

DO $$ 
BEGIN
  -- First delete audit logs since they reference flights
  DELETE FROM audit_logs;
  
  -- Then delete flights
  DELETE FROM flights;
END $$;