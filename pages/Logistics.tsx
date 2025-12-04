import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { DeliveryView } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon } from 'lucide-react';

export const Logistics = () => {
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    db.getDeliveriesView().then(setDeliveries);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logistics & Dispatch</h1>
          <p className="text-slate-500 text-sm">Manage truck dispatches and generate delivery notes (BL).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-emerald-600/20"
        >
          <Plus size={18} />
          New Dispatch
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search BL number or truck plate..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">BL Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transport</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Load</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((del) => (
                <tr key={del.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-emerald-500" />
                      <span className="font-medium text-slate-700">{del.bl_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800">{del.operator_name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {del.region_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded text-slate-500">
                        <TruckIcon size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium text-slate-700">{del.truck_plate}</p>
                        <p className="text-xs text-slate-400">{del.driver_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">{del.tonnage_loaded} T</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={del.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(del.delivery_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Dispatch New Truck</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignment</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Operator / Allocation</label>
                  <select className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>Select Allocation...</option>
                    <option>GIE And Suxali (Thiès) - 460T Rem.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                  <input type="text" disabled value="Thiès Nord, Thiès" className="w-full bg-slate-50 rounded-lg border border-slate-200 p-2 text-sm text-slate-500" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transport Details</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Truck</label>
                  <select className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                     <option>Select Truck...</option>
                     <option>DK-2045-BB (40T)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
                   <select className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                     <option>Select Driver...</option>
                     <option>Amadou Fall</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tonnage</label>
                    <input type="number" className="w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="0.00" />
                   </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">BL Number</label>
                    <div className="flex">
                      <input type="text" value="BL250003" readOnly className="w-full rounded-l-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-600" />
                      <button className="bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg px-2 text-xs text-emerald-600 font-medium hover:bg-slate-200">
                        GEN
                      </button>
                    </div>
                   </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">Confirm Dispatch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    DRAFT: 'bg-slate-100 text-slate-600',
    IN_TRANSIT: 'bg-amber-100 text-amber-700',
    VALIDATED: 'bg-emerald-100 text-emerald-700',
    DELIVERED: 'bg-blue-100 text-blue-700'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
};