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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Fleet Data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus size={18} />
          Add {activeTab === 'trucks' ? 'Truck' : 'Driver'}
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('trucks')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'trucks' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Trucks
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'drivers' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Drivers
          </button>
        </div>

        {/* Content */}
        <div className="p-0">
          {activeTab === 'trucks' ? (
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Plate Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Capacity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trucks.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No trucks found.</td></tr>}
                {trucks.map(truck => (
                  <tr key={truck.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                          <Truck size={18} />
                        </div>
                        <span className="font-mono font-medium text-foreground">{truck.plate_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{truck.capacity_tonnes} Tonnes</td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${truck.status === 'AVAILABLE' ? 'bg-primary/10 text-primary' : ''}
                        ${truck.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : ''}
                        ${truck.status === 'MAINTENANCE' ? 'bg-destructive/10 text-destructive' : ''}
                       `}>
                        {truck.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button className="p-2 text-muted-foreground hover:text-primary"><Edit2 size={16} /></button>
                      <button className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Phone</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">License</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No drivers found.</td></tr>}
                {drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full text-muted-foreground">
                          <User size={18} />
                        </div>
                        <span className="font-medium text-foreground">{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{driver.phone}</td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{driver.license_number}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button className="p-2 text-muted-foreground hover:text-primary"><Edit2 size={16} /></button>
                      <button className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
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