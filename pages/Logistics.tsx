import { useEffect, useState, useMemo, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { DeliveryView, Truck, Driver, AllocationView, Project, Region, Department } from '../types';
import { Plus, Search, FileText, MapPin, Truck as TruckIcon, Edit2, Trash2, RefreshCw, X, Save, Calendar, User, Layers, Filter, ChevronDown, ChevronRight, Receipt, Info, Target, Activity, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';
import { useAuth } from '../contexts/AuthContext';

type GroupBy = 'none' | 'truck' | 'commune' | 'region' | 'date';

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
  
  // Grouping State - DEFAULT TO DATE
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  
  // Accordion State - Open first group by default
  const [activeAccordionPhases, setActiveAccordionPhases] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Modal Filter State
  const [modalPhaseFilter, setModalPhaseFilter] = useState<string>('all');
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [del, tr, dr, al, proj, reg, dep, pay] = await Promise.all([
        db.getDeliveriesView(),
        db.getTrucks(),
        db.getDrivers(),
        db.getAllocationsView(),
        db.getProjects(),
        db.getRegions(),
        db.getDepartments(),
        db.getPayments()
      ]);

      const deliveriesWithFees = del.map(d => {
        const payment = pay.find(p => p.delivery_id === d.id);
        const total_fees = payment ? (
          (Number(payment.road_fees) || 0) +
          (Number(payment.personal_fees) || 0) +
          (Number(payment.other_fees) || 0) +
          (Number(payment.overweigh_fees) || 0) +
          (Number(payment.fuel_cost) || 0) +
          (Number(payment.loading_cost) || 0) +
          (Number(payment.unloading_cost) || 0)
        ) : 0;
        return { ...d, total_fees };
      });

      setDeliveries(deliveriesWithFees);
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
         if (groupBy === 'date') key = d.delivery_date ? new Date(d.delivery_date).toLocaleDateString('fr-FR') : 'Date Inconnue';
         if (!subGroupMap[key]) subGroupMap[key] = [];
         subGroupMap[key].push(d);
       });
       const subGroups = Object.entries(subGroupMap).map(([key, items]) => ({
         key,
         items,
         totalLoad: items.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0)
       })).sort((a, b) => {
         if (groupBy === 'date') {
           const dateA = a.key.split('/').reverse().join('-');
           const dateB = b.key.split('/').reverse().join('-');
           return dateB.localeCompare(dateA);
         }
         return b.totalLoad - a.totalLoad;
       });
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

  const getPhaseColor = (num: number) => {
    const colors = [
      { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200' },
      { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200' },
      { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200' },
      { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200' },
      { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-200' },
      { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-200' },
    ];
    return colors[(num - 1) % colors.length] || colors[0];
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
          disabled={isVisitor}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nouvelle Expédition
        </button>
      </div>

      {/* Main Filter Toolbar */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher Camion, Date, Opérateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-col gap-2 flex-[2] w-full">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setMainPhaseFilter('all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${mainPhaseFilter === 'all' ? 'bg-primary text-white border-primary shadow-md' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
              >
                Toutes les Phases
              </button>
              {visibleProjects.map(p => {
                const phaseColor = getPhaseColor(p.numero_phase);
                const isActive = mainPhaseFilter === p.id;
                return (
                  <button 
                    key={p.id}
                    onClick={() => setMainPhaseFilter(p.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${isActive ? `${phaseColor.bg} ${phaseColor.text} ${phaseColor.border} shadow-md` : `bg-background text-muted-foreground border-border hover:${phaseColor.border}/50`}`}
                  >
                    Phase {p.numero_phase}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 whitespace-nowrap flex items-center gap-1">
               <Layers size={14} /> Grouper par:
             </span>
             <button onClick={() => setGroupBy('date')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'date' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Date</button>
             <button onClick={() => setGroupBy('truck')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'truck' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Camion</button>
             <button onClick={() => setGroupBy('commune')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'commune' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Commune</button>
             <button onClick={() => setGroupBy('region')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${groupBy === 'region' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted text-muted-foreground border-border'}`}>Région</button>
             {groupBy !== 'none' && (
               <button onClick={() => setGroupBy('none')} className="px-2 py-1.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
             )}
          </div>
      </div>

      <div className="accordion accordion-shadow *:accordion-item-active:shadow-md space-y-4">
        {groupedDeliveries.length === 0 && (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
             {searchTerm || mainPhaseFilter !== 'all' ? 'Aucun résultat.' : 'Aucune expédition trouvée.'}
          </div>
        )}
        
        {groupedDeliveries.map((projectGroup) => {
          return (
            <div key={projectGroup.phase} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <div className="h-0.5 flex-1 bg-border/50"></div>
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Target size={14} /> {projectGroup.phase}
                </h2>
                <div className="h-0.5 flex-1 bg-border/50"></div>
              </div>

              {projectGroup.subGroups.map((subGroup) => {
                const accordionId = `${projectGroup.phase}-${subGroup.key}`;
                const isOpen = activeAccordionPhases.has(accordionId);
                
                // Set first one open if none are active? No, let's keep user state
                
                return (
                  <div key={subGroup.key} className={`accordion-item ${isOpen ? 'active' : ''}`} id={accordionId}>
                    <button 
                      onClick={() => toggleAccordion(accordionId)}
                      className="accordion-toggle inline-flex items-center justify-between text-start w-full bg-card p-4 rounded-xl border border-border shadow-soft-sm hover:shadow-md transition-all"
                      aria-expanded={isOpen}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          {groupBy === 'date' ? <Calendar size={24} /> : 
                           groupBy === 'truck' ? <TruckIcon size={24} /> :
                           groupBy === 'commune' ? <MapPin size={24} /> :
                           <Layers size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm uppercase tracking-wide">{subGroup.key}</p>
                          <p className="text-xs text-muted-foreground font-normal">
                             {subGroup.items.length} {subGroup.items.length > 1 ? 'Livraisons' : 'Livraison'} • <span className="font-mono font-bold text-primary">{subGroup.totalLoad.toFixed(2)} T</span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`size-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    
                    <div className={`accordion-content w-full overflow-hidden transition-all duration-300 ${!isOpen ? 'max-h-0' : 'max-h-[2000px] mt-2'}`}>
                      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-inner bg-muted/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-secondary/30">
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">N° BL</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transport</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Charge</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Frais</th>
                                <th className="px-4 py-3 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {subGroup.items.map((del) => (
                                <tr key={del.id} className="hover:bg-primary/5 transition-colors group">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                                        <FileText size={14} className="text-muted-foreground" />
                                      </div>
                                      <span className="font-mono font-bold text-sm text-foreground">{del.bl_number}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-foreground">{del.operator_name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium"><MapPin size={10} /> {del.commune_name}</span>
                                        {del.declaration_code && (
                                          <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            {del.declaration_code}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-mono font-bold text-foreground">{del.truck_plate || '-'}</span>
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{del.driver_name || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                                      {del.tonnage_loaded} T
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <span className="text-sm font-bold text-amber-600 font-mono">
                                      {del.total_fees?.toLocaleString()} F
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => goToExpenses(del.bl_number)} className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors" title="Note de Frais"><Receipt size={16} /></button>
                                      {!isVisitor && (
                                        <>
                                          <button onClick={() => handleOpenModal(del)} className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors" title="Modifier"><Edit2 size={16} /></button>
                                          <button onClick={() => handleDelete(del.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Supprimer"><Trash2 size={16} /></button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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