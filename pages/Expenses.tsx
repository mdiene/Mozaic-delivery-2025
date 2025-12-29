
import { useState, useEffect, useMemo, FormEvent, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/db';
import { EnrichedPayment, DeliveryView, Project } from '../types';
import { Search, Filter, Layers, X, Edit2, RotateCcw, Save, Truck, User, Fuel, Receipt, ShieldCheck, RefreshCw, Calendar, Minimize2, ChevronRight, MapPin, PackageOpen, Coins } from 'lucide-react';
import { AdvancedSelect } from '../components/AdvancedSelect';
import { useAuth } from '../contexts/AuthContext';

export const Expenses = () => {
  const { user } = useAuth();
  const isVisitor = user?.role === 'VISITOR';
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
  const maxTotalFee = 500000; 

  const [activeAccordionPhases, setActiveAccordionPhases] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'truck_plate' | 'commune_name' | 'region_name'>('none');
  const [fuelUnitPrice, setFuelUnitPrice] = useState(680); 
  const dateRangeInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
       const [pay, del, proj] = await Promise.all([db.getPayments(), db.getDeliveriesView(), db.getProjects()]);
       setPayments(pay); setDeliveries(del); setProjects(proj);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch) setSearchTerm(querySearch);
  }, [searchParams]);

  useEffect(() => {
    if (dateRangeInputRef.current && (window as any).flatpickr) {
      const fp = (window as any).flatpickr(dateRangeInputRef.current, {
        mode: 'range',
        dateFormat: "Y-m-d",
        onChange: (selectedDates: Date[]) => {
          if (selectedDates.length === 2) setDateRange({ start: selectedDates[0], end: selectedDates[1] });
          else setDateRange({ start: null, end: null });
        }
      });
      return () => fp.destroy();
    }
  }, []);

  const handleOpenModal = (payment?: EnrichedPayment) => {
     if (isVisitor) return;
     if (payment) {
        setFormData({ ...payment });
        if (payment.fuel_quantity > 0) setFuelUnitPrice(Math.round(payment.fuel_cost / payment.fuel_quantity));
        else setFuelUnitPrice(680);
     } else {
        setFormData({}); setFuelUnitPrice(680);
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
        other_fees_label: !isInternal ? 'Forfait transporteur' : (prev.other_fees_label || ''),
        fuel_quantity: !isInternal ? 0 : prev.fuel_quantity,
        fuel_cost: !isInternal ? 0 : prev.fuel_cost,
        road_fees: !isInternal ? 0 : prev.road_fees,
        personal_fees: !isInternal ? 0 : prev.personal_fees,
        overweigh_fees: !isInternal ? 0 : prev.overweigh_fees,
        loading_cost: prev.loading_cost || 0,
        unloading_cost: prev.unloading_cost || 0
      }));
    }
  };

  const handleFuelChange = (quantity: number, price: number) => {
     setFormData(prev => ({ ...prev, fuel_quantity: quantity, fuel_cost: quantity * price }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    try {
      const payload = { ...formData, road_fees: Number(formData.road_fees) || 0, personal_fees: Number(formData.personal_fees) || 0, other_fees: Number(formData.other_fees) || 0, overweigh_fees: Number(formData.overweigh_fees) || 0, fuel_quantity: Number(formData.fuel_quantity) || 0, fuel_cost: Number(formData.fuel_cost) || 0, loading_cost: Number(formData.loading_cost) || 0, unloading_cost: Number(formData.unloading_cost) || 0, date_updated: new Date().toISOString() };
      if (formData.id) await db.updateItem('payments', formData.id, payload);
      else await db.createItem('payments', payload);
      setIsModalOpen(false); fetchData();
    } catch (e: any) { alert("Erreur."); }
  };

  const handleReset = async () => {
    if (isVisitor || !formData.id) return;
    if (!confirm('Réinitialiser ?')) return;
    try {
      await db.updateItem('payments', formData.id, { road_fees: 0, personal_fees: 0, other_fees: 0, overweigh_fees: 0, fuel_quantity: 0, fuel_cost: 0, loading_cost: 0, unloading_cost: 0, date_updated: new Date().toISOString() });
      setIsModalOpen(false); fetchData();
    } catch (e) { alert("Erreur."); }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filterPhase !== 'all' && p.project_id !== filterPhase) return false;
      if (filterWagueOnly && !p.truck_owner_type) return false;
      if (dateRange.start && dateRange.end && p.delivery_date) {
         const d = new Date(p.delivery_date);
         const start = new Date(dateRange.start); const end = new Date(dateRange.end);
         if (d < start || d > end) return false;
      }
      if (searchTerm) {
         const lower = searchTerm.toLowerCase();
         return (p.bl_number?.toLowerCase().includes(lower) || p.truck_plate?.toLowerCase().includes(lower));
      }
      return true;
    });
  }, [payments, filterPhase, dateRange, searchTerm, filterWagueOnly]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0), 0);
  }, [filteredPayments]);

  const groupedByPhase = useMemo(() => {
     const phaseGroups: Record<string, EnrichedPayment[]> = {};
     filteredPayments.forEach(p => {
        const proj = projects.find(proj => proj.id === p.project_id);
        const phaseLabel = proj ? `Phase ${proj.numero_phase}` : 'Autres';
        if (!phaseGroups[phaseLabel]) phaseGroups[phaseLabel] = [];
        phaseGroups[phaseLabel].push(p);
     });
     return Object.keys(phaseGroups).sort((a,b) => b.localeCompare(a)).map(phase => {
        const phaseItems = phaseGroups[phase];
        return { phase, total: phaseItems.reduce((acc, p) => acc + (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0), 0), subGroups: [{ key: 'All', items: phaseItems, subTotal: phaseItems.reduce((acc, p) => acc + (p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0), 0) }] };
     });
  }, [filteredPayments, projects]);

  const toggleAccordion = (phase: string) => {
    const newSet = new Set(activeAccordionPhases);
    if (newSet.has(phase)) newSet.delete(phase); else newSet.add(phase);
    setActiveAccordionPhases(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Notes de Frais</h1><p className="text-muted-foreground text-sm">Gestion des dépenses liées aux livraisons.</p></div>
        <div className="bg-primary/5 px-5 py-2 rounded-xl border flex items-center gap-4 shadow-sm animate-in fade-in">
           <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Filtré</p><p className="text-xl font-bold font-mono text-primary">{totalFilteredAmount.toLocaleString()} FCFA</p></div>
           <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Coins size={20} /></div>
        </div>
      </div>

      <div className="accordion flex flex-col gap-4">
         {groupedByPhase.map((projectGroup) => {
            const isOpen = activeAccordionPhases.has(projectGroup.phase);
            return (
               <div key={projectGroup.phase} className="accordion-item shadow-sm">
                  <button onClick={() => toggleAccordion(projectGroup.phase)} className="accordion-toggle bg-card hover:bg-muted/30">
                    <div className="flex items-center gap-4"><ChevronRight size={20} className={`transition-transform ${isOpen ? 'rotate-90 text-primary' : ''}`} /><span className="text-lg font-bold">{projectGroup.phase}</span></div>
                    <p className="font-mono font-bold text-primary mr-4">{projectGroup.total.toLocaleString()} F</p>
                  </button>
                  <div className={`accordion-content ${!isOpen ? 'hidden' : ''}`}>
                     <div className="w-full overflow-x-auto">
                        <table className="table table-striped">
                           <thead><tr><th>BL</th><th>Camion</th><th>Destination</th><th className="text-right">Total</th><th className="text-right">Actions</th></tr></thead>
                           <tbody>
                              {projectGroup.subGroups[0].items.map(p => (
                                 <tr key={p.id}>
                                    <td>{p.bl_number}</td><td>{p.truck_plate}</td><td>{p.commune_name}</td>
                                    <td className="text-right font-bold text-primary">{((p.fuel_cost || 0) + (p.road_fees || 0) + (p.personal_fees || 0) + (p.other_fees || 0) + (p.overweigh_fees || 0) + (p.loading_cost || 0) + (p.unloading_cost || 0)).toLocaleString()} F</td>
                                    <td className="text-right"><button onClick={() => handleOpenModal(p)} disabled={isVisitor} className="btn btn-circle text-blue-600 disabled:opacity-30"><Edit2 size={16} /></button></td>
                                 </tr>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">Note de Frais : {formData.bl_number}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                    <label className="block text-xs font-bold mb-1">CARBURANT (LITRES)</label>
                    <input type="number" className="w-full border rounded-lg p-2" value={formData.fuel_quantity || ''} onChange={e => handleFuelChange(Number(e.target.value), fuelUnitPrice)} />
                  </div>
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                    <label className="block text-xs font-bold mb-1">FRAIS ROUTE</label>
                    <input type="number" className="w-full border rounded-lg p-2" value={formData.road_fees || ''} onChange={e => setFormData({...formData, road_fees: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={handleReset} className="text-amber-600 mr-auto flex items-center gap-2"><RotateCcw size={16}/> Reset</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg shadow-sm flex items-center gap-2"><Save size={16} /> Enregistrer</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
