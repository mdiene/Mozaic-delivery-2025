
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { db } from '../services/db';
import { Project, ProductionView } from '../types';
import { 
  Factory, Plus, Search, Calendar, Package, Users, Coins, 
  ChevronRight, Save, X, Edit2, Trash2, TrendingUp, History,
  LayoutList, FileText, Banknote, ChevronDown, UserCircle, Scissors
} from 'lucide-react';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';
import { useAuth } from '../contexts/AuthContext';

export const ProductionPage = () => {
  const { user } = useAuth();
  const isVisitor = user?.role === 'VISITOR';
  const [productions, setProductions] = useState<ProductionView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [dailyWage, setDailyWage] = useState<number>(5000); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  
  // Accordion State
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prod, proj] = await Promise.all([
        db.getProductions(),
        db.getProjects()
      ]);
      setProductions(prod);
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

  const handleOpenModal = (prod?: ProductionView) => {
    if (isVisitor) return;
    if (prod) {
      setFormData({ ...prod });
      const totalWorkers = (Number(prod.nombre_elements) || 0) + (Number(prod.equipe_couture) || 0);
      if (prod.total_amount && totalWorkers > 0) {
        setDailyWage(Math.round(prod.total_amount / totalWorkers));
      } else {
        setDailyWage(5000);
      }
    } else {
      setFormData({
        production_date: new Date().toISOString().split('T')[0],
        bags_deployed: 0,
        bags_filled_50kg: 0,
        nombre_elements: 0,
        equipe_couture: 0,
        total_amount: 0,
        notes: ''
      });
      setDailyWage(5000);
    }
    setIsModalOpen(true);
  };

  // Automatic calculation of labor cost
  useEffect(() => {
    if (isModalOpen) {
      const elementsCount = Number(formData.nombre_elements) || 0;
      const coutureCount = Number(formData.equipe_couture) || 0;
      const amount = (elementsCount + coutureCount) * dailyWage;
      if (amount !== formData.total_amount) {
        setFormData(prev => ({ ...prev, total_amount: amount }));
      }
    }
  }, [formData.nombre_elements, formData.equipe_couture, dailyWage, isModalOpen]);

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Voulez-vous vraiment supprimer cet enregistrement de production ?')) return;
    try {
      await db.deleteItem('production', id);
      fetchData();
    } catch (e) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    if (!formData.project_id) {
       alert("Le projet est requis");
       return;
    }

    try {
      const payload = {
        project_id: formData.project_id,
        production_date: formData.production_date,
        bags_deployed: Number(formData.bags_deployed),
        bags_filled_50kg: Number(formData.bags_filled_50kg),
        nombre_elements: Number(formData.nombre_elements),
        equipe_couture: Number(formData.equipe_couture),
        total_amount: Number(formData.total_amount),
        notes: formData.notes
      };

      if (formData.id) {
        await db.updateItem('production', formData.id, payload);
      } else {
        await db.createItem('production', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(`Erreur: ${error.message || "Une erreur est survenue."}`);
    }
  };

  const groupedProductions = useMemo(() => {
    const filtered = productions.filter(p => {
      if (filterPhase !== 'all' && p.project_id !== filterPhase) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return p.notes?.toLowerCase().includes(lower) || 
               p.project_phase.toLowerCase().includes(lower);
      }
      return true;
    });

    const groups: Record<string, ProductionView[]> = {};
    filtered.forEach(p => {
      const phase = p.project_phase || 'Phase Inconnue';
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(p);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }));
  }, [productions, searchTerm, filterPhase]);

  const stats = useMemo(() => {
    const filtered = productions.filter(p => {
      if (filterPhase !== 'all' && p.project_id !== filterPhase) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return p.notes?.toLowerCase().includes(lower) || p.project_phase.toLowerCase().includes(lower);
      }
      return true;
    });
    return {
      totalProduced: filtered.reduce((acc, p) => acc + Number(p.tonnage || 0), 0),
      totalBags: filtered.reduce((acc, p) => acc + Number(p.bags_filled_50kg || 0), 0),
      totalCost: filtered.reduce((acc, p) => acc + Number(p.total_amount || 0), 0)
    };
  }, [productions, searchTerm, filterPhase]);

  const togglePhase = (phase: string) => {
    const newSet = new Set(expandedPhases);
    if (newSet.has(phase)) newSet.delete(phase);
    else newSet.add(phase);
    setExpandedPhases(newSet);
  };

  const projectOptions: Option[] = projects.map(p => ({
    value: p.id,
    label: `Phase ${p.numero_phase}`,
    subLabel: p.numero_marche
  }));

  if (loading && projects.length === 0) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saisie de Production</h1>
          <p className="text-muted-foreground text-sm">Suivi journalier de l'ensachage et des ressources sur site.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-soft-sm transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          <Plus size={18} /> Nouvelle Production
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-primary/10 text-primary rounded-xl"><Package size={24} /></div>
           <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Tonnage Total</p><p className="text-xl font-bold font-mono">{stats.totalProduced.toFixed(2)} T</p></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><LayoutList size={24} /></div>
           <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Sacs 50kg</p><p className="text-xl font-bold font-mono">{stats.totalBags.toLocaleString()}</p></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><Coins size={24} /></div>
           <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Coût Production</p><p className="text-xl font-bold font-mono">{stats.totalCost.toLocaleString()} F</p></div>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><input type="text" placeholder="Rechercher notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none" /></div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0"><span className="text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Projet:</span><form className="filter bg-muted/30"><input className="btn btn-square" type="reset" value="×" onClick={() => setFilterPhase('all')} /><input className="btn" type="radio" name="prod-phase" aria-label="Tous" checked={filterPhase === 'all'} onChange={() => setFilterPhase('all')} />{projects.map(p => (<input key={p.id} className="btn" type="radio" name="prod-phase" aria-label={`Ph ${p.numero_phase}`} checked={filterPhase === p.id} onChange={() => setFilterPhase(p.id)} />))}</form></div>
      </div>

      <div className="accordion flex flex-col gap-4">
        {groupedProductions.length === 0 ? (<div className="bg-card p-12 text-center text-muted-foreground border border-border rounded-2xl italic shadow-soft-sm">Aucun enregistrement.</div>) : (
          groupedProductions.map(([phase, items]) => {
            const isExpanded = expandedPhases.has(phase);
            return (
              <div key={phase} className="accordion-item shadow-soft-sm transition-all duration-300 overflow-hidden">
                <button onClick={() => togglePhase(phase)} className="accordion-toggle px-6 py-4 bg-card hover:bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted'}`}><ChevronRight size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} /></div><div className="flex flex-col text-left"><span className="text-lg font-bold">{phase}</span><span className="text-xs text-muted-foreground">{items.length} Enregistrements</span></div></div>
                </button>
                <div className={`accordion-content ${!isExpanded ? 'hidden' : ''}`}>
                  <div className="w-full overflow-x-auto">
                    <table className="table w-full border-t">
                      <thead className="bg-primary/5"><tr><th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase">Effectif</th><th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase">Prod. Finie (50kg)</th><th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase">Tonnage</th><th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase">Actions</th></tr></thead>
                      <tbody className="divide-y">
                        {items.map(p => (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="px-6 py-4">{new Date(p.production_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{(p.nombre_elements || 0) + (p.equipe_couture || 0)} Pers.</td>
                            <td className="px-6 py-4">{p.bags_filled_50kg} Sacs</td>
                            <td className="px-6 py-4"><span className="badge badge-soft badge-success">{Number(p.tonnage).toFixed(2)} T</span></td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleOpenModal(p)} disabled={isVisitor} className="btn btn-circle btn-text text-blue-600 disabled:opacity-30"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(p.id)} disabled={isVisitor} className="btn btn-circle btn-text text-destructive disabled:opacity-30"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Factory size={18} className="text-primary" />Enregistrer Production</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
               <AdvancedSelect options={projectOptions} value={formData.project_id || ''} onChange={(val) => setFormData({...formData, project_id: val})} placeholder="Projet..." required />
               <div className="grid grid-cols-2 gap-4">
                  <input type="date" required className="w-full border border-input rounded-xl p-2.5 text-sm" value={formData.production_date || ''} onChange={e => setFormData({...formData, production_date: e.target.value})} />
                  <input type="number" required className="w-full border border-input rounded-xl p-2.5 text-sm" value={formData.bags_filled_50kg || ''} onChange={e => setFormData({...formData, bags_filled_50kg: e.target.value})} placeholder="Sacs Ensachés" />
               </div>
               <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-muted-foreground">Annuler</button><button type="submit" className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-soft-xl flex items-center gap-2"><Save size={18} /> Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
