import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2, Check, Square, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Flight, Company, FlightTask } from '../types';

interface FlightModalProps {
  flight?: Flight | null;
  onClose: () => void;
  onSuccess: () => void;
}

function FlightModal({ flight, onClose, onSuccess }: FlightModalProps) {
  const [tasks, setTasks] = useState<FlightTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyTails, setCompanyTails] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      company: flight?.company || '',
      tail_number: flight?.tail_number || '',
      start_date: flight ? new Date(flight.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_date: flight ? new Date(flight.end_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      start_airport: flight?.start_airport || '',
      end_airport: flight?.end_airport || '',
      notes: flight?.notes || '',
    },
  });

  const watchCompany = watch('company');
  const watchStartDate = watch('start_date');
  const watchEndDate = watch('end_date');

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      await fetchCompanies();
      
      if (flight) {
        if (flight.company) {
          await fetchCompanyTails(flight.company);
        }
        await fetchTasks();
      }
      
      setLoading(false);
    };

    initializeForm();
  }, [flight]);

  useEffect(() => {
    if (watchCompany) {
      fetchCompanyTails(watchCompany);
    } else {
      setCompanyTails([]);
      setValue('tail_number', '');
    }
  }, [watchCompany, setValue]);

  // Validate end date when start date changes
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const startDate = new Date(watchStartDate);
      const endDate = new Date(watchEndDate);
      
      if (endDate < startDate) {
        setValue('end_date', watchStartDate);
      }
    }
  }, [watchStartDate, watchEndDate, setValue]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCompanyTails = async (companyName: string) => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .single();

      if (company) {
        const { data, error } = await supabase
          .from('company_tails')
          .select('tail_number')
          .eq('company_id', company.id);

        if (error) throw error;
        setCompanyTails(data?.map(t => t.tail_number) || []);
      }
    } catch (error) {
      console.error('Error fetching company tails:', error);
      setCompanyTails([]);
    }
  };

  const fetchTasks = async () => {
    if (!flight) return;

    try {
      const { data, error } = await supabase
        .from('flight_tasks')
        .select('*')
        .eq('flight_id', flight.id);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addTask = async () => {
    if (!flight || !newTask.trim()) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error } = await supabase
        .from('flight_tasks')
        .insert({
          flight_id: flight.id,
          description: newTask.trim(),
          created_by: user.id,
          due_date: newTaskDueDate || null,
        });

      if (error) throw error;

      setNewTask('');
      setNewTaskDueDate('');
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('flight_tasks')
        .update({ completed })
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('flight_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCancel = async () => {
    if (!flight || !confirm('Are you sure you want to cancel this flight?')) return;

    try {
      const { error: updateError } = await supabase
        .from('flights')
        .update({ status: 'cancelled' })
        .eq('id', flight.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error cancelling flight:', error);
      alert('Error cancelling flight. Please try again.');
    }
  };

  const onSubmit = async (data: any) => {
    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        console.error('No user found');
        return;
      }

      const flightData = {
        ...data,
        created_by: user.id,
        status: flight?.status || 'active',
      };

      if (flight) {
        const { error: updateError } = await supabase
          .from('flights')
          .update(flightData)
          .eq('id', flight.id);

        if (updateError) throw updateError;

        await supabase.from('audit_logs').insert({
          flight_id: flight.id,
          user_id: user.id,
          action: 'update',
          changes: {
            previous: flight,
            new: flightData,
          },
        });
      } else {
        const { data: newFlight, error: insertError } = await supabase
          .from('flights')
          .insert(flightData)
          .select()
          .single();

        if (insertError) throw insertError;

        if (newFlight) {
          await supabase.from('audit_logs').insert({
            flight_id: newFlight.id,
            user_id: user.id,
            action: 'create',
            changes: {
              new: newFlight,
            },
          });
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving flight:', error);
      alert('Error saving flight. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 m-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {flight ? 'Edit Flight' : 'Add New Flight'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  {...register('company', { required: 'Company is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.company && (
                  <p className="mt-1 text-sm text-red-600">{errors.company.message as string}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tail Number
                </label>
                <select
                  {...register('tail_number', { required: 'Tail number is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!watchCompany}
                >
                  <option value="">Select a tail number</option>
                  {companyTails.map((tail) => (
                    <option key={tail} value={tail}>
                      {tail}
                    </option>
                  ))}
                </select>
                {errors.tail_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.tail_number.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Airport
                </label>
                <input
                  type="text"
                  {...register('start_airport', { required: 'Start airport is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="KJFK"
                />
                {errors.start_airport && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_airport.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Airport
                </label>
                <input
                  type="text"
                  {...register('end_airport', { required: 'End airport is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="KLAX"
                />
                {errors.end_airport && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_airport.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  {...register('start_date', { required: 'Start date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_date.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  {...register('end_date', { required: 'End date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={watchStartDate}
                />
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_date.message as string}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any flight notes here..."
                />
              </div>

              {flight && (
                <div className="col-span-2 space-y-4">
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tasks
                    </label>
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={newTask}
                          onChange={(e) => setNewTask(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Add a new task..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTask();
                            }
                          }}
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Due date (optional)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addTask}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id, !task.completed)}
                              className={`text-lg ${task.completed ? 'text-green-600' : 'text-gray-400'}`}
                            >
                              {task.completed ? <Check className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                            </button>
                            <div className="flex flex-col">
                              <span className={task.completed ? 'line-through text-gray-500' : ''}>
                                {task.description}
                              </span>
                              {task.due_date && (
                                <span className="text-sm text-gray-500">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <div>
                {flight && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel Flight
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {flight ? 'Update Flight' : 'Add Flight'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FlightModal;