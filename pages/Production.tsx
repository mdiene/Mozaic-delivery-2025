
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { db } from '../services/db';
import { Project, ProductionView } from '../types';
import { 
  Factory, Plus, Search, Calendar, Package, Users, Coins, 
  ChevronRight, Save, X, Edit2, Trash2, TrendingUp, History,
  LayoutList, FileText, Banknote
} from 'lucide-react';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';

export const ProductionPage = () => {
  const [productions, setProductions] = useState<ProductionView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [dailyWage, setDailyWage] = useState<number>(5000); // Prefilled daily wage
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');

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
    if (prod) {
      setFormData({ ...prod });
      // Estimate daily wage if total_amount and nombre_elements are present
      if (prod.total_amount && prod.nombre_elements > 0) {
        setDailyWage(Math.round(prod.total_amount / prod.nombre_elements));
      } else {
        setDailyWage(5000);
      }
    } else {
      setFormData({
        production_date: new Date().toISOString().split('T')[0],
        bags_deployed: 0,
        bags_filled_50kg: 0,
        nombre_elements: 0,
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
      const count = Number(formData.nombre_elements) || 0;
      const amount = count * dailyWage;
      if (amount !== formData.total_amount) {
        setFormData(prev => ({ ...prev, total_amount: amount }));
      }
    }
  }, [formData.nombre_elements, dailyWage, isModalOpen]);

  const handleDelete = async (id: string) => {
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
        nombre_elements: Number(formData.nombre_elements), // Corrected field
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

  const filteredProductions = useMemo(() => {
    return productions.filter(p => {
      if (filterPhase !== 'all' && p.project_id !== filterPhase) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return p.notes?.toLowerCase().includes(lower) || 
               p.project_phase.toLowerCase().includes(lower);
      }
      return true;
    });
  }, [productions, searchTerm, filterPhase]);

  const stats = useMemo(() => {
    return {
      totalProduced: filteredProductions.reduce((acc, p) => acc + Number(p.tonnage || 0), 0),
      totalBags: filteredProductions.reduce((acc, p) => acc + Number(p.bags_filled_50kg || 0), 0),
      totalCost: filteredProductions.reduce((acc, p) => acc + Number(p.total_amount || 0), 0)
    };
  }, [filteredProductions]);

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
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-soft-sm transition-all"
        >
          <Plus size={18} /> Nouvelle Production
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-primary/10 text-primary rounded-xl"><Package size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Tonnage Total</p>
              <p className="text-xl font-bold font-mono">{stats.totalProduced.toFixed(2)} T</p>
           </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><LayoutList size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Sacs 50kg</p>
              <p className="text-xl font-bold font-mono">{stats.totalBags.toLocaleString()}</p>
           </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><Coins size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Coût Production</p>
              <p className="text-xl font-bold font-mono">{stats.totalCost.toLocaleString()} F</p>
           </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <span className="text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Projet:</span>
          <form className="filter bg-muted/30">
            <input className="btn btn-square" type="reset" value="×" onClick={() => setFilterPhase('all')} />
            <input className="btn" type="radio" name="prod-phase" aria-label="Tous" checked={filterPhase === 'all'} onChange={() => setFilterPhase('all')} />
            {projects.map(p => (
              <input key={p.id} className="btn" type="radio" name="prod-phase" aria-label={`Ph ${p.numero_phase}`} checked={filterPhase === p.id} onChange={() => setFilterPhase(p.id)} />
            ))}
          </form>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="table table-striped">
            <thead className="bg-primary/5">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Effectif</th>
                <th className="px-4 py-3">Sacs Utilisés</th>
                <th className="px-4 py-3">Prod. Finie (50kg)</th>
                <th className="px-4 py-3">Tonnage</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductions.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground italic">Aucun enregistrement trouvé.</td></tr>
              ) : (
                filteredProductions.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-primary" />
                          <span className="font-medium">{new Date(p.production_date).toLocaleDateString('fr-FR')}</span>
                       </div>
                    </td>
                    <td className="px-4 py-3">
                       <span className="badge badge-soft badge-secondary text-xs">{p.project_phase}</span>
                    </td>
                    <td className="px-4 py-3">
                       <div className="flex items-center gap-1">
                          <Users size={14} className="text-muted-foreground" />
                          <span className="font-bold">{p.nombre_elements || 0}</span>
                       </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{p.bags_deployed}</td>
                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{p.bags_filled_50kg}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Sacs</span>
                       </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                       {Number(p.tonnage).toFixed(2)} T
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                       {p.total_amount?.toLocaleString()} F
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(p)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Factory size={18} className="text-primary" />
                {formData.id ? 'Modifier Production' : 'Enregistrer Production'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Projet</label>
                  <AdvancedSelect 
                    options={projectOptions}
                    value={formData.project_id || ''}
                    onChange={(val) => setFormData({...formData, project_id: val})}
                    placeholder="Sélectionner le projet..."
                    required
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Date Production</label>
                    <input 
                       type="date"
                       required
                       className="w-full border border-input rounded-xl p-2.5 text-sm bg-background"
                       value={formData.production_date || ''}
                       onChange={e => setFormData({...formData, production_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre d'Employés</label>
                    <div className="relative">
                       <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                       <input 
                          type="number"
                          required
                          className="w-full pl-10 pr-4 border border-input rounded-xl p-2.5 text-sm bg-background"
                          value={formData.nombre_elements || ''}
                          onChange={e => setFormData({...formData, nombre_elements: e.target.value})}
                       />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Sacs Déployés (Consommation)</label>
                    <input 
                       type="number"
                       required
                       className="w-full border border-input rounded-xl p-2.5 text-sm bg-background"
                       value={formData.bags_deployed || ''}
                       onChange={e => setFormData({...formData, bags_deployed: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Sacs Ensachés (50kg)</label>
                    <input 
                       type="number"
                       required
                       className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-bold text-primary"
                       value={formData.bags_filled_50kg || ''}
                       onChange={e => setFormData({...formData, bags_filled_50kg: e.target.value})}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">
                       Equivalent: {((formData.bags_filled_50kg || 0) / 20).toFixed(2)} T
                    </p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Salaire Journalier (F)</label>
                    <div className="relative">
                       <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                       <input 
                          type="number"
                          className="w-full pl-10 pr-4 border border-input rounded-xl p-2.5 text-sm bg-background"
                          value={dailyWage}
                          onChange={e => setDailyWage(Number(e.target.value))}
                       />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Coût Main d'œuvre (Auto)</label>
                    <div className="relative">
                       <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                       <input 
                          type="number"
                          readOnly
                          className="w-full pl-10 pr-4 border border-input rounded-xl p-2.5 text-sm bg-muted/30 font-bold text-foreground cursor-not-allowed"
                          value={formData.total_amount || 0}
                       />
                    </div>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes / Remarques</label>
                  <textarea 
                     className="w-full border border-input rounded-xl p-3 text-sm bg-background min-h-[80px]"
                     value={formData.notes || ''}
                     onChange={e => setFormData({...formData, notes: e.target.value})}
                     placeholder="Détails sur l'équipe, météo, pannes..."
                  />
               </div>

               <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl text-sm font-medium transition-colors">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold shadow-soft-xl flex items-center gap-2 active:scale-95 transition-all">
                     <Save size={16} /> Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
