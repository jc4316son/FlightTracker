import { supabase } from './supabase';
import type { Flight, Company, FlightTask } from '../types';

// Helper function to handle database errors
const handleDbError = (error: any) => {
  console.error('Database error:', error);
  
  // Format user-friendly error message
  let message = 'An error occurred while accessing the database.';
  
  if (error?.message) {
    if (error.message.includes('dates overlap')) {
      message = 'This flight overlaps with another flight for the same aircraft.';
    } else if (error.message.includes('not found')) {
      message = 'The requested record was not found.';
    } else if (error.message.includes('permission denied')) {
      message = 'You do not have permission to perform this action.';
    } else if (error.message.includes('network')) {
      message = 'Unable to connect to the database. Please check your internet connection.';
    }
  }
  
  return {
    error: message,
    details: error
  };
};

// Helper function to handle database queries with proper error handling
const dbQuery = async <T>(
  query: any
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const { data, error } = await query;
    
    if (error) {
      const { error: message } = handleDbError(error);
      return { data: null, error: message };
    }
    
    return { data, error: null };
  } catch (err) {
    const { error: message } = handleDbError(err);
    return { data: null, error: message };
  }
};

// Database helper functions
export const db = {
  // Auth
  auth: {
    async getUser() {
      return supabase.auth.getUser();
    },

    async signOut() {
      return supabase.auth.signOut();
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      return supabase.auth.signInWithPassword(credentials);
    },

    async signUp(credentials: { email: string; password: string }) {
      return supabase.auth.signUp(credentials);
    }
  },

  // Flights
  flights: {
    async getAll() {
      return dbQuery<Flight[]>(
        supabase
          .from('flights')
          .select()
          .order('start_date')
      );
    },
    
    async getById(id: string) {
      return dbQuery<Flight>(
        supabase
          .from('flights')
          .select()
          .eq('id', id)
          .single()
      );
    },

    async create(flight: Omit<Flight, 'id' | 'created_at' | 'updated_at'>) {
      return dbQuery<Flight>(
        supabase
          .from('flights')
          .insert(flight)
          .select()
          .single()
      );
    },

    async update(id: string, flight: Partial<Flight>) {
      return dbQuery<Flight>(
        supabase
          .from('flights')
          .update(flight)
          .eq('id', id)
          .select()
          .single()
      );
    },

    async delete(id: string) {
      return dbQuery(
        supabase
          .from('flights')
          .delete()
          .eq('id', id)
      );
    }
  },
  
  // Companies
  companies: {
    async getAll() {
      return dbQuery<Company[]>(
        supabase
          .from('companies')
          .select()
          .order('name')
      );
    },

    async getById(id: string) {
      return dbQuery<Company>(
        supabase
          .from('companies')
          .select()
          .eq('id', id)
          .single()
      );
    },

    async create(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) {
      return dbQuery<Company>(
        supabase
          .from('companies')
          .insert(company)
          .select()
          .single()
      );
    },

    async update(id: string, company: Partial<Company>) {
      return dbQuery<Company>(
        supabase
          .from('companies')
          .update(company)
          .eq('id', id)
          .select()
          .single()
      );
    }
  },
  
  // Tasks
  tasks: {
    async getByFlight(flightId: string) {
      return dbQuery<FlightTask[]>(
        supabase
          .from('flight_tasks')
          .select()
          .eq('flight_id', flightId)
          .order('created_at')
      );
    },

    async create(task: Omit<FlightTask, 'id' | 'created_at'>) {
      return dbQuery<FlightTask>(
        supabase
          .from('flight_tasks')
          .insert(task)
          .select()
          .single()
      );
    },

    async update(id: string, task: Partial<FlightTask>) {
      return dbQuery<FlightTask>(
        supabase
          .from('flight_tasks')
          .update(task)
          .eq('id', id)
          .select()
          .single()
      );
    },

    async delete(id: string) {
      return dbQuery(
        supabase
          .from('flight_tasks')
          .delete()
          .eq('id', id)
      );
    }
  },
  
  // Company Tails
  companyTails: {
    async getByCompany(companyName: string) {
      const { data: company } = await dbQuery<Company>(
        supabase
          .from('companies')
          .select()
          .eq('name', companyName)
          .single()
      );

      if (!company) return { data: [], error: null };

      return dbQuery<{ tail_number: string }[]>(
        supabase
          .from('company_tails')
          .select()
          .eq('company_id', company.id)
      );
    },

    async create(companyId: string, tailNumber: string) {
      return dbQuery(
        supabase
          .from('company_tails')
          .insert({ company_id: companyId, tail_number: tailNumber })
          .select()
          .single()
      );
    },

    async delete(companyId: string, tailNumber: string) {
      return dbQuery(
        supabase
          .from('company_tails')
          .delete()
          .eq('company_id', companyId)
          .eq('tail_number', tailNumber)
      );
    }
  },

  // Audit Logs
  auditLogs: {
    async create(data: {
      flight_id: string;
      user_id: string;
      action: string;
      changes: any;
    }) {
      return dbQuery(
        supabase
          .from('audit_logs')
          .insert(data)
          .select()
      );
    }
  }
};
