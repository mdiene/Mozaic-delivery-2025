import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { AllocationView } from '../types';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';

export const Allocations = () => {
  const [allocations, setAllocations] = useState<AllocationView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    db.getAllocationsView().then(setAllocations);
  }, []);

  const filteredAllocations = allocations.filter(a => 
    a.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.allocation_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Allocations</h1>
          <p className="text-slate-500 text-sm">Manage regional quotas and operator assignments.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-emerald-600/20">
          <Plus size={18} />
          New Allocation
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search operator, region..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation Key</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region / Commune</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {alloc.allocation_key}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{alloc.operator_name}</p>
                    <p className="text-xs text-slate-500">{alloc.phase}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{alloc.region_name}</p>
                    <p className="text-xs text-slate-400">{alloc.commune_name}</p>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{alloc.delivered_tonnage} / {alloc.target_tonnage} T</span>
                      <span className="font-medium text-emerald-600">{alloc.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(alloc.progress, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${alloc.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : ''}
                      ${alloc.status === 'OPEN' ? 'bg-slate-100 text-slate-800' : ''}
                      ${alloc.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : ''}
                    `}>
                      {alloc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAllocations.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No allocations found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};