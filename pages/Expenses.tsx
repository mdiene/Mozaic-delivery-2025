
import { useState, useEffect, useMemo, FormEvent, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/db';
import { EnrichedPayment, DeliveryView, Project } from '../types';
import { Search, Filter, Layers, X, Edit2, RotateCcw, Save, Truck, User, Fuel, Receipt, ShieldCheck, RefreshCw, Calendar, Minimize2, ChevronRight, MapPin, PackageOpen } from 'lucide-react';
import { AdvancedSelect } from '../components/AdvancedSelect';

export const Expenses = () => {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<EnrichedPayment>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterWagueOnly, setFilterWagueOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [minFeeFilter, setMinFeeFilter] = useState(0);
  const maxTotalFee = 500000; // Mock Max

  // Grouping
  const [groupBy, setGroupBy] = useState<'none' | 'truck_plate' | 'commune_name' | 'region_name'>('none');
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());

  // Local State for Fuel Calc in Modal
  const [fuelUnitPrice, setFuelUnitPrice] = useState(680); // Default to 680
  
  const dateRangeInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
       const [pay, del, proj] = await Promise.all([
          db.getPayments(),
          db.getDeliveriesView(),
          db.getProjects()
       ]);
       setPayments(pay);
       setDeliveries(del);
       setProjects(proj);
    } catch (e) {
       console.error(e);
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync Search Term from URL
  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch) {
      setSearchTerm(querySearch);
    }
  }, [searchParams]);

  // Initialize Flatpickr
  useEffect(() => {
    if (dateRangeInputRef.current && (window as any).flatpickr) {
      const fp = (window as any).flatpickr(dateRangeInputRef.current, {
        mode: 'range',
        dateFormat: "Y-m-d",
        onChange: (selectedDates: Date[]) => {
          if (selectedDates.length === 2) {
            setDateRange({ start: selectedDates[0], end: selectedDates[1] });
          } else {
            setDateRange({ start: null, end: null });
          }
        }
      });
      return () => fp.destroy();
    }
  }, []);

  const handleOpenModal = (payment?: EnrichedPayment) => {
     if (payment) {
        setFormData({ ...payment });
        // Try to infer unit price if quantity > 0
        if (payment.fuel_quantity > 0) {
           setFuelUnitPrice(Math.round(payment.fuel_cost / payment.fuel_quantity));
        } else {
           setFuelUnitPrice(680);
        }
     } else {
        // Find a delivery without payment or create new
        // Ideally we select a delivery first
        setFormData({});
        setFuelUnitPrice(680);
     }
     setIsModalOpen(true);
  };

  const handleDeliverySelect = (deliveryId: string) => {
    const selectedDelivery = deliveries.find(d => d.id === deliveryId);
    if (selectedDelivery) {
      const isInternal = selectedDelivery.truck_owner_type;
      
      setFormData(prev => ({
        ...prev,
        delivery_id: deliveryId,
        truck_id: selectedDelivery.truck_id,
        // If external (not internal), auto-fill label
        other_fees_label: !isInternal ? 'Forfait transporteur' : (prev.other_fees_label || ''),
        // Reset other fields if external to avoid confusion, though UI disables them
        fuel_quantity: !isInternal ? 0 : prev.fuel_quantity,
        fuel_cost: !isInternal ? 0 : prev.fuel_cost,
        road_fees: !isInternal ? 0 : prev.road_fees,
        personal_fees: !isInternal ? 0 : prev.personal_fees,
        overweigh_fees: !isInternal ? 0 : prev.overweigh_fees,
        // Loading costs are KEPT/Enabled for external
        loading_cost: prev.loading_cost || 0,
        unloading_cost: prev.unloading_cost || 0
      }));
    }
  };

  const handleFuelChange = (quantity: number, price: number) => {
     setFormData(prev => ({
        ...prev,
        fuel_quantity: quantity,
        fuel_cost: quantity * price
     }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.delivery_id || !formData.truck_id) {
      alert("Veuillez sélectionner une livraison valide.");
      return;
    }

    try {
      const payload = {
        delivery_id: formData.delivery_id,
        truck_id: formData.truck_id,
        road_fees: Number(formData.road_fees) || 0,
        personal_fees: Number(formData.personal_fees) || 0,
        other_fees: Number(formData.other_fees) || 0,
        other_fees_label: formData.other_fees_label,
        overweigh_fees: Number(formData.overweigh_fees) || 0,
        fuel_quantity: Number(formData.fuel_quantity) || 0,
        fuel_cost: Number(formData.fuel_cost) || 0,
        loading_cost: Number(formData.loading_cost) || 0,
        unloading_cost: Number(formData.unloading_cost) || 0,
        date_updated: new Date().toISOString()
      };

      if (formData.id) {
        await db.updateItem('payments', formData.id, payload);
      } else {
        await db.createItem('payments', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement: " + e.message);
    }
  };

  const handleReset = async () => {
    if (!formData.id) return;
    if (!confirm('Voulez-vous vraiment réinitialiser TOUS les montants de cette note à zéro ?')) return;
    try {
      await db.updateItem('payments', formData.id, {
        road_fees: 0,
        personal_fees: 0,
        other_fees: 0,
        other_fees_label: null,
        overweigh_fees: 0,
        fuel_quantity: 0,
        fuel_cost: 0,
        loading_cost: 0,
        unloading_cost: 0,
        date_updated: new Date().toISOString()
      });
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      alert("Erreur lors de la réinitialisation.");
    }
  };

  const deliveryOptions = useMemo(() => {
    return deliveries
      .map(d => ({
        value: d.id,
        label: d.bl_number,
        subLabel: `${d.truck_plate} • ${new Date(d.delivery_date).toLocaleDateString()}`
      }));
  }, [deliveries]);

  // Determine current context for the modal
  const selectedDeliveryForModal = deliveries.find(d => d.id === formData.delivery_id);
  // Default to internal if no delivery selected yet to allow editing, otherwise use actual type
  const isInternalTruck = selectedDeliveryForModal ? (selectedDeliveryForModal.truck_owner_type !== false) : true; 

  // --- Filtering & Grouping Logic ---
  
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Phase Filter
      if (filterPhase !== 'all' && p.project_id !== filterPhase) return false;

      // Ownership Filter
      if (filterWagueOnly && !p.truck_owner_type) return false;

      // Date Range Filter
      if (dateRange.start && dateRange.end && p.delivery_date) {
         const d = new Date(p.delivery_date);
         d.setHours(0,0,0,0);
         const start = new Date(dateRange.start); start.setHours(0,0,0,0);
         const end = new Date(dateRange.end); end.setHours(23,59,59,999);
         if (d < start || d > end) return false;
      }

      // Search Filter
      if (searchTerm) {
         const lower = searchTerm.toLowerCase();
         return (
            (p.bl_number && p.bl_number.toLowerCase().includes(lower)) ||
            (p.truck_plate && p.truck_plate.toLowerCase().includes(lower)) ||
            (p.driver_name && p.driver_name.toLowerCase().includes(lower))
         );
      }

      // Range Filter (Min Amount)
      const total = (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0);
      if (total < minFeeFilter) return false;
      
      return true;
    });
  }, [payments, filterPhase, dateRange, searchTerm, minFeeFilter, filterWagueOnly]);

  const groupedPayments = useMemo(() => {
     if (groupBy === 'none') {
        return [{ 
           key: 'All', 
           title: 'Toutes les Notes', 
           items: filteredPayments,
           total: filteredPayments.reduce((acc, p) => acc + (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0), 0)
        }];
     }

     const groups: Record<string, EnrichedPayment[]> = {};
     filteredPayments.forEach(p => {
        let key = (p as any)[groupBy] || 'Inconnu';
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
     });

     return Object.keys(groups).sort().map(key => {
        const items = groups[key];
        const total = items.reduce((acc, p) => acc + (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0), 0);
        return { key, title: key, items, total };
     });
  }, [filteredPayments, groupBy]);

  // Auto-expand groups when grouping changes
  useEffect(() => {
     if (groupBy !== 'none') {
        setActiveGroups(new Set(groupedPayments.map(g => g.key)));
     }
  }, [groupedPayments.length, groupBy]);

  const toggleGroup = (key: string) => {
     const newSet = new Set(activeGroups);
     if (newSet.has(key)) newSet.delete(key);
     else newSet.add(key);
     setActiveGroups(newSet);
  };
  
  const collapseAllGroups = () => {
    setActiveGroups(new Set());
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes de Frais</h1>
          <p className="text-muted-foreground text-sm">Gestion des dépenses liées aux livraisons (Carburant, Frais de route, Manutention...)</p>
        </div>
      </div>

      {/* FILTER & GROUPING TOOLBAR */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
         {/* Top Row: Search + Phase Filter */}
         <div className="flex flex-col md:flex-row gap-4 items-center border-b border-border/50 pb-4">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
               <input 
                  type="text" 
                  placeholder="Rechercher par BL, Camion, Chauffeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
               />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
               <button
                  onClick={() => setFilterWagueOnly(!filterWagueOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${filterWagueOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
               >
                  <ShieldCheck size={16} />
                  <span className="text-xs font-bold uppercase whitespace-nowrap">Wague Agro Business</span>
               </button>

               <div className="w-px h-6 bg-border mx-1"></div>

               <span className="text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Filter size={14} /> Phase:
               </span>
               <form className="filter shrink-0">
                  <input 
                     className="btn btn-square" 
                     type="reset" 
                     value="×" 
                     onClick={() => setFilterPhase('all')}
                     title="Réinitialiser"
                  />
                  <input 
                     className="btn" 
                     type="radio" 
                     name="expense-phase" 
                     aria-label="Toutes"
                     checked={filterPhase === 'all'}
                     onChange={() => setFilterPhase('all')}
                  />
                  {projects.map(p => (
                     <input
                        key={p.id}
                        className="btn" 
                        type="radio" 
                        name="expense-phase" 
                        aria-label={`Phase ${p.numero_phase}`}
                        checked={filterPhase === p.id}
                        onChange={() => setFilterPhase(p.id)}
                     />
                  ))}
               </form>
            </div>
         </div>

         {/* Middle Row: Grouping + Collapse */}
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-border/50 pb-4">
            {/* Grouping */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
               <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 whitespace-nowrap">
                  <Layers size={14} /> Grouper par:
               </span>
               <button onClick={() => setGroupBy('truck_plate')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${groupBy === 'truck_plate' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted border-border'}`}>Camion</button>
               <button onClick={() => setGroupBy('commune_name')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${groupBy === 'commune_name' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted border-border'}`}>Commune</button>
               <button onClick={() => setGroupBy('region_name')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${groupBy === 'region_name' ? 'bg-primary/10 text-primary border-primary' : 'bg-card hover:bg-muted border-border'}`}>Région</button>
               {groupBy !== 'none' && (
                  <>
                    <button onClick={() => setGroupBy('none')} className="p-1.5 text-muted-foreground hover:text-foreground" title="Dégrouper"><X size={14} /></button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    <button 
                      onClick={collapseAllGroups} 
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
                      title="Fermer tous les groupes"
                    >
                      <Minimize2 size={12} /> Tout réduire
                    </button>
                  </>
               )}
            </div>
         </div>

         {/* Bottom Row: Date + Range Slider */}
         <div className="flex flex-col md:flex-row gap-6 items-end md:items-center">
            {/* Date Picker */}
            <div className="relative w-full md:w-auto shrink-0">
               <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Calendar size={16} className="text-muted-foreground" />
               </div>
               <input 
                  ref={dateRangeInputRef}
                  type="text" 
                  className="input w-full md:w-64 ps-10 cursor-pointer text-sm" 
                  placeholder="Période (Début à Fin)" 
               />
               {dateRange.start && (
                  <button 
                     onClick={() => {
                        if (dateRangeInputRef.current && (window as any).flatpickr) {
                           (dateRangeInputRef.current as any)._flatpickr.clear();
                        }
                     }}
                     className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                  >
                     <X size={14} />
                  </button>
               )}
            </div>

            {/* FlyonUI Range Slider */}
            <div className="flex-1 w-full min-w-[200px]">
               <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Montant Minimum</label>
                  <span className="text-xs font-mono font-bold text-primary">{minFeeFilter.toLocaleString()} FCFA</span>
               </div>
               <input 
                  type="range" 
                  min="0" 
                  max={maxTotalFee} 
                  value={minFeeFilter} 
                  onChange={(e) => setMinFeeFilter(Number(e.target.value))}
                  className="range range-primary range-xs w-full" 
                  step={Math.ceil(maxTotalFee / 20)} 
                  aria-label="Filtre montant minimum" 
               />
               <div className="w-full flex justify-between text-[10px] text-muted-foreground px-1 mt-1 font-mono">
                  <span>0</span>
                  <span>|</span>
                  <span>{Math.round(maxTotalFee / 2).toLocaleString()}</span>
                  <span>|</span>
                  <span>{maxTotalFee.toLocaleString()}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Grouped Content */}
      <div className="flex flex-col gap-4">
         {groupedPayments.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
               Aucune note de frais trouvée.
            </div>
         )}

         {groupedPayments.map((group) => {
            const isOpen = groupBy === 'none' ? true : activeGroups.has(group.key);
            
            return (
               <div key={group.key} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  {/* Group Header (Only if grouped) */}
                  {groupBy !== 'none' && (
                     <button 
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors border-b border-border"
                     >
                        <div className="flex items-center gap-3">
                           <ChevronRight size={18} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                           <span className="font-bold text-foreground flex items-center gap-2">
                              {groupBy === 'truck_plate' && <Truck size={16} />}
                              {groupBy === 'commune_name' && <MapPin size={16} />}
                              {groupBy === 'region_name' && <MapPin size={16} />}
                              {group.title}
                           </span>
                           <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{group.items.length}</span>
                        </div>
                        <div className="font-mono font-bold text-primary">
                           {group.total.toLocaleString()} FCFA
                        </div>
                     </button>
                  )}

                  {/* List Content */}
                  <div className={`${!isOpen ? 'hidden' : 'block'}`}>
                     <div className="w-full overflow-x-auto">
                        <table className="table table-striped">
                           <thead className="bg-primary/5 border-b border-primary/10">
                              <tr>
                                 <th className="px-4 py-3 text-left w-48">BL & Date</th>
                                 <th className="px-4 py-3 text-left">Camion / Chauffeur</th>
                                 <th className="px-4 py-3 text-left">Destination</th>
                                 <th className="px-4 py-3 text-right">Carburant</th>
                                 <th className="px-4 py-3 text-right">Frais Route</th>
                                 <th className="px-4 py-3 text-right">Manutention</th>
                                 <th className="px-4 py-3 text-right">Autres</th>
                                 <th className="px-4 py-3 text-right font-bold">Total</th>
                                 <th className="px-4 py-3 text-right w-24">Actions</th>
                              </tr>
                           </thead>
                           <tbody>
                              {group.items.map(p => {
                                 const manutention = (p.loading_cost || 0) + (p.unloading_cost || 0);
                                 const total = (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + manutention;
                                 return (
                                    <tr key={p.id} className="hover:bg-muted/30">
                                       <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                             <Receipt size={16} className="text-primary/70" />
                                             <span className="font-mono font-bold text-sm text-foreground">{p.bl_number}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1 ml-6">
                                             {p.delivery_date ? new Date(p.delivery_date).toLocaleDateString() : '-'}
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                             {p.truck_plate}
                                             {p.truck_owner_type && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded border border-blue-200">WAB</span>}
                                          </div>
                                          <div className="text-xs text-muted-foreground">{p.driver_name || 'Chauffeur inconnu'}</div>
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="text-sm text-foreground">{p.commune_name}</div>
                                          <div className="text-xs text-muted-foreground">{p.region_name}</div>
                                       </td>
                                       <td className="px-4 py-3 text-right font-mono text-sm">
                                          <div className="text-foreground font-medium">{p.fuel_cost.toLocaleString()}</div>
                                          {p.fuel_quantity > 0 && <div className="text-[10px] text-muted-foreground">{p.fuel_quantity} L</div>}
                                       </td>
                                       <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                                          {(p.road_fees + p.overweigh_fees + p.personal_fees).toLocaleString()}
                                       </td>
                                       <td className="px-4 py-3 text-right font-mono text-sm text-purple-600 font-medium">
                                          {manutention.toLocaleString()}
                                       </td>
                                       <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                                          {p.other_fees.toLocaleString()}
                                       </td>
                                       <td className="px-4 py-3 text-right font-bold font-mono text-primary">
                                          {total.toLocaleString()} F
                                       </td>
                                       <td className="px-4 py-3 text-right">
                                          <div className="flex justify-end gap-1">
                                             <button 
                                                onClick={() => handleOpenModal(p)} 
                                                className="btn btn-circle btn-text btn-sm text-blue-600"
                                                title="Modifier"
                                             >
                                                <Edit2 size={16} />
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
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
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier Note de Frais' : 'Nouvelle Note de Frais'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
               
               {/* Header Selection Info */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="block text-sm font-medium text-foreground">Livraison (BL)</label>
                     {selectedDeliveryForModal && (
                        <span className="badge badge-soft badge-secondary text-xs">
                           {selectedDeliveryForModal.project_phase}
                        </span>
                     )}
                  </div>

                  <div>
                     <AdvancedSelect 
                        options={deliveryOptions}
                        value={formData.delivery_id || ''}
                        onChange={handleDeliverySelect}
                        placeholder="Rechercher par N° BL..."
                        required
                        disabled={!!formData.id} 
                     />
                     {formData.truck_id && selectedDeliveryForModal && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                           <Truck size={16} /> Camion associé : <span className="font-bold text-foreground">{selectedDeliveryForModal.truck_plate}</span>
                           {selectedDeliveryForModal.driver_name && (
                             <>
                               <span className="mx-2">|</span>
                               <User size={16} /> <span className="font-bold text-foreground">{selectedDeliveryForModal.driver_name}</span>
                             </>
                           )}
                        </div>
                     )}
                  </div>
               </div>

                {/* Ownership Display */}
                {selectedDeliveryForModal && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                     <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                           Propriété
                        </label>
                        {isInternalTruck ? (
                           <div className="flex items-center justify-center p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-100 animate-in fade-in">
                              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                 <ShieldCheck size={12} /> Wague agro business
                              </span>
                           </div>
                        ) : (
                           <div className="flex items-center justify-center p-1.5 bg-gray-50 text-gray-600 rounded border border-gray-200 animate-in fade-in">
                              <span className="text-xs font-bold uppercase tracking-wider">Externe (Prestataire)</span>
                           </div>
                        )}
                     </div>
                  </div>
                )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* SECTION 1: CARBURANT (Fuel) - Amber */}
                  <div className={`space-y-4 p-4 rounded-xl border border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 ${!isInternalTruck ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                     <div className="flex justify-between items-center border-b border-amber-200/50 pb-2 mb-2">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-amber-700 dark:text-amber-500">
                           <Fuel size={16} /> Carburant
                        </h4>
                        <div className="flex items-center gap-1">
                           <span className="text-[10px] uppercase text-muted-foreground">Prix/L:</span>
                           <input 
                              type="number"
                              className="w-16 h-6 text-xs text-right border border-input rounded px-1 bg-background"
                              value={fuelUnitPrice}
                              disabled={!isInternalTruck}
                              onChange={(e) => {
                                 const newPrice = Number(e.target.value);
                                 setFuelUnitPrice(newPrice);
                                 handleFuelChange(formData.fuel_quantity || 0, newPrice);
                              }}
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-amber-900/70 dark:text-amber-100/70 mb-1 uppercase">Quantité (Litres)</label>
                        <input 
                           type="number" 
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                           value={formData.fuel_quantity || ''}
                           disabled={!isInternalTruck}
                           onChange={(e) => {
                              const qty = Number(e.target.value);
                              handleFuelChange(qty, fuelUnitPrice);
                           }}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-amber-900/70 dark:text-amber-100/70 mb-1 uppercase">Coût Total (FCFA)</label>
                        <div className="relative">
                           <input 
                              type="number" 
                              readOnly
                              className="w-full border border-input rounded-lg p-2 text-sm bg-amber-100/50 font-mono font-bold text-foreground cursor-not-allowed"
                              value={formData.fuel_cost || 0}
                           />
                           <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        </div>
                     </div>
                  </div>

                  {/* SECTION 2: FRAIS DE ROUTE (Road) - Blue */}
                  <div className={`space-y-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 ${!isInternalTruck ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                     <div className="flex justify-between items-center border-b border-blue-200/50 pb-2 mb-2">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-blue-700 dark:text-blue-500">
                           <Receipt size={16} /> Frais de Route
                        </h4>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-medium text-blue-900/70 dark:text-blue-100/70 mb-1">Route / Péage</label>
                           <input 
                              type="number" 
                              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                              value={formData.road_fees || ''}
                              disabled={!isInternalTruck}
                              onChange={e => setFormData({...formData, road_fees: Number(e.target.value)})}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-blue-900/70 dark:text-blue-100/70 mb-1">Surpoids</label>
                           <input 
                              type="number" 
                              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                              value={formData.overweigh_fees || ''}
                              disabled={!isInternalTruck}
                              onChange={e => setFormData({...formData, overweigh_fees: Number(e.target.value)})}
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-blue-900/70 dark:text-blue-100/70 mb-1">Frais Personnels (Chauffeur)</label>
                        <input 
                           type="number" 
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                           value={formData.personal_fees || ''}
                           disabled={!isInternalTruck}
                           onChange={e => setFormData({...formData, personal_fees: Number(e.target.value)})}
                        />
                     </div>
                  </div>

                  {/* SECTION 3: MANUTENTION (Handling) - Purple - ENABLED FOR ALL */}
                  <div className="space-y-4 p-4 rounded-xl border border-purple-100 bg-purple-50/50 dark:bg-purple-900/10">
                     <div className="flex justify-between items-center border-b border-purple-200/50 pb-2 mb-2">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-purple-700 dark:text-purple-500">
                           <PackageOpen size={16} /> Manutention
                        </h4>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-medium text-purple-900/70 dark:text-purple-100/70 mb-1">Chargement</label>
                           <input 
                              type="number" 
                              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                              value={formData.loading_cost || ''}
                              onChange={e => setFormData({...formData, loading_cost: Number(e.target.value)})}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-purple-900/70 dark:text-purple-100/70 mb-1">Déchargement</label>
                           <input 
                              type="number" 
                              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                              value={formData.unloading_cost || ''}
                              onChange={e => setFormData({...formData, unloading_cost: Number(e.target.value)})}
                           />
                        </div>
                     </div>
                     <div className="pt-2 text-right">
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                           Total Manutention: <span className="font-mono font-bold">{((formData.loading_cost || 0) + (formData.unloading_cost || 0)).toLocaleString()} F</span>
                        </span>
                     </div>
                  </div>

                  {/* SECTION 4: AUTRES (Other) - Slate - Enabled for Internal */}
                  <div className={`space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 ${!isInternalTruck ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                     <div className="flex justify-between items-center border-b border-slate-200/50 pb-2 mb-2">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-400">
                           <Layers size={16} /> Autres Frais
                        </h4>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Libellé</label>
                        <input 
                           type="text" 
                           placeholder="Ex: Réparation pneu..."
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                           value={formData.other_fees_label || ''}
                           disabled={!isInternalTruck}
                           onChange={e => setFormData({...formData, other_fees_label: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Montant</label>
                        <input 
                           type="number" 
                           className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                           value={formData.other_fees || ''}
                           disabled={!isInternalTruck}
                           onChange={e => setFormData({...formData, other_fees: Number(e.target.value)})}
                        />
                     </div>
                  </div>
               </div>

               <div className="pt-4 flex justify-between gap-2 border-t border-border mt-2">
                  <div>
                     {formData.id && (
                        <button 
                           type="button"
                           onClick={handleReset} 
                           className="px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                           title="Remettre tous les montants à zéro"
                        >
                           <RotateCcw size={16} /> Réinitialiser
                        </button>
                     )}
                  </div>
                  <div className="flex gap-2">
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
