export interface Flight {
  id: string;
  tail_number: string;
  start_date: string;
  end_date: string;
  start_airport: string;
  end_airport: string;
  notes: string;
  company: string;
  status: 'active' | 'cancelled';
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface CompanyTail {
  id: string;
  company_id: string;
  tail_number: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  flight_id: string;
  user_id: string;
  action: string;
  changes: Record<string, any>;
  created_at: string;
}

export interface FlightTask {
  id: string;
  flight_id: string;
  description: string;
  completed: boolean;
  created_at: string;
  created_by: string;
  due_date: string | null;
}

export interface FlightLock {
  flight_id: string;
  user_id: string;
  user_email: string;
  locked_at: string;
}