import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Truck as TruckType, Driver as DriverType } from '../types';
import { Truck, User, Plus, Trash2, Edit2 } from 'lucide-react';

export const Fleet = () => {
  const [activeTab, setActiveTab] = useState<'trucks' | 'drivers'>('trucks');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const t = await db.getTrucks();
      const d = await db.getDrivers();
      setTrucks(t);
      setDrivers(d);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Fleet Data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Fleet Management</h1>
        <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus size={18} />
          Add {activeTab === 'trucks' ? 'Truck' : 'Driver'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('trucks')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'trucks' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Trucks
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'drivers' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Drivers
          </button>
        </div>

        {/* Content */}
        <div className="p-0">
          {activeTab === 'trucks' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Plate Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Capacity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trucks.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No trucks found.</td></tr>}
                {trucks.map(truck => (
                  <tr key={truck.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                          <Truck size={18} />
                        </div>
                        <span className="font-mono font-medium text-slate-800">{truck.plate_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{truck.capacity_tonnes} Tonnes</td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${truck.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${truck.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800' : ''}
                        ${truck.status === 'MAINTENANCE' ? 'bg-red-100 text-red-800' : ''}
                       `}>
                        {truck.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-emerald-600"><Edit2 size={16} /></button>
                      <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">License</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No drivers found.</td></tr>}
                {drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                          <User size={18} />
                        </div>
                        <span className="font-medium text-slate-800">{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{driver.phone}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{driver.license_number}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-emerald-600"><Edit2 size={16} /></button>
                      <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};