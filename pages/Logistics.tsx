
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { DeliveryView, Truck, Driver, AllocationView } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon, Edit2, Trash2, RefreshCw, X, Save, Calendar, User, Layers, Filter } from 'lucide-react';

type GroupBy = 'none' | 'truck' | 'commune' | 'region';

export const Logistics = () => {
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allocations, setAllocations] = useState<AllocationView[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Grouping State
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [del, tr, dr, al] = await Promise.all([
        db.getDeliveriesView(),
        db.getTrucks(),
        db.getDrivers(),
        db.getAllocationsView()
      ]);
      setDeliveries(del);
      setTrucks(tr);
      setDrivers(dr);
      // Only show open or in-progress allocations for new dispatches
      setAllocations(al); 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateBL = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `BL${year}${random}`;
  };

  const handleOpenModal = (delivery?: DeliveryView) => {
    if (delivery) {
      // Edit Mode
      setFormData({
        ...delivery,
        // Ensure date is formatted for input type="date"
        delivery_date: delivery.delivery_date ? new Date(delivery.delivery_date).toISOString().split('T')[0] : ''
      });
    } else {
      // Create Mode
      setFormData({
        bl_number: generateBL(),
        delivery_date: new Date().toISOString().split('T')[0],
        tonnage_loaded: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dispatch?')) return;
    try {
      await db.deleteItem('deliveries', id);
      fetchData();
    } catch (e) {
      alert('Error deleting item.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client Validation
    if (!formData.allocation_id) {
       alert("Allocation is required");
       return;
    }
    if (Number(formData.tonnage_loaded) <= 0) {
       alert("Load must be greater than 0");
       return;
    }

    try {
      // Allowlist Strategy: Only include fields that exist in the 'deliveries' table
      const dbPayload: any = {
        allocation_id: formData.allocation_id,
        bl_number: formData.bl_number,
        truck_id: formData.truck_id || null, // Handle possible empty string
        driver_id: formData.driver_id || null,
        tonnage_loaded: Number(formData.tonnage_loaded),
        delivery_date: formData.delivery_date
      };

      if (formData.id) {
        await db.updateItem('deliveries', formData.id, dbPayload);
      } else {
        await db.createItem('deliveries', dbPayload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Save Error:", error);
      const msg = error.details || error.hint || error.message || JSON.stringify(error);
      alert(`Failed to save dispatch: ${msg}`);
    }
  };

  // Logic: When truck changes, find the truck and auto-select its assigned driver
  const handleTruckChange = (truckId: string) => {
    const selectedTruck = trucks.find(t => t.id === truckId);
    
    setFormData((prev: any) => ({
      ...prev,
      truck_id: truckId,
      // Auto-fill driver if the truck has one assigned
      driver_id: selectedTruck?.driver_id || prev.driver_id
    }));
  };

  const filteredDeliveries = deliveries.filter(d => 
    d.bl_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.truck_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.operator_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouping Logic
  const groupedDeliveries = useMemo(() => {
    // 1. First Group by Project Phase (Always)
    const projectGroups: Record<string, DeliveryView[]> = {};
    
    filteredDeliveries.forEach(d => {
      const phase = d.project_phase || 'Unassigned Phase';
      if (!projectGroups[phase]) projectGroups[phase] = [];
      projectGroups[phase].push(d);
    });

    // 2. If no sub-grouping, return simple project structure
    if (groupBy === 'none') {
      return Object.entries(projectGroups).map(([phase, items]) => ({
        phase,
        subGroups: [{
           key: 'All',
           items,
           totalLoad: items.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0)
        }]
      }));
    }

    // 3. Apply Sub-grouping (Truck, Commune, Region)
    return Object.entries(projectGroups).map(([phase, phaseItems]) => {
       const subGroupMap: Record<string, DeliveryView[]> = {};
       
       phaseItems.forEach(d => {
         let key = 'Unknown';
         if (groupBy === 'truck') key = d.truck_plate || 'No Truck';
         if (groupBy === 'commune') key = d.commune_name || 'No Commune';
         if (groupBy === 'region') key = d.region_name || 'No Region';
         
         if (!subGroupMap[key]) subGroupMap[key] = [];
         subGroupMap[key].push(d);
       });

       const subGroups = Object.entries(subGroupMap).map(([key, items]) => ({
         key,
         items,
         totalLoad: items.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0)
       })).sort((a, b) => b.totalLoad - a.totalLoad); // Sort by highest load

       return { phase, subGroups };
    });

  }, [filteredDeliveries, groupBy]);

  const selectedAllocation = allocations.find(a => a.id === formData.allocation_id);
  const selectedTruck = trucks.find(t => t.id === formData.truck_id);
  const assignedDriverName = selectedTruck?.driver_name || (formData.driver_id ? drivers.find(d => d.id === formData.driver_id)?.name : '');

  // Calculate real-time stats for the selected allocation
  const calculatedDelivered = React.useMemo(() => {
    if (!formData.allocation_id) return 0;
    return deliveries
      .filter(d => d.allocation_id === formData.allocation_id)
      .reduce((sum, d) => sum + Number(d.tonnage_loaded || 0), 0);
  }, [formData.allocation_id, deliveries]);

  const targetTonnage = selectedAllocation?.target_tonnage || 0;
  const remainingTonnage = targetTonnage - calculatedDelivered;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logistics & Dispatch</h1>
          <p className="text-muted-foreground text-sm">Manage truck dispatches and generate delivery notes (BL).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Dispatch
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        
        {/* Toolbar: Search and Grouping */}
        <div className="p-4 border-b border-border flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
           <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search BL, Truck or Operator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
             <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 whitespace-nowrap flex items-center gap-1">
               <Layers size={14} /> Group By:
             </span>
             <button 
               onClick={() => setGroupBy('truck')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'truck' ? 'bg-primary/10 text-primary border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border'}`}
             >
               Truck
             </button>
             <button 
               onClick={() => setGroupBy('commune')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'commune' ? 'bg-primary/10 text-primary border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border'}`}
             >
               Commune
             </button>
             <button 
               onClick={() => setGroupBy('region')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'region' ? 'bg-primary/10 text-primary border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border'}`}
             >
               Region
             </button>
             {groupBy !== 'none' && (
               <button 
                 onClick={() => setGroupBy('none')}
                 className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                 title="Clear Grouping"
               >
                 <X size={14} />
               </button>
             )}
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
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedDeliveries.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-muted-foreground">No dispatches found. Create one to get started.</td>
                </tr>
              )}
              
              {/* Group Iteration: Project Phase */}
              {groupedDeliveries.map((projectGroup) => (
                <React.Fragment key={projectGroup.phase}>
                   <tr className="bg-slate-100 dark:bg-slate-800/50">
                      <td colSpan={6} className="px-6 py-3 text-sm font-bold text-foreground border-y border-border">
                         {projectGroup.phase}
                      </td>
                   </tr>

                   {/* Sub-Group Iteration */}
                   {projectGroup.subGroups.map((subGroup) => (
                     <React.Fragment key={subGroup.key}>
                        {/* Sub-Group Header (Only if grouping is active) */}
                        {groupBy !== 'none' && (
                          <tr className="bg-muted/30">
                             <td colSpan={6} className="px-6 py-2 text-xs font-medium text-foreground border-b border-border/50 pl-10 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                   {groupBy === 'truck' && <TruckIcon size={14} className="text-muted-foreground" />}
                                   {groupBy === 'commune' && <MapPin size={14} className="text-muted-foreground" />}
                                   {groupBy === 'region' && <MapPin size={14} className="text-muted-foreground" />}
                                   <span className="uppercase tracking-wide">{subGroup.key}</span>
                                </span>
                                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                                   Subtotal: {subGroup.totalLoad.toFixed(2)} T
                                </span>
                             </td>
                          </tr>
                        )}

                        {/* Items */}
                        {subGroup.items.map((del) => (
                          <tr key={del.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 pl-10"> {/* Indent slightly if grouped? Keep standard for now or subtle indent */}
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-primary" />
                                <span className="font-medium text-foreground">{del.bl_number}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{del.operator_name}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin size={10} /> {del.commune_name}, {del.region_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-muted rounded text-muted-foreground">
                                  <TruckIcon size={14} />
                                </div>
                                <div>
                                  <p className="text-sm font-mono font-medium text-foreground">{del.truck_plate || 'No Truck'}</p>
                                  <p className="text-xs text-muted-foreground">{del.driver_name || 'No Driver'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-foreground">{del.tonnage_loaded} T</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {del.delivery_date ? new Date(del.delivery_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleOpenModal(del)}
                                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                                title="Edit Dispatch"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(del.id)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                title="Delete Dispatch"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                     </React.Fragment>
                   ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{formData.id ? 'Edit Dispatch' : 'New Dispatch'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
                
                {/* Left Column: Allocation Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} /> Assignment
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Select Allocation / Operator</label>
                    <select 
                      required
                      className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground"
                      value={formData.allocation_id || ''}
                      onChange={(e) => setFormData({...formData, allocation_id: e.target.value})}
                    >
                      <option value="">Choose Operator...</option>
                      {allocations.map(alloc => (
                        <option key={alloc.id} value={alloc.id}>
                          {alloc.operator_name} ({alloc.region_name})
                        </option>
                      ))}
                    </select>
                    
                    {selectedAllocation ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-lg border border-border border-dashed">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Target</span>
                            <span className="font-mono text-sm font-medium text-foreground">{targetTonnage} T</span>
                        </div>
                        <div className="flex flex-col border-l border-border relative">
                            {/* Blue dashed emphasis for Delivered */}
                            <div className="absolute -inset-1 border border-dashed border-blue-400 rounded-md pointer-events-none opacity-50"></div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Delivered</span>
                            <span className="font-mono text-sm font-medium text-primary">{calculatedDelivered} T</span>
                        </div>
                        <div className="flex flex-col border-l border-border">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining</span>
                            <span className="font-mono text-sm font-medium text-foreground">
                                {remainingTonnage} T
                            </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Shows Operators with active quotas.
                      </p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground">BL Number</span>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, bl_number: generateBL()})}
                          className="text-xs flex items-center gap-1 text-primary hover:underline"
                        >
                          <RefreshCw size={12} /> Regenerate
                        </button>
                     </div>
                     <input 
                       type="text" 
                       required
                       readOnly
                       value={formData.bl_number || ''}
                       className="w-full bg-background font-mono font-bold text-center tracking-widest border border-input rounded-md py-2"
                     />
                  </div>
                </div>
                
                {/* Right Column: Transport */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <TruckIcon size={14} /> Transport Details
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Truck (Plate Number)</label>
                    <select 
                      required
                      className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground"
                      value={formData.truck_id || ''}
                      onChange={(e) => handleTruckChange(e.target.value)}
                    >
                       <option value="">Select Truck...</option>
                       {trucks.map(t => (
                         <option key={t.id} value={t.id}>{t.plate_number} ({t.capacity_tonnes}T)</option>
                       ))}
                    </select>
                  </div>

                  {/* Driver Field - Read Only based on Truck */}
                  <div className="relative">
                     <label className="block text-sm font-medium text-foreground mb-1">Driver</label>
                     {/* Dashed border effect container */}
                     <div className="relative">
                        <input 
                          type="text"
                          readOnly
                          disabled
                          placeholder="Select a truck to load driver..."
                          className="w-full rounded-lg border border-input bg-muted/50 p-2 pl-9 text-sm text-foreground focus:outline-none cursor-not-allowed"
                          value={assignedDriverName}
                        />
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     </div>
                     {!assignedDriverName && formData.truck_id && (
                       <p className="text-xs text-amber-500 mt-1">This truck has no assigned driver.</p>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Load (Tonnes)</label>
                      <input 
                        type="number" 
                        required
                        className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground" 
                        placeholder="0.00"
                        value={formData.tonnage_loaded || ''}
                        onChange={(e) => setFormData({...formData, tonnage_loaded: e.target.value})}
                      />
                     </div>
                     <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          required
                          className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
                          value={formData.delivery_date || ''}
                          onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                        />
                      </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  <Save size={16} />
                  {formData.id ? 'Update Dispatch' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
