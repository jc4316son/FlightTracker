import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import type { Company, CompanyTail } from '../types';

interface CompanyModalProps {
  company?: Company | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompanyModal({ company, onClose, onSuccess }: CompanyModalProps) {
  const [tails, setTails] = useState<string[]>([]);
  const [newTail, setNewTail] = useState('');
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: company || {
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  // Load existing tail numbers when editing
  useEffect(() => {
    const loadTails = async () => {
      if (!company) {
        setLoading(false);
        return;
      }

      try {
        if (company?.name) {
          const { data, error } = await db.companyTails.getByCompany(company.name);
          if (error) {
            console.error('Error loading tail numbers:', error);
          } else {
            setTails(data?.map(t => t.tail_number) || []);
          }
        }
      } catch (error) {
        console.error('Error loading tail numbers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTails();
  }, [company]);

  const addTail = () => {
    if (newTail && !tails.includes(newTail)) {
      setTails([...tails, newTail]);
      setNewTail('');
    }
  };

  const removeTail = (tail: string) => {
    setTails(tails.filter(t => t !== tail));
  };

  const onSubmit = async (data: any) => {
    try {
      const user = (await db.auth.getUser()).data.user;
      if (!user) {
        console.error('No user found');
        return;
      }

      const companyData = {
        ...data,
        created_by: user.id,
      };

      // Save company
      if (company) {
        const { error } = await db.companies.update(company.id, companyData);
        if (error) throw new Error(error);
      } else {
        const { data: newCompany, error } = await db.companies.create(companyData);
        if (error) throw new Error(error);
        if (!newCompany) throw new Error('Failed to create company');
        company = newCompany;
      }

      // Handle tail numbers if we need to
      if (tails.length > 0 && company) {
        // Remove all existing tails
        for (const oldTail of tails) {
          await db.companyTails.delete(company.id, oldTail);
        }

        // Add all current tails
        for (const newTail of tails) {
          const { error } = await db.companyTails.create(company.id, newTail);
          if (error) throw new Error(error);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error saving company. Please try again.');
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
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <div className="bg-white rounded-lg shadow-xl p-6 m-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {company ? 'Edit Company' : 'Add New Company'}
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
                  Company Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Company name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company Name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  {...register('contact')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact Person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company Address"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tail Numbers
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTail}
                    onChange={(e) => setNewTail(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="N12345"
                  />
                  <button
                    type="button"
                    onClick={addTail}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {tails.map((tail) => (
                    <div key={tail} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                      <span>{tail}</span>
                      <button
                        type="button"
                        onClick={() => removeTail(tail)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {company ? 'Update Company' : 'Add Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
