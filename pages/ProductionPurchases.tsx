
import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { db } from '../services/db';
import { 
  AdminCategoryDepense, AdminModePaiement, AdminCodeAnalytique, AdminPersonnel 
} from '../types';
import { 
  ShoppingCart, Coins, TrendingUp, Plus, Search, Calendar, Layers, CreditCard, 
  Code, User, FileText, X, Save, Edit2, Trash2, RefreshCw, Filter, Receipt, Info
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

  const openModal = (expense?: any) => {
    if (isVisitor) return;
    if (expense) {
      setFormData({ ...expense });
    } else {
      setFormData({
        date_operation: new Date().toISOString().split('T')[0],
        libelle: '',
        montant: 0,
        reference_piece: ''
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
        updated_at: new Date().toISOString()
      };

      // Track who made the entry/update if user ID is available
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
  }, [expenses, searchTerm, filterCategory]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.montant), 0);
  }, [filteredExpenses]);

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
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Dépensé</p>
              <p className="text-2xl font-bold font-mono text-foreground">{totalAmount.toLocaleString()} <span className="text-sm font-normal">F</span></p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4 group hover:-translate-y-1 transition-all">
           <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><Coins size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Nombre d'opérations</p>
              <p className="text-2xl font-bold font-mono text-foreground">{filteredExpenses.length}</p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4 group hover:-translate-y-1 transition-all">
           <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Dernière Opération</p>
              <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                {filteredExpenses[0]?.libelle || 'Aucune'}
              </p>
           </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
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

      {/* Expenses Table */}
      <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground"><RefreshCw size={32} className="animate-spin mx-auto mb-4" /> Chargement...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Aucune dépense enregistrée.</div>
          ) : (
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
                  <tr key={e.id_depense} className="hover:bg-muted/20 transition-colors">
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
                          <span className="font-bold text-foreground text-sm">{e.libelle}</span>
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
                       <span className="text-sm font-bold font-mono text-primary">{Number(e.montant).toLocaleString()} F</span>
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
          )}
        </div>
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
            
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
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
