import React, { useEffect, useState } from 'react';
import { Edit2 } from 'lucide-react';
import type { Company, CompanyTail } from '../types';
import { supabase } from '../lib/supabase';

interface CompanyTableProps {
  companies: Company[];
  onEdit: (company: Company) => void;
}

export default function CompanyTable({ companies, onEdit }: CompanyTableProps) {
  const [companyTails, setCompanyTails] = useState<Record<string, CompanyTail[]>>({});

  useEffect(() => {
    const fetchTails = async () => {
      try {
        const { data, error } = await supabase
          .from('company_tails')
          .select('*');

        if (error) throw error;

        const tailsByCompany = (data || []).reduce((acc, tail) => {
          if (!acc[tail.company_id]) {
            acc[tail.company_id] = [];
          }
          acc[tail.company_id].push(tail);
          return acc;
        }, {} as Record<string, CompanyTail[]>);

        setCompanyTails(tailsByCompany);
      } catch (error) {
        console.error('Error fetching company tails:', error);
      }
    };

    fetchTails();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tail Numbers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {company.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.contact}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-2">
                    {companyTails[company.id]?.map((tail) => (
                      <span
                        key={tail.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tail.tail_number}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => onEdit(company)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}