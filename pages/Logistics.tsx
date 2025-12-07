
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { DeliveryView, Truck, Driver, AllocationView, Project } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon, Edit2, Trash2, RefreshCw, X, Save, Calendar, User, Layers, Filter, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

type GroupBy = 'none' | 'truck' | 'commune' | 'region';

export const Logistics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allocations, setAllocations] = useState<AllocationView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Grouping State
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Modal Filter State
  const [modalPhaseFilter, setModalPhaseFilter] = useState<string>('all');
  
  // Searchable Select State (Allocation/Operator)
  const [allocationSearch, setAllocationSearch] = useState('');
  const [isAllocationDropdownOpen, setIsAllocationDropdownOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [del, tr, dr, al, proj] = await Promise.all([
        db.getDeliveriesView(),
        db.getTrucks(),
        db.getDrivers(),
        db.getAllocationsView(),
        db.getProjects()
      ]);
      setDeliveries(del);
      setTrucks(tr);
      setDrivers(dr);
      // Only show open or in-progress allocations for new dispatches
      setAllocations(al); 
      setProjects(proj);
      return al; // Return allocations for immediate use in effect
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loadedAllocations = await fetchData();
      
      // Check URL params for auto-open action
      const params = new URLSearchParams(location.search);
      if (params.get('action') === 'new' && params.get('allocationId')) {
        const allocId = params.get('allocationId');
        const targetAlloc = loadedAllocations.find(a => a.id === allocId);
        
        if (targetAlloc) {
          setFormData({
            allocation_id: targetAlloc.id,
            bl_number: generateBL(),
            delivery_date: new Date().toISOString().split('T')[0],
            tonnage_loaded: 0
          });
          setAllocationSearch(targetAlloc.operator_name);
          setIsModalOpen(true);
          
          // Clear URL params to prevent re-opening on reload
          navigate('/logistics', { replace: true });
        }
      }
    };
    init();
  }, [location.search]);

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
      // Pre-fill search with current operator name
      setAllocationSearch(delivery.operator_name);
    } else {
      // Create Mode
      setFormData({
        bl_number: generateBL(),
        delivery_date: new Date().toISOString().split('T')[0],
        tonnage_loaded: 0
      });
      setAllocationSearch('');
    }
    setModalPhaseFilter('all');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette expédition ?')) return;
    try {
      await db.deleteItem('deliveries', id);
      fetchData();
    } catch (e) {
      alert("Erreur lors de la suppression de l'élément.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client Validation
    if (!formData.allocation_id) {
       alert("L'allocation est requise");
       return;
    }
    if (Number(formData.tonnage_loaded) <= 0) {
       alert("La charge doit être supérieure à 0");
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
      alert(`Échec de l'enregistrement: ${msg}`);
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

  // Grouping Logic
  const groupedDeliveries = useMemo(() => {
    // 1. First Group by Project Phase (Always)
    const projectGroups: Record<string, DeliveryView[]> = {};
    
    // Use full deliveries list instead of filtered
    deliveries.forEach(d => {
      const phase = d.project_phase || 'Phase Non Assignée';
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
         let key = 'Inconnu';
         if (groupBy === 'truck') key = d.truck_plate || 'Aucun Camion';
         if (groupBy === 'commune') key = d.commune_name || 'Aucune Commune';
         if (groupBy === 'region') key = d.region_name || 'Aucune Région';
         
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

  }, [deliveries, groupBy]);

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

  // Filtered Allocations for Dropdown
  const filteredAllocations = useMemo(() => {
    return allocations.filter(a => {
      // 1. Filter by Project Phase
      if (modalPhaseFilter !== 'all' && a.project_id !== modalPhaseFilter) return false;
      
      // 2. Filter by Search Text
      if (!allocationSearch) return true;
      const searchLower = allocationSearch.toLowerCase();
      return (
        a.operator_name.toLowerCase().includes(searchLower) ||
        a.region_name.toLowerCase().includes(searchLower) ||
        a.allocation_key.toLowerCase().includes(searchLower)
      );
    });
  }, [allocations, modalPhaseFilter, allocationSearch]);

  const handleAllocationSelect = (alloc: AllocationView) => {
    setFormData({ ...formData, allocation_id: alloc.id });
    setAllocationSearch(alloc.operator_name);
    setIsAllocationDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logistique & Expédition</h1>
          <p className="text-muted-foreground text-sm">Gérer les expéditions de camions et générer les bons de livraison (BL).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nouvelle Expédition
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        
        {/* Toolbar: Grouping Only */}
        <div className="p-4 border-b border-border flex flex-col lg:flex-row gap-4 justify-end items-start lg:items-center">
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
             <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 whitespace-nowrap flex items-center gap-1">
               <Layers size={14} /> Grouper par:
             </span>
             <button 
               onClick={() => setGroupBy('truck')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'truck' ? 'bg-primary/10 text-primary border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border'}`}
             >
               Camion
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
               Région
             </button>
             {groupBy !== 'none' && (
               <button 
                 onClick={() => setGroupBy('none')}
                 className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                 title="Effacer le regroupement"
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
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">N° BL</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transport</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Charge</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedDeliveries.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-muted-foreground">Aucune expédition trouvée. Créez-en une pour commencer.</td>
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
                                   Sous-total: {subGroup.totalLoad.toFixed(2)} T
                                </span>
                             </td>
                          </tr>
                        )}

                        {/* Items */}
                        {subGroup.items.map((del) => (
                          <tr key={del.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 pl-10">
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
                                  <p className="text-sm font-mono font-medium text-foreground">{del.truck_plate || 'Aucun Camion'}</p>
                                  <p className="text-xs text-muted-foreground">{del.driver_name || 'Aucun Chauffeur'}</p>
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
                                title="Modifier"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(del.id)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                title="Supprimer"
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
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier Expédition' : 'Nouvelle Expédition'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
                
                {/* Left Column: Allocation Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} /> Affectation
                  </h4>
                  
                  {/* Phase Filter Buttons */}
                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalPhaseFilter('all')}
                        className={`whitespace-nowrap px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors border ${
                          modalPhaseFilter === 'all'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Toutes
                      </button>
                      {projects.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setModalPhaseFilter(p.id)}
                          className={`whitespace-nowrap px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors border ${
                            modalPhaseFilter === p.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          Phase {p.numero_phase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Searchable Select for Allocation */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-1">Sélectionner Allocation / Opérateur</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      <input 
                        type="text"
                        required
                        className="w-full pl-9 pr-8 border border-input rounded-lg p-2 text-sm bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Rechercher par Nom, Région..."
                        value={allocationSearch}
                        onChange={(e) => {
                          setAllocationSearch(e.target.value);
                          setIsAllocationDropdownOpen(true);
                          // Clear ID if text changes without selection
                          if (formData.allocation_id) setFormData({...formData, allocation_id: ''});
                        }}
                        onFocus={() => setIsAllocationDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsAllocationDropdownOpen(false), 200)}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                    
                    {/* Input Validation Helper (Invisible) */}
                    <input 
                      type="text" 
                      className="sr-only" 
                      required 
                      value={formData.allocation_id || ''} 
                      onChange={()=>{}} 
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Veuillez sélectionner un opérateur dans la liste.")}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                    />

                    {isAllocationDropdownOpen && (
                      <ul className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredAllocations.map(alloc => (
                          <li 
                            key={alloc.id}
                            className="px-4 py-2 hover:bg-muted text-sm cursor-pointer text-popover-foreground border-b border-border/50 last:border-0"
                            onClick={() => handleAllocationSelect(alloc)}
                          >
                            <div className="font-medium">{alloc.operator_name}</div>
                            <div className="text-xs text-muted-foreground flex justify-between">
                              <span>{alloc.region_name} • {alloc.commune_name}</span>
                              {alloc.project_phase && <span className="italic">{alloc.project_phase}</span>}
                            </div>
                          </li>
                        ))}
                        {filteredAllocations.length === 0 && (
                          <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                            Aucune allocation trouvée pour ce filtre.
                          </li>
                        )}
                      </ul>
                    )}
                    
                    {selectedAllocation ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-lg border border-border border-dashed animate-fade-in">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cible Totale</span>
                            <span className="font-mono text-sm font-medium text-foreground">{targetTonnage} T</span>
                        </div>
                        <div className="flex flex-col border-l border-border relative">
                            {/* Blue dashed emphasis for Delivered */}
                            <div className="absolute -inset-1 border border-dashed border-blue-400 rounded-md pointer-events-none opacity-50"></div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Livré</span>
                            <span className="font-mono text-sm font-medium text-primary">{calculatedDelivered} T</span>
                        </div>
                        <div className="flex flex-col border-l border-border">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Restant</span>
                            <span className="font-mono text-sm font-medium text-foreground">
                                {remainingTonnage} T
                            </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Utilisez la recherche ci-dessus pour trouver une allocation active.
                      </p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground">Numéro BL</span>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, bl_number: generateBL()})}
                          className="text-xs flex items-center gap-1 text-primary hover:underline"
                        >
                          <RefreshCw size={12} /> Régénérer
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
                    <TruckIcon size={14} /> Détails Transport
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Camion (Immatriculation)</label>
                    <select 
                      required
                      className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-foreground"
                      value={formData.truck_id || ''}
                      onChange={(e) => handleTruckChange(e.target.value)}
                    >
                       <option value="">Sélectionner Camion...</option>
                       {trucks.map(t => (
                         <option key={t.id} value={t.id}>{t.plate_number} ({t.capacity_tonnes}T)</option>
                       ))}
                    </select>
                  </div>

                  {/* Driver Field - Read Only based on Truck */}
                  <div className="relative">
                     <label className="block text-sm font-medium text-foreground mb-1">Chauffeur</label>
                     {/* Dashed border effect container */}
                     <div className="relative">
                        <input 
                          type="text"
                          readOnly
                          disabled
                          placeholder="Sélectionnez un camion..."
                          className="w-full rounded-lg border border-input bg-muted/50 p-2 pl-9 text-sm text-foreground focus:outline-none cursor-not-allowed"
                          value={assignedDriverName}
                        />
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     </div>
                     {!assignedDriverName && formData.truck_id && (
                       <p className="text-xs text-amber-500 mt-1">Ce camion n'a pas de chauffeur assigné.</p>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Charge (Tonnes)</label>
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
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  <Save size={16} />
                  {formData.id ? "Mettre à jour" : "Confirmer Expédition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
