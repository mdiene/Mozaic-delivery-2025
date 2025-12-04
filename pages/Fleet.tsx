
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Truck as TruckType, Driver as DriverType } from '../types';
import { Truck, User, Plus, Trash2, Edit2, X, Save, Link as LinkIcon } from 'lucide-react';

export const Fleet = () => {
  const [activeTab, setActiveTab] = useState<'trucks' | 'drivers'>('trucks');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([db.getTrucks(), db.getDrivers()]);
      setTrucks(t);
      setDrivers(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setFormData({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete?')) return;
    try {
      await db.deleteItem(activeTab, id);
      fetchData();
    } catch (e) {
      alert('Cannot delete. Item might be in use.');
    }
  };

  // Special handler to open Add Truck modal pre-filled with this driver
  const handleAssignTruck = (driver: DriverType) => {
    // Switch to trucks mode so the modal renders the Truck form
    setActiveTab('trucks');
    setFormData({
      driver_id: driver.id,
      status: 'AVAILABLE',
      capacity_tonnes: 0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Separate Driver Assignment from Truck Payload
      let driverIdToAssign = null;
      if (activeTab === 'trucks') {
        driverIdToAssign = payload.driver_id || null;
        // Clean up payload for trucks table
        delete payload.driver_id;
        delete payload.driver_name;
      }

      // Handle Driver specific fields
      if (activeTab === 'drivers') {
        // Map form 'phone' to DB 'phone_normalized'
        payload.phone_normalized = payload.phone;
        delete payload.phone;
        // Strip truck specific info joined for display
        delete payload.truck_plate;
        delete payload.trucks;
      }
      
      // Ensure numeric types
      if (activeTab === 'trucks' && payload.capacity_tonnes) {
        payload.capacity_tonnes = Number(payload.capacity_tonnes);
      }

      // Remove ID for creation
      if (!payload.id) delete payload.id;
      
      let savedId = formData.id;

      if (formData.id) {
        await db.updateItem(activeTab, formData.id, payload);
      } else {
        const result = await db.createItem(activeTab, payload);
        if (result && result.length > 0) {
          savedId = result[0].id;
        }
      }

      // Handle Driver Assignment via foreign key on Drivers table
      if (activeTab === 'trucks' && savedId) {
        await db.updateTruckDriverAssignment(savedId, driverIdToAssign);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving:", JSON.stringify(error));
      alert(`Failed to save: ${JSON.stringify(error)}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Fleet Data...</div>;

  // Split drivers for grouping
  const assignedDrivers = drivers.filter(d => d.truck_plate);
  const unassignedDrivers = drivers.filter(d => !d.truck_plate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
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
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Assigned Driver</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trucks.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No trucks found.</td></tr>}
                {trucks.map(truck => (
                  <tr key={truck.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                          <Truck size={18} />
                        </div>
                        <div>
                          <p className="font-mono font-medium text-foreground">{truck.plate_number}</p>
                          {truck.trailer_number && <p className="text-xs text-muted-foreground">Trailer: {truck.trailer_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{truck.capacity_tonnes} Tonnes</td>
                    <td className="px-6 py-4">
                      {truck.driver_name ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{truck.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${truck.status === 'AVAILABLE' ? 'bg-primary/10 text-primary' : ''}
                        ${truck.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : ''}
                        ${truck.status === 'MAINTENANCE' ? 'bg-destructive/10 text-destructive' : ''}
                       `}>
                        {truck.status?.replace('_', ' ') || 'AVAILABLE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEdit(truck)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(truck.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Assigned Truck</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No drivers found.</td></tr>}
                
                {/* ASSIGNED DRIVERS GROUP */}
                {assignedDrivers.length > 0 && (
                  <>
                    <tr className="bg-muted/30">
                       <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider border-y border-border">Assigned</td>
                    </tr>
                    {assignedDrivers.map(driver => (
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
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${driver.status === 'ACTIVE' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                          `}>
                            {driver.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-muted-foreground" />
                            <span className="font-mono font-medium text-foreground">{driver.truck_plate}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button onClick={() => handleEdit(driver)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(driver.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* UNASSIGNED DRIVERS GROUP */}
                {unassignedDrivers.length > 0 && (
                  <>
                    <tr className="bg-muted/30">
                       <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider border-y border-border">Unassigned</td>
                    </tr>
                    {unassignedDrivers.map(driver => (
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
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${driver.status === 'ACTIVE' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                          `}>
                            {driver.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-xs text-muted-foreground italic">None</span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {/* Assign Truck Action */}
                          <button 
                            onClick={() => handleAssignTruck(driver)}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                            title="Assign to New Truck"
                          >
                            <LinkIcon size={16} />
                          </button>
                          <button onClick={() => handleEdit(driver)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(driver.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground capitalize">
                {formData.id ? 'Edit' : 'Add'} {activeTab === 'trucks' ? 'Truck' : 'Driver'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'trucks' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Plate Number</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase placeholder:normal-case"
                      placeholder="e.g., DK-2025-AA"
                      value={formData.plate_number || ''}
                      onChange={e => setFormData({...formData, plate_number: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Trailer Number (Optional)</label>
                    <input 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.trailer_number || ''}
                      onChange={e => setFormData({...formData, trailer_number: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Capacity (Tonnes)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.capacity_tonnes || ''}
                      onChange={e => setFormData({...formData, capacity_tonnes: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.status || 'AVAILABLE'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Assigned Driver</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.driver_id || ''}
                      onChange={e => setFormData({...formData, driver_id: e.target.value})}
                    >
                      <option value="">Select a driver...</option>
                      {drivers
                        .filter(d => !d.truck_id || (formData.id && d.truck_id === formData.id) || d.id === formData.driver_id)
                        .map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.license_number})</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">License Number</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.license_number || ''}
                      onChange={e => setFormData({...formData, license_number: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.status || 'ACTIVE'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                  <Save size={16} />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
