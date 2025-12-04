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
          <h1 className="text-2xl font-bold text-foreground">Logistics & Dispatch</h1>
          <p className="text-muted-foreground text-sm">Manage truck dispatches and generate delivery notes (BL).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Dispatch
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search BL number or truck plate..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">BL Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transport</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Load</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deliveries.map((del) => (
                <tr key={del.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <span className="font-medium text-foreground">{del.bl_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{del.operator_name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {del.region_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-muted rounded text-muted-foreground">
                        <TruckIcon size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium text-foreground">{del.truck_plate}</p>
                        <p className="text-xs text-muted-foreground">{del.driver_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">{del.tonnage_loaded} T</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={del.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(del.delivery_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">Dispatch New Truck</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment</h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Operator / Allocation</label>
                  <select className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground">
                    <option>Select Allocation...</option>
                    <option>GIE And Suxali (Thiès) - 460T Rem.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Destination</label>
                  <input type="text" disabled value="Thiès Nord, Thiès" className="w-full bg-muted rounded-lg border border-border p-2 text-sm text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transport Details</h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Truck</label>
                  <select className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground">
                     <option>Select Truck...</option>
                     <option>DK-2045-BB (40T)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-foreground mb-1">Driver</label>
                   <select className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground">
                     <option>Select Driver...</option>
                     <option>Amadou Fall</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tonnage</label>
                    <input type="number" className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground" placeholder="0.00" />
                   </div>
                   <div>
                    <label className="block text-sm font-medium text-foreground mb-1">BL Number</label>
                    <div className="flex">
                      <input type="text" value="BL250003" readOnly className="w-full rounded-l-lg border border-border bg-muted p-2 text-sm text-muted-foreground" />
                      <button className="bg-muted border border-l-0 border-border rounded-r-lg px-2 text-xs text-primary font-medium hover:bg-muted/80">
                        GEN
                      </button>
                    </div>
                   </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm">Confirm Dispatch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  // Can use semantic maps or hardcoded distinct colors
  const styles: any = {
    DRAFT: 'bg-secondary text-secondary-foreground',
    IN_TRANSIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    VALIDATED: 'bg-primary/10 text-primary',
    DELIVERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
};