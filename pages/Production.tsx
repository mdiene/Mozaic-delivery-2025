
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/db';
import { Project, ProductionView } from '../types';
import { 
  Factory, Plus, Search, Calendar, Package, Users, Coins, 
  ChevronRight, Save, X, Edit2, Trash2, TrendingUp, History,
  LayoutList, FileText, Banknote, ChevronDown, UserCircle, Scissors,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Filter
} from 'lucide-react';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';
import { useAuth } from '../contexts/AuthContext';

export const ProductionPage = () => {
  const { user } = useAuth();
  const [productions, setProductions] = useState<ProductionView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isVisitor = user?.role === 'VISITOR';
  
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
  
  const visibleProjects = useMemo(() => projects.filter(p => p.project_visibility !== false), [projects]);

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

  const projectOptions: Option[] = visibleProjects.map(p => ({
    value: p.id,
    label: `Phase ${p.numero_phase}`,
    subLabel: p.numero_marche
  }));

  const getPhaseColor = (num: number | string) => {
    const n = typeof num === 'string' ? parseInt(num) : num;
    const colors = [
      { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
      { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
      { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
      { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200', hex: '#8b5cf6' },
      { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-200', hex: '#f43f5e' },
      { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-200', hex: '#06b6d4' },
    ];
    return colors[(n - 1) % colors.length] || colors[0];
  };

  if (loading && projects.length === 0) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Production & Ensachage</h1>
          <p className="text-muted-foreground">Suivi des volumes ensachés et des coûts de main-d'œuvre.</p>
        </div>
        {!isVisitor && (
          <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            Nouvelle Production
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Ensaché</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalProduced.toFixed(2)} T</p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Moyenne Journalière</p>
            <p className="text-2xl font-bold text-foreground">
              {productions.length > 0 ? (stats.totalProduced / productions.length).toFixed(1) : 0} T
            </p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coût Main d'œuvre</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalCost.toLocaleString()} F</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par note ou date..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 flex-[2] w-full">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setFilterPhase('all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${filterPhase === 'all' ? 'bg-primary text-white border-primary shadow-md' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
              >
                Toutes les Phases
              </button>
              {projects.map(p => {
                const phaseColor = getPhaseColor(p.numero_phase);
                const isActive = filterPhase === p.id;
                return (
                  <button 
                    key={p.id}
                    onClick={() => setFilterPhase(p.id)}
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

      {/* Production List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium">Chargement des données...</p>
          </div>
        ) : groupedProductions.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-20 text-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Aucun enregistrement</h3>
            <p className="text-muted-foreground mt-1">Commencez par ajouter une nouvelle production.</p>
          </div>
        ) : (
          groupedProductions.map(([phase, phaseProds]: any) => (
            <div key={phase} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <button 
                onClick={() => togglePhase(phase)}
                className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {phase}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-foreground">{phase}</h3>
                    <p className="text-xs text-muted-foreground">
                      {phaseProds.length} enregistrements • {phaseProds.reduce((acc: number, p: any) => acc + Number(p.tonnage || 0), 0).toFixed(1)} T
                    </p>
                  </div>
                </div>
                <ChevronDown className={`text-muted-foreground transition-transform duration-300 ${expandedPhases.has(phase) ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedPhases.has(phase) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-secondary/30">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sacs</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tonnage</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Effectif</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coût</th>
                          <th className="px-6 py-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {phaseProds.map((prod: ProductionView) => (
                          <tr key={prod.id} className="hover:bg-secondary/10 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-primary" />
                                <span className="text-sm font-medium text-foreground">
                                  {new Date(prod.production_date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{prod.bags_filled_50kg} sacs</span>
                                <span className="text-[10px] text-muted-foreground">{prod.bags_deployed} déployés</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-info/10 text-info text-xs font-bold">
                                {Number(prod.tonnage).toFixed(2)} T
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Users size={14} className="text-muted-foreground" />
                                <span className="text-sm text-foreground">{(prod.nombre_elements || 0) + (prod.equipe_couture || 0)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono font-bold text-foreground">
                                {prod.total_amount?.toLocaleString()} F
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isVisitor && (
                                  <>
                                    <button 
                                      onClick={() => handleOpenModal(prod)}
                                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(prod.id)}
                                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Factory size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {formData.id ? 'Modifier Production' : 'Nouvelle Production'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date de Production</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="date" 
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                        value={formData.production_date || ''}
                        onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Projet / Site</label>
                    <AdvancedSelect
                      options={projectOptions}
                      value={formData.project_id || ''}
                      onChange={(val) => setFormData({ ...formData, project_id: val })}
                      placeholder="Sélectionner un projet"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sacs Déployés</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                      value={formData.bags_deployed || 0}
                      onChange={(e) => setFormData({ ...formData, bags_deployed: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sacs Remplis (50kg)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                      value={formData.bags_filled_50kg || 0}
                      onChange={(e) => setFormData({ ...formData, bags_filled_50kg: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effectif Éléments</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                      value={formData.nombre_elements || 0}
                      onChange={(e) => setFormData({ ...formData, nombre_elements: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effectif Couture</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                      value={formData.equipe_couture || 0}
                      onChange={(e) => setFormData({ ...formData, equipe_couture: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Forfait Journalier (F)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm"
                      value={dailyWage}
                      onChange={(e) => setDailyWage(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant Total Main d'œuvre</label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="number" 
                        readOnly
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/30 border-transparent text-sm font-bold text-primary"
                        value={formData.total_amount || 0}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes / Observations</label>
                  <textarea 
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:bg-card focus:border-primary focus:ring-0 transition-all text-sm min-h-[100px]"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
