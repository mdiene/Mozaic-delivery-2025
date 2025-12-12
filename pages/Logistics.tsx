
import { useEffect, useState, useMemo, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { DeliveryView, Truck, Driver, AllocationView, Project } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon, Edit2, Trash2, RefreshCw, X, Save, Calendar, User, Layers, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';

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
  
  // Page Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [mainPhaseFilter, setMainPhaseFilter] = useState<string>('all');
  
  // Grouping State
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  
  // Accordion State
  const [activeAccordionPhases, setActiveAccordionPhases] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Modal Filter State
  const [modalPhaseFilter, setModalPhaseFilter] = useState<string>('all');
  
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
      return { allocations: al, projects: proj };
    } catch (e) {
      console.error(e);
      return { allocations: [], projects: [] };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { allocations: loadedAllocations, projects: loadedProjects } = await fetchData();
      
      // Auto-select Phase 3 if available
      const phase3 = loadedProjects.find(p => p.numero_phase === 3);
      if (phase3) {
        setMainPhaseFilter(phase3.id);
      }

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
          setIsModalOpen(true);
          
          // Clear URL params to prevent re-opening on reload
          navigate('/logistics', { replace: true });
        }
      }
    };
    init();
  }, [location.search]);

  // Expand all phases by default when data loads
  useEffect(() => {
     if (deliveries.length > 0) {
        const phases = new Set(deliveries.map(d => d.project_phase || 'Phase Non Assignée'));
        setActiveAccordionPhases(phases);
     }
  }, [deliveries]);

  const toggleAccordion = (phase: string) => {
    const newSet = new Set(activeAccordionPhases);
    if (newSet.has(phase)) {
      newSet.delete(phase);
    } else {
      newSet.add(phase);
    }
    setActiveAccordionPhases(newSet);
  };

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

  const handleSave = async (e: FormEvent) => {
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

  // Grouping & Filtering Logic
  const groupedDeliveries = useMemo(() => {
    // 0. Filter Deliveries first
    const filtered = deliveries.filter(d => {
      // Phase Filter
      if (mainPhaseFilter !== 'all') {
        if (d.project_id !== mainPhaseFilter) return false;
      }

      // Search Filter
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const dateStr = d.delivery_date ? new Date(d.delivery_date).toLocaleDateString() : '';
        return (
          (d.bl_number && d.bl_number.toLowerCase().includes(lowerTerm)) ||
          (d.operator_name && d.operator_name.toLowerCase().includes(lowerTerm)) ||
          (d.truck_plate && d.truck_plate.toLowerCase().includes(lowerTerm)) ||
          dateStr.includes(lowerTerm)
        );
      }

      return true;
    });

    // 1. Group by Project Phase (Always)
    const projectGroups: Record<string, DeliveryView[]> = {};
    
    filtered.forEach(d => {
      const phase = d.project_phase || 'Phase Non Assignée';
      if (!projectGroups[phase]) projectGroups[phase] = [];
      projectGroups[phase].push(d);
    });

    // 2. Sort Project Groups (Most Recent/Highest Phase First)
    // We assume standard string sort descending works for "Phase 3" vs "Phase 1"
    const sortedPhaseKeys = Object.keys(projectGroups).sort((a, b) => 
       b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
    );

    // 3. Apply Sub-grouping
    return sortedPhaseKeys.map(phase => {
       const phaseItems = projectGroups[phase];
       
       if (groupBy === 'none') {
         return {
           phase,
           subGroups: [{
              key: 'All',
              items: phaseItems,
              totalLoad: phaseItems.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0)
           }]
         };
       }

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

  }, [deliveries, groupBy, mainPhaseFilter, searchTerm]);

  const selectedAllocation = allocations.find(a => a.id === formData.allocation_id);
  const selectedTruck = trucks.find(t => t.id === formData.truck_id);
  const assignedDriverName = selectedTruck?.driver_name || (formData.driver_id ? drivers.find(d => d.id === formData.driver_id)?.name : '');

  // Calculate real-time stats for the selected allocation
  const calculatedDelivered = useMemo(() => {
    if (!formData.allocation_id) return 0;
    return deliveries
      .filter(d => d.allocation_id === formData.allocation_id)
      .reduce((sum, d) => sum + Number(d.tonnage_loaded || 0), 0);
  }, [formData.allocation_id, deliveries]);

  const targetTonnage = selectedAllocation?.target_tonnage || 0;
  const remainingTonnage = targetTonnage - calculatedDelivered;

  // Transform filtered allocations for AdvancedSelect
  const allocationOptions: Option[] = useMemo(() => {
    return allocations
      .filter(a => {
        // 1. Filter by Project Phase
        if (modalPhaseFilter !== 'all' && a.project_id !== modalPhaseFilter) return false;
        return true;
      })
      .map(a => ({
        value: a.id,
        label: a.operator_name,
        subLabel: `${a.region_name} • ${a.commune_name} ${a.project_phase ? `(${a.project_phase})` : ''}`
      }));
  }, [allocations, modalPhaseFilter]);
  
  // Transform trucks for AdvancedSelect
  const truckOptions: Option[] = useMemo(() => {
    return trucks.map(t => ({
      value: t.id,
      label: t.plate_number,
      subLabel: t.driver_name ? `Chauffeur: ${t.driver_name}` : 'Non assigné'
    }));
  }, [trucks]);

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

      {/* Main Filter Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher Camion, Date, Opérateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Phase Filters - Horizontal Scroll */}
          <div className="flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Filtre:
              </span>
              <form className="filter">
                <input 
                  className="btn btn-square" 
                  type="reset" 
                  value="×" 
                  onClick={() => setMainPhaseFilter('all')}
                  title="Réinitialiser"
                />
                <input 
                  className="btn" 
                  type="radio" 
                  name="logistic-phase" 
                  aria-label="Tous"
                  checked={mainPhaseFilter === 'all'}
                  onChange={() => setMainPhaseFilter('all')}
                />
                {projects.map(p => (
                  <input
                    key={p.id}
                    className="btn" 
                    type="radio" 
                    name="logistic-phase" 
                    aria-label={`Phase ${p.numero_phase}`}
                    checked={mainPhaseFilter === p.id}
                    onChange={() => setMainPhaseFilter(p.id)}
                  />
                ))}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Grouping Options */}
      <div className="flex justify-end">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 whitespace-nowrap flex items-center gap-1">
               <Layers size={14} /> Grouper par:
             </span>
             <button 
               onClick={() => setGroupBy('truck')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'truck' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}
             >
               Camion
             </button>
             <button 
               onClick={() => setGroupBy('commune')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'commune' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}
             >
               Commune
             </button>
             <button 
               onClick={() => setGroupBy('region')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'region' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}
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

      {/* Content Area - List of Accordions */}
      <div className="accordion flex flex-col gap-4 min-h-[500px]">
        {groupedDeliveries.length === 0 && (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
             {searchTerm || mainPhaseFilter !== 'all' 
                ? 'Aucun résultat ne correspond à votre recherche.' 
                : 'Aucune expédition trouvée. Créez-en une pour commencer.'
             }
          </div>
        )}
        
        {groupedDeliveries.map((projectGroup) => {
           const isOpen = activeAccordionPhases.has(projectGroup.phase);
           
           return (
            <div key={projectGroup.phase} className="accordion-item">
              {/* Accordion Toggle */}
              <button 
                onClick={() => toggleAccordion(projectGroup.phase)}
                className="accordion-toggle"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-4">
                  <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
                    <ChevronRight size={20} className="text-muted-foreground" />
                  </span>
                  <span className="text-lg font-bold">{projectGroup.phase}</span>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded">
                      {projectGroup.subGroups.reduce((acc, sub) => acc + sub.items.length, 0)} Livraisons
                   </span>
                </div>
              </button>
              
              {/* Accordion Content */}
              <div className={`accordion-content ${!isOpen ? 'hidden' : ''}`}>
                 <div className="w-full overflow-x-auto">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th className="w-32">N° BL</th>
                          <th>Destination</th>
                          <th>Transport</th>
                          <th>Charge</th>
                          <th>Date</th>
                          <th className="text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                         {projectGroup.subGroups.map((subGroup) => (
                           <Fragment key={subGroup.key}>
                              {/* Sub-Group Header (Only if grouping is active) */}
                              {groupBy !== 'none' && (
                                <tr className="bg-muted/30">
                                   <td colSpan={6} className="px-6 py-2 text-xs font-medium text-foreground border-b border-border/50 pl-4 flex items-center justify-between">
                                      <span className="flex items-center gap-2">
                                         {groupBy === 'truck' && <TruckIcon size={14} className="text-muted-foreground" />}
                                         {groupBy === 'commune' && <MapPin size={14} className="text-muted-foreground" />}
                                         {groupBy === 'region' && <MapPin size={14} className="text-muted-foreground" />}
                                         <span className="uppercase tracking-wide font-bold">{subGroup.key}</span>
                                      </span>
                                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                                         Total: {subGroup.totalLoad.toFixed(2)} T
                                      </span>
                                   </td>
                                </tr>
                              )}

                              {/* Items */}
                              {subGroup.items.map((del) => (
                                <tr key={del.id} className="hover:bg-muted/50 transition-colors">
                                  <td>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-primary/10 rounded text-primary">
                                         <FileText size={14} />
                                      </div>
                                      <span className="font-bold font-mono text-foreground text-sm">{del.bl_number}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">{del.operator_name}</span>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin size={10} /> {del.commune_name}, {del.region_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
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
                                  <td>
                                    <span className="text-sm font-bold text-foreground bg-muted px-2 py-1 rounded">{del.tonnage_loaded} T</span>
                                  </td>
                                  <td className="text-sm text-muted-foreground">
                                    {del.delivery_date ? new Date(del.delivery_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="text-right">
                                     <div className="flex justify-end gap-1">
                                        <button 
                                          onClick={() => handleOpenModal(del)}
                                          className="btn btn-circle btn-text btn-sm text-blue-600"
                                          title="Modifier"
                                          aria-label="Edit"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(del.id)}
                                          className="btn btn-circle btn-text btn-sm btn-text-error"
                                          title="Supprimer"
                                          aria-label="Delete"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                     </div>
                                  </td>
                                </tr>
                              ))}
                           </Fragment>
                         ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
           );
        })}
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
                     <form className="filter">
                        <input 
                           className="btn btn-square" 
                           type="reset" 
                           value="×" 
                           onClick={() => setModalPhaseFilter('all')}
                           title="Réinitialiser"
                        />
                        <input 
                           className="btn" 
                           type="radio" 
                           name="modal-phase" 
                           aria-label="Toutes"
                           checked={modalPhaseFilter === 'all'}
                           onChange={() => setModalPhaseFilter('all')}
                        />
                        {projects.map(p => (
                           <input
                              key={p.id}
                              className="btn" 
                              type="radio" 
                              name="modal-phase" 
                              aria-label={`Phase ${p.numero_phase}`}
                              checked={modalPhaseFilter === p.id}
                              onChange={() => setModalPhaseFilter(p.id)}
                           />
                        ))}
                     </form>
                  </div>

                  {/* Searchable Select for Allocation */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-1">Sélectionner Allocation / Opérateur</label>
                    <AdvancedSelect 
                      options={allocationOptions}
                      value={formData.allocation_id || ''}
                      onChange={(val) => setFormData({...formData, allocation_id: val})}
                      placeholder="Rechercher par Nom, Région..."
                      required
                    />
                    
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
                        className="w-full border border-input rounded-lg p-2 text-lg font-mono font-bold bg-background text-foreground tracking-wide"
                        value={formData.bl_number || ''}
                        onChange={(e) => setFormData({...formData, bl_number: e.target.value.toUpperCase()})}
                     />
                  </div>
                </div>

                {/* Right Column: Transport Details */}
                <div className="space-y-4">
                   <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                     <TruckIcon size={14} /> Transport
                   </h4>
                   
                   <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Camion</label>
                      <AdvancedSelect 
                        options={truckOptions}
                        value={formData.truck_id || ''}
                        onChange={(val) => handleTruckChange(val)}
                        placeholder="Rechercher Camion..."
                      />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Chauffeur</label>
                      <select 
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.driver_id || ''}
                        onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                      >
                         <option value="">Sélectionner Chauffeur...</option>
                         {drivers
                           .filter(d => !d.truck_id || (formData.truck_id && d.truck_id === formData.truck_id) || d.id === formData.driver_id)
                           .map(d => <option key={d.id} value={d.id}>{d.name} {d.truck_id ? '(Assigné)' : ''}</option>)
                         }
                      </select>
                      {selectedTruck && !selectedTruck.driver_id && !formData.driver_id && (
                         <p className="text-xs text-amber-600 mt-1">Attention: Aucun chauffeur assigné à ce camion.</p>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Charge (Tonnes)</label>
                        <input 
                           type="number"
                           required
                           min="0.1"
                           step="0.01"
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                           value={formData.tonnage_loaded || ''}
                           onChange={(e) => setFormData({...formData, tonnage_loaded: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                        <input 
                           type="date"
                           required
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                           value={formData.delivery_date || ''}
                           onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                        />
                      </div>
                   </div>

                   {/* Summary Box */}
                   <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-sm">
                      <div className="flex justify-between mb-1">
                         <span className="text-muted-foreground">Allocation:</span>
                         <span className="font-medium text-foreground truncate ml-2">{selectedAllocation?.operator_name || '-'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                         <span className="text-muted-foreground">Destination:</span>
                         <span className="font-medium text-foreground truncate ml-2">{selectedAllocation ? `${selectedAllocation.commune_name}, ${selectedAllocation.region_name}` : '-'}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800/50 mt-2">
                         <span className="font-bold text-foreground">A Livrer:</span>
                         <span className="font-bold text-primary">{formData.tonnage_loaded || 0} Tonnes</span>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border mt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                   <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                     <Save size={16} /> Enregistrer
                   </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
