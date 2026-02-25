import { useEffect, useState, useMemo, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { DeliveryView, Truck, Driver, AllocationView, Project, Region, Department } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon, Edit2, Trash2, RefreshCw, X, Save, Calendar, User, Layers, Filter, ChevronDown, ChevronRight, Receipt, Info, Target, Activity, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';
import { useAuth } from '../contexts/AuthContext';

type GroupBy = 'none' | 'truck' | 'commune' | 'region';

export const Logistics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allocations, setAllocations] = useState<AllocationView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [loading, setLoading] = useState(true);
  const isVisitor = user?.role === 'VISITOR';
  
  // Page Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [mainPhaseFilter, setMainPhaseFilter] = useState<string>('all');
  
  // Grouping State
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  
  // Accordion State - Empty by default (closed)
  const [activeAccordionPhases, setActiveAccordionPhases] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Modal Filter State
  const [modalPhaseFilter, setModalPhaseFilter] = useState<string>('all');
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [del, tr, dr, al, proj, reg, dep] = await Promise.all([
        db.getDeliveriesView(),
        db.getTrucks(),
        db.getDrivers(),
        db.getAllocationsView(),
        db.getProjects(),
        db.getRegions(),
        db.getDepartments()
      ]);
      setDeliveries(del);
      setTrucks(tr);
      setDrivers(dr);
      setAllocations(al); 
      setProjects(proj);
      setRegions(reg);
      setDepartments(dep);
      return { allocations: al, projects: proj, trucks: tr };
    } catch (e) {
      console.error(e);
      return { allocations: [], projects: [], trucks: [] };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { allocations: loadedAllocations, projects: loadedProjects, trucks: loadedTrucks } = await fetchData();
      
      // Check URL params for auto-open action
      const params = new URLSearchParams(location.search);
      if (params.get('action') === 'new' && !isVisitor) {
        const initialData: any = {
           bl_number: generateBL(),
           delivery_date: new Date().toISOString().split('T')[0],
           tonnage_loaded: 0
        };

        const allocId = params.get('allocationId');
        if (allocId) {
           const targetAlloc = loadedAllocations.find(a => a.id === allocId);
           if (targetAlloc) {
             initialData.allocation_id = targetAlloc.id;
             setModalPhaseFilter(targetAlloc.project_id);
           }
        }

        const truckId = params.get('truckId');
        if (truckId) {
           initialData.truck_id = truckId;
           const t = loadedTrucks.find(truck => truck.id === truckId);
           if (t && t.driver_id) initialData.driver_id = t.driver_id;
        }

        setFormData(initialData);
        setIsModalOpen(true);
        navigate('/logistics/dispatch', { replace: true });
      }
    };
    init();
  }, [location.search, isVisitor]);

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
    if (isVisitor) return;
    if (delivery) {
      setFormData({
        ...delivery,
        delivery_date: delivery.delivery_date ? new Date(delivery.delivery_date).toISOString().split('T')[0] : ''
      });
      if (delivery.project_id) setModalPhaseFilter(delivery.project_id);
    } else {
      setFormData({
        bl_number: generateBL(),
        delivery_date: new Date().toISOString().split('T')[0],
        tonnage_loaded: 0
      });
      setModalPhaseFilter('all');
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette expédition ?')) return;
    try {
      await db.deleteItem('deliveries', id);
      fetchData();
    } catch (e) {
      alert("Erreur lors de la suppression de l'élément.");
    }
  };

  const goToExpenses = (blNumber: string) => {
    navigate(`/logistics/expenses?search=${blNumber}`);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    if (!formData.allocation_id) {
       alert("L'allocation est requise");
       return;
    }
    if (Number(formData.tonnage_loaded) <= 0) {
       alert("La charge doit être supérieure à 0");
       return;
    }

    try {
      const dbPayload: any = {
        allocation_id: formData.allocation_id,
        bl_number: formData.bl_number,
        truck_id: formData.truck_id || null, 
        driver_id: formData.driver_id || null,
        tonnage_loaded: Number(formData.tonnage_loaded),
        delivery_date: formData.delivery_date,
        declaration_code: isExportProject ? declarationCode : null
      };

      if (formData.id) {
        await db.updateItem('deliveries', formData.id, dbPayload);
      } else {
        const result = await db.createItem('deliveries', dbPayload);
        if (result && result.length > 0 && dbPayload.truck_id) {
           const newDelivery = result[0];
           await db.createItem('payments', {
              delivery_id: newDelivery.id,
              truck_id: dbPayload.truck_id,
              road_fees: 0,
              personal_fees: 0,
              other_fees: 0,
              overweigh_fees: 0,
              fuel_quantity: 0,
              fuel_cost: 0
           });
           
           const currentTruck = trucks.find(t => t.id === dbPayload.truck_id);
           if (currentTruck && currentTruck.status === 'ON_SITE') {
              await db.updateItem('trucks', currentTruck.id, { status: 'IN_TRANSIT' });
           }
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Save Error:", error);
      const msg = error.details || error.hint || error.message || JSON.stringify(error);
      alert(`Échec de l'enregistrement: ${msg}`);
    }
  };

  const handleTruckChange = (truckId: string) => {
    const selectedTruck = trucks.find(t => t.id === truckId);
    setFormData((prev: any) => ({
      ...prev,
      truck_id: truckId,
      driver_id: selectedTruck?.driver_id || prev.driver_id
    }));
  };

  const handleAllocationChange = (val: string) => {
    const selectedAlloc = allocations.find(a => a.id === val);
    setFormData({ ...formData, allocation_id: val });
    if (selectedAlloc && selectedAlloc.project_id) {
      setModalPhaseFilter(selectedAlloc.project_id);
    }
  };
  
  const visibleProjects = useMemo(() => projects.filter(p => p.project_visibility !== false), [projects]);

  // Grouping & Filtering Logic
  const groupedDeliveries = useMemo(() => {
    const filtered = deliveries.filter(d => {
      if (mainPhaseFilter !== 'all') {
        if (d.project_id !== mainPhaseFilter) return false;
      }
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

    const projectGroups: Record<string, DeliveryView[]> = {};
    filtered.forEach(d => {
      const phase = d.project_phase || 'Phase Non Assignée';
      if (!projectGroups[phase]) projectGroups[phase] = [];
      projectGroups[phase].push(d);
    });

    const sortedPhaseKeys = Object.keys(projectGroups).sort((a, b) => 
       b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
    );

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
       })).sort((a, b) => b.totalLoad - a.totalLoad);
       return { phase, subGroups };
    });
  }, [deliveries, groupBy, mainPhaseFilter, searchTerm]);

  const selectedAllocation = allocations.find(a => a.id === formData.allocation_id);
  const selectedProjectObj = useMemo(() => projects.find(p => p.id === selectedAllocation?.project_id), [projects, selectedAllocation]);
  const isExportProject = selectedProjectObj?.export_statut === true;

  const declarationCode = useMemo(() => {
    if (!selectedAllocation || !isExportProject) return null;
    const reg = regions.find(r => r.id === selectedAllocation.region_id);
    const dep = departments.find(d => d.id === selectedAllocation.department_id);
    if (!reg || !dep) return null;
    return `${reg.code}-${dep.code}`;
  }, [selectedAllocation, isExportProject, regions, departments]);

  const allocationOptions: Option[] = useMemo(() => {
    return allocations
      .filter(a => {
        if (modalPhaseFilter !== 'all') {
           return a.project_id === modalPhaseFilter;
        }
        // If "all" is selected in modal, still only show visible allocations unless editing an old one
        const proj = projects.find(p => p.id === a.project_id);
        return proj?.project_visibility !== false || a.id === formData.allocation_id;
      })
      .map(a => ({
        value: a.id,
        label: a.operator_name,
        subLabel: `${a.region_name} • ${a.commune_name} ${a.project_phase ? `(${a.project_phase})` : ''}`
      }));
  }, [allocations, modalPhaseFilter, projects, formData.allocation_id]);
  
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
          disabled={isVisitor}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nouvelle Expédition
        </button>
      </div>

      {/* Main Filter Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
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

          <div className="flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Filtre:
              </span>
              <form className="filter">
                <input className="btn btn-square" type="reset" value="×" onClick={() => setMainPhaseFilter('all')} />
                <input className="btn" type="radio" name="logistic-phase" aria-label="Tous" checked={mainPhaseFilter === 'all'} onChange={() => setMainPhaseFilter('all')} />
                {visibleProjects.map(p => (
                  <input key={p.id} className="btn" type="radio" name="logistic-phase" aria-label={`Phase ${p.numero_phase}`} checked={mainPhaseFilter === p.id} onChange={() => setMainPhaseFilter(p.id)} />
                ))}
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 whitespace-nowrap flex items-center gap-1">
               <Layers size={14} /> Grouper par:
             </span>
             <button onClick={() => setGroupBy('truck')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'truck' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Camion</button>
             <button onClick={() => setGroupBy('commune')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'commune' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Commune</button>
             <button onClick={() => setGroupBy('region')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'region' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Région</button>
             {groupBy !== 'none' && (
               <button onClick={() => setGroupBy('none')} className="px-2 py-1.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
             )}
          </div>
      </div>

      <div className="accordion flex flex-col gap-4 min-h-[500px]">
        {groupedDeliveries.length === 0 && (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
             {searchTerm || mainPhaseFilter !== 'all' ? 'Aucun résultat.' : 'Aucune expédition trouvée.'}
          </div>
        )}
        
        {groupedDeliveries.map((projectGroup) => {
           const isOpen = activeAccordionPhases.has(projectGroup.phase);
           return (
            <div key={projectGroup.phase} className="accordion-item">
              <button onClick={() => toggleAccordion(projectGroup.phase)} className="accordion-toggle" aria-expanded={isOpen}>
                <div className="flex items-center gap-4">
                  <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}><ChevronRight size={20} className="text-muted-foreground" /></span>
                  <span className="text-lg font-bold">{projectGroup.phase}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded">
                  {projectGroup.subGroups.reduce((acc, sub) => acc + sub.items.length, 0)} Livraisons
                </span>
              </button>
              
              <div className={`accordion-content ${!isOpen ? 'hidden' : ''}`}>
                 <div className="w-full overflow-x-auto">
                    <table className="table table-striped">
                      <thead className="bg-primary/5 border-b-2 border-primary/20">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider w-32">N° BL</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Destination</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Transport</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Charge</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                         {projectGroup.subGroups.map((subGroup) => (
                           <Fragment key={subGroup.key}>
                              {groupBy !== 'none' && (
                                <tr className="bg-muted/30">
                                   <td colSpan={6} className="px-6 py-2 text-xs font-medium text-foreground border-b border-border/50 flex items-center justify-between">
                                      <span className="flex items-center gap-2 uppercase tracking-wide font-bold">{subGroup.key}</span>
                                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">Total: {subGroup.totalLoad.toFixed(2)} T</span>
                                   </td>
                                </tr>
                              )}
                              {subGroup.items.map((del) => (
                                <tr key={del.id} className="hover:bg-muted/50 transition-colors">
                                  <td className="px-4 py-3"><span className="font-bold font-mono text-foreground text-sm">{del.bl_number}</span></td>
                                  <td className="px-4 py-3"><div className="flex flex-col"><span className="text-sm font-medium text-foreground">{del.operator_name}</span><span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {del.commune_name}, {del.region_name}</span></div></td>
                                  <td className="px-4 py-3"><div className="flex flex-col"><p className="text-sm font-mono font-medium text-foreground">{del.truck_plate || 'Aucun'}</p><p className="text-xs text-muted-foreground">{del.driver_name || 'Aucun'}</p></div></td>
                                  <td className="px-4 py-3"><span className="text-sm font-bold text-foreground bg-muted px-2 py-1 rounded">{del.tonnage_loaded} T</span></td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">{del.delivery_date ? new Date(del.delivery_date).toLocaleDateString() : '-'}</td>
                                  <td className="px-4 py-3 text-right">
                                     <div className="flex justify-end gap-1">
                                        <button onClick={() => goToExpenses(del.bl_number)} className="btn btn-circle btn-text btn-sm text-amber-600 hover:bg-amber-50" title="Voir Note de Frais"><Receipt size={16} /></button>
                                        <button onClick={() => handleOpenModal(del)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title={isVisitor ? "Lecture seule" : "Modifier"}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(del.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm btn-text-error disabled:opacity-30 disabled:cursor-not-allowed" title={isVisitor ? "Lecture seule" : "Supprimer"}><Trash2 size={16} /></button>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><MapPin size={14} /> Affectation</h4>
                     <select 
                       className="text-[10px] bg-muted border-none rounded px-1.5 py-0.5 outline-none font-bold uppercase"
                       value={modalPhaseFilter}
                       onChange={e => setModalPhaseFilter(e.target.value)}
                     >
                       <option value="all">Toutes Phases Actives</option>
                       {visibleProjects.map(p => <option key={p.id} value={p.id}>Phase {p.numero_phase}</option>)}
                     </select>
                  </div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sélectionner Allocation</label>
                  <AdvancedSelect 
                    options={allocationOptions} 
                    value={formData.allocation_id || ''} 
                    onChange={handleAllocationChange} 
                    placeholder="Rechercher par Nom, Région..." 
                    required 
                  />
                  
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">Numéro BL</span>
                    </div>
                    <input 
                      type="text" 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-lg font-mono font-bold bg-background text-foreground tracking-wide" 
                      value={formData.bl_number || ''} 
                      onChange={(e) => setFormData({...formData, bl_number: e.target.value.toUpperCase()})} 
                    />
                  </div>

                  {/* Allocation Status Info Card - Moved Below Numéro BL */}
                  {formData.allocation_id && selectedAllocation && (
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <h4 className="text-xs font-black uppercase text-blue-700 dark:text-blue-400 tracking-widest flex items-center gap-2">
                         <Info size={14} /> État de l'Allocation
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[10px] text-blue-600/70 uppercase font-bold tracking-tight">Cible Totale</p>
                            <p className="text-lg font-black text-blue-900 dark:text-blue-100 font-mono leading-none mt-1">
                               {selectedAllocation.target_tonnage.toLocaleString()} T
                            </p>
                         </div>
                         <div>
                            <p className="text-[10px] text-blue-600/70 uppercase font-bold tracking-tight">Livré à ce jour</p>
                            <p className="text-lg font-black text-emerald-600 font-mono leading-none mt-1">
                               {selectedAllocation.delivered_tonnage.toLocaleString()} T
                            </p>
                         </div>
                         <div className="col-span-2 pt-2 border-t border-blue-100/50">
                            <div className="flex justify-between items-center mb-1">
                               <p className="text-[10px] text-blue-600/70 uppercase font-bold tracking-tight">Reliquat (Reste à livrer)</p>
                               <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200">
                                  {Math.min(100, Math.round((selectedAllocation.delivered_tonnage / (selectedAllocation.target_tonnage || 1)) * 100))}%
                               </span>
                            </div>
                            <p className="text-2xl font-black text-primary font-mono tracking-tighter">
                               {Math.max(0, selectedAllocation.target_tonnage - selectedAllocation.delivered_tonnage).toFixed(2)} T
                            </p>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                   <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><TruckIcon size={14} /> Transport</h4>
                   <label className="block text-sm font-medium text-foreground mb-1">Camion</label>
                   <AdvancedSelect options={truckOptions} value={formData.truck_id || ''} onChange={(val) => handleTruckChange(val)} placeholder="Rechercher Camion..." />
                   <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground mb-1">Charge (T)</label><input type="number" required min="0.1" step="0.01" className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.tonnage_loaded || ''} onChange={(e) => setFormData({...formData, tonnage_loaded: e.target.value})} /></div><div><label className="block text-sm font-medium text-foreground mb-1">Date</label><input type="date" required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.delivery_date || ''} onChange={(e) => setFormData({...formData, delivery_date: e.target.value})} /></div></div>

                   {/* NEW SECTION: Export Declaration Details */}
                   {formData.allocation_id && isExportProject && (
                     <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 space-y-3 animate-in fade-in zoom-in-95 duration-200 mt-4">
                        <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-widest flex items-center gap-2">
                           <ShieldCheck size={14} /> Détails Export
                        </h4>
                        <div className="bg-card border border-amber-200/50 rounded-lg p-3 shadow-soft-sm">
                           <p className="text-[10px] text-amber-600/70 uppercase font-bold tracking-tight mb-1">Code Déclaration</p>
                           <div className="flex items-center justify-between">
                              <p className="text-xl font-black text-amber-900 dark:text-amber-100 font-mono">
                                 {declarationCode || '---'}
                              </p>
                              <div className="px-2 py-0.5 bg-amber-100 dark:bg-amber-800 rounded text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                                 Automatique
                              </div>
                           </div>
                           <p className="text-[10px] text-muted-foreground mt-2 italic">
                              Généré à partir des codes Région ({regions.find(r => r.id === selectedAllocation?.region_id)?.code}) et Département ({departments.find(d => d.id === selectedAllocation?.department_id)?.code}).
                           </p>
                        </div>
                     </div>
                   )}
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border mt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                   <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"><Save size={16} /> Enregistrer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};