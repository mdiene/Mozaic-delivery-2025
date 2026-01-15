
import React, { useState, useEffect, FormEvent, useMemo, useRef, Fragment } from 'react';
import { db } from '../services/db';
import { 
  AdminCategoryDepense, AdminModePaiement, AdminCodeAnalytique, AdminPersonnel 
} from '../types';
import { 
  ShoppingCart, Coins, TrendingUp, Plus, Search, Calendar, Layers, CreditCard, 
  Code, User, FileText, X, Save, Edit2, Trash2, RefreshCw, Filter, Receipt, Info,
  ChevronRight, Minimize2, Maximize2, RotateCcw, List, AlertCircle, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ProductionPurchases = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // Reference data for dropdowns
  const [categories, setCategories] = useState<AdminCategoryDepense[]>([]);
  const [modes, setModes] = useState<AdminModePaiement[]>([]);
  const [codes, setCodes] = useState<AdminCodeAnalytique[]>([]);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [isGrouped, setIsGrouped] = useState(true);
  const dateRangeInputRef = useRef<HTMLInputElement>(null);

  // Accordion State
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ex, cat, md, cd, pers] = await Promise.all([
        db.getAdminDepenses(),
        db.getAdminCategories(),
        db.getAdminModesPaiement(),
        db.getAdminCodesAnalytiques(),
        db.getAdminPersonnel()
      ]);
      setExpenses(ex);
      setCategories(cat);
      setModes(md);
      setCodes(cd);
      setPersonnel(pers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    expenses.forEach(e => {
      if (e.date_operation) {
        const year = new Date(e.date_operation).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

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

  const openModal = (expense?: any) => {
    if (isVisitor) return;
    if (expense) {
      setFormData({ ...expense });
    } else {
      setFormData({
        date_operation: new Date().toISOString().split('T')[0],
        libelle: '',
        montant: 0,
        reference_piece: '',
        depense_en_attente: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      const payload: any = {
        date_operation: formData.date_operation,
        libelle: formData.libelle,
        montant: Number(formData.montant),
        id_categorie: formData.id_categorie || null,
        id_mode_paiement: formData.id_mode_paiement || null,
        id_code_analytique: formData.id_code_analytique || null,
        id_responsable: formData.id_responsable || null,
        reference_piece: formData.reference_piece || '',
        depense_en_attente: !!formData.depense_en_attente,
        updated_at: new Date().toISOString()
      };

      if (user?.id) {
        payload.id_user = user.id;
      }

      if (formData.id_depense) {
        await db.updateItem('admin_depenses', formData.id_depense, payload);
      } else {
        await db.createItem('admin_depenses', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'enregistrement.');
    }
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      await db.deleteItem('admin_depenses', id);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erreur suppression.');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterCategory !== 'all' && e.id_categorie !== filterCategory) return false;
      
      // Year filter
      if (filterYear !== 'all') {
        const year = new Date(e.date_operation).getFullYear().toString();
        if (year !== filterYear) return false;
      }

      if (dateRange.start && dateRange.end) {
        const d = new Date(e.date_operation);
        d.setHours(0,0,0,0);
        const start = new Date(dateRange.start); start.setHours(0,0,0,0);
        const end = new Date(dateRange.end); end.setHours(23,59,59,999);
        if (d < start || d > end) return false;
      }

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          e.libelle.toLowerCase().includes(lower) ||
          e.reference_piece?.toLowerCase().includes(lower) ||
          e.responsable_nom?.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [expenses, searchTerm, filterCategory, filterYear, dateRange]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredExpenses.forEach(e => {
      const date = e.date_operation;
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });

    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, items]) => ({
        date,
        items,
        totalSpent: items.reduce((sum, item) => sum + Number(item.montant), 0)
      }));
  }, [filteredExpenses]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.montant), 0);
  }, [filteredExpenses]);

  const toggleDate = (date: string) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) newSet.delete(date);
    else newSet.add(date);
    setExpandedDates(newSet);
  };

  const collapseAll = () => setExpandedDates(new Set());
  const expandAll = () => setExpandedDates(new Set(groupedByDate.map(g => g.date)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achats & Dépenses de Production</h1>
          <p className="text-muted-foreground text-sm">Gestion des intrants, fournitures et dépenses opérationnelles du site.</p>
        </div>
        <button 
          onClick={() => openModal()}
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-soft-sm transition-all disabled:opacity-50"
        >
          <Plus size={18} /> Nouvelle Dépense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4 group hover:-translate-y-1 transition-all">
           <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform"><ShoppingCart size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Dépensé (Filtre)</p>
              <p className="text-2xl font-bold font-mono text-foreground">{totalAmount.toLocaleString()} <span className="text-sm font-normal">F</span></p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4 group hover:-translate-y-1 transition-all">
           <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><Coins size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Opérations</p>
              <p className="text-2xl font-bold font-mono text-foreground">{filteredExpenses.length}</p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4 group hover:-translate-y-1 transition-all">
           <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Moyenne / Op</p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {filteredExpenses.length > 0 ? Math.round(totalAmount / filteredExpenses.length).toLocaleString() : 0} <span className="text-sm font-normal">F</span>
              </p>
           </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center border-b border-border/50 pb-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher libellé, pièce, responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-muted-foreground" />
            <select 
              className="border border-input rounded-lg px-3 py-2 text-sm bg-background"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Toutes Catégories</option>
              {categories.map(c => <option key={c.id_categorie} value={c.id_categorie}>{c.nom_categorie}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
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

            <button 
              onClick={() => setIsGrouped(!isGrouped)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${isGrouped ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
            >
              {isGrouped ? <Layers size={14} /> : <List size={14} />}
              {isGrouped ? 'Grouper par date' : 'Liste à plat'}
            </button>

            {/* Year Filter */}
            <div className="flex items-center gap-2 shrink-0 bg-background border border-input rounded-lg px-3 py-2">
              <Calendar size={14} className="text-muted-foreground" />
              <select 
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="all">Toutes les années</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {isGrouped && (
               <>
                 <button onClick={expandAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border bg-card hover:bg-muted text-muted-foreground transition-all">
                    <Maximize2 size={12} /> Tout développer
                 </button>
                 <button onClick={collapseAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border bg-card hover:bg-muted text-muted-foreground transition-all">
                    <Minimize2 size={12} /> Réduire tout
                 </button>
               </>
             )}
             <button onClick={fetchData} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-all">
                <RefreshCw size={14} />
             </button>
          </div>
        </div>
      </div>

      {/* Expenses Content */}
      <div className="flex flex-col gap-4 min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground"><RefreshCw size={32} className="animate-spin mx-auto mb-4" /> Chargement...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border italic">Aucune dépense ne correspond aux filtres.</div>
        ) : isGrouped ? (
          /* Grouped View (Accordions) */
          groupedByDate.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            return (
              <div key={group.date} className="accordion-item shadow-soft-sm overflow-hidden">
                <button 
                  onClick={() => toggleDate(group.date)}
                  className="accordion-toggle px-6 py-4 bg-card hover:bg-muted/20 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary'}`}>
                      <ChevronRight size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="flex flex-col text-left">
                       <span className="text-lg font-bold text-foreground">
                         {new Date(group.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                       </span>
                       <span className="text-xs text-muted-foreground font-medium">{group.items.length} Opérations</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 mr-4 text-right">
                    <div className="hidden sm:block">
                       <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Total Jour</p>
                       <p className="font-mono font-bold text-primary">{group.totalSpent.toLocaleString()} F</p>
                    </div>
                  </div>
                </button>

                <div className={`accordion-content ${!isExpanded ? 'hidden' : 'animate-in slide-in-from-top-2'}`}>
                  <div className="w-full overflow-x-auto">
                    <table className="table w-full border-t border-border">
                      <thead className="bg-primary/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-widest">Libellé</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-widest">Catégorie / Code</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-widest">Responsable</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-widest">Mode</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-primary uppercase tracking-widest">Montant</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-primary uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {group.items.map(e => (
                          <tr key={e.id_depense} className={`transition-colors ${e.depense_en_attente ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-muted/10'}`}>
                            <td className="px-6 py-4">
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                     <span className={`font-bold text-sm ${e.depense_en_attente ? 'text-red-700' : 'text-foreground'}`}>{e.libelle}</span>
                                     {e.depense_en_attente && (
                                       <span className="badge badge-soft badge-error text-[10px] font-black uppercase flex items-center gap-1">
                                         <Clock size={10} /> En attente
                                       </span>
                                     )}
                                  </div>
                                  {e.reference_piece && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <FileText size={10} /> {e.reference_piece}
                                    </span>
                                  )}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-1">
                                  <span className="badge badge-soft badge-secondary text-[10px] w-fit font-bold uppercase">{e.nom_categorie}</span>
                                  <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                                     <Code size={10} /> {e.code_analytique}
                                  </span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                                  <User size={14} className="text-muted-foreground" />
                                  {e.responsable_nom}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                  <CreditCard size={14} /> {e.nom_mode}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className={`text-sm font-bold font-mono ${e.depense_en_attente ? 'text-red-600' : 'text-primary'}`}>{Number(e.montant).toLocaleString()} F</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openModal(e)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(e.id_depense)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                              </div>
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
        ) : (
          /* Flat List View */
          <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-primary/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-widest">Date & Libellé</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-widest">Catégorie / Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-widest">Responsable</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-widest">Mode</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-primary uppercase tracking-widest">Montant</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-primary uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredExpenses.map(e => (
                    <tr key={e.id_depense} className={`transition-colors ${e.depense_en_attente ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-muted/20'}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar size={12} /> {new Date(e.date_operation).toLocaleDateString('fr-FR')}
                            {e.reference_piece && (
                              <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded font-mono">
                                <FileText size={10} /> {e.reference_piece}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                             <span className={`font-bold text-sm ${e.depense_en_attente ? 'text-red-700' : 'text-foreground'}`}>{e.libelle}</span>
                             {e.depense_en_attente && (
                               <span className="badge badge-soft badge-error text-[10px] font-black uppercase flex items-center gap-1">
                                 <Clock size={10} /> En attente
                               </span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="badge badge-soft badge-secondary text-[10px] w-fit font-bold uppercase">{e.nom_categorie}</span>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                            <Code size={10} /> {e.code_analytique}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                          <User size={14} className="text-muted-foreground" />
                          {e.responsable_nom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <CreditCard size={14} /> {e.nom_mode}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold font-mono ${e.depense_en_attente ? 'text-red-600' : 'text-primary'}`}>{Number(e.montant).toLocaleString()} F</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openModal(e)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(e.id_depense)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                {formData.id_depense ? 'Modifier Dépense' : 'Nouvelle Dépense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                     <input type="date" required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.date_operation || ''} onChange={e => setFormData({...formData, date_operation: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Libellé / Désignation</label>
                     <input type="text" required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.libelle || ''} onChange={e => setFormData({...formData, libelle: e.target.value})} placeholder="Ex: Achat sacs vides, Réparation machine..." />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Montant (FCFA)</label>
                     <input type="number" required min="0" className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono font-bold" value={formData.montant || ''} onChange={e => setFormData({...formData, montant: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Référence Pièce (Optionnel)</label>
                     <input type="text" className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.reference_piece || ''} onChange={e => setFormData({...formData, reference_piece: e.target.value})} placeholder="Ex: FACT-2025-001" />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Catégorie</label>
                     <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.id_categorie || ''} onChange={e => setFormData({...formData, id_categorie: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {categories.map(c => <option key={c.id_categorie} value={c.id_categorie}>{c.nom_categorie}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Mode de Paiement</label>
                     <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.id_mode_paiement || ''} onChange={e => setFormData({...formData, id_mode_paiement: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {modes.map(m => <option key={m.id_mode} value={m.id_mode}>{m.nom_mode}</option>)}
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Code Analytique</label>
                     <select className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.id_code_analytique || ''} onChange={e => setFormData({...formData, id_code_analytique: e.target.value})}>
                        <option value="">Aucun</option>
                        {codes.map(c => <option key={c.id_code} value={c.id_code}>{c.code}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Responsable</label>
                     <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.id_responsable || ''} onChange={e => setFormData({...formData, id_responsable: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {personnel.map(p => <option key={p.id_personnel} value={p.id_personnel}>{p.prenom} {p.nom}</option>)}
                     </select>
                  </div>
               </div>

               <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs border border-blue-100">
                  <Info size={16} />
                  <span>Cette dépense sera indexée et rattachée à l'historique financier du site de production.</span>
               </div>

               {/* Standby Warning Section - MOVED TO BOTTOM */}
               <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${formData.depense_en_attente ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${formData.depense_en_attente ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                        <AlertCircle size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold">Statut de finalisation</p>
                        <p className="text-xs opacity-70">Cochez si la dépense est en attente de justificatif ou de validation.</p>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!formData.depense_en_attente}
                      onChange={e => setFormData({...formData, depense_en_attente: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
               </div>

               <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl text-sm font-bold transition-colors">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold shadow-soft-xl flex items-center gap-2 transition-all active:scale-95">
                    <Save size={18} /> {formData.id_depense ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
