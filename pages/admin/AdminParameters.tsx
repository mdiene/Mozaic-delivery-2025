import React, { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { 
  AdminCategoryDepense, AdminModePaiement, AdminCodeAnalytique, AdminPoste, AdminPersonnel 
} from '../../types';
import { 
  Plus, Edit2, Trash2, X, Save, RefreshCw, Layers, Briefcase, Users, CreditCard, Code, Hash, Phone, User, Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'categories' | 'modes' | 'codes' | 'postes' | 'personnel';

export const AdminParameters = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<AdminCategoryDepense[]>([]);
  const [modes, setModes] = useState<AdminModePaiement[]>([]);
  const [codes, setCodes] = useState<AdminCodeAnalytique[]>([]);
  const [postes, setPostes] = useState<AdminPoste[]>([]);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isManualCategory, setIsManualCategory] = useState(false);
  const isVisitor = user?.role === 'VISITOR';

  const PRELOADED_CATEGORIES = [
    'Technique',
    'Administratif',
    'Management',
    'Sous-Traitant',
    'Interimaire'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, m, an, p, pers] = await Promise.all([
        db.getAdminCategories(),
        db.getAdminModesPaiement(),
        db.getAdminCodesAnalytiques(),
        db.getAdminPostes(),
        db.getAdminPersonnel()
      ]);
      setCategories(c);
      setModes(m);
      setCodes(an);
      setPostes(p);
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

  const openModal = (item?: any) => {
    if (isVisitor) return;
    setFormData(item || {});
    setIsManualCategory(item?.categorie_poste && !PRELOADED_CATEGORIES.includes(item.categorie_poste));
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      let table = '';
      let pk = '';
      if (activeTab === 'categories') { table = 'admin_categories_depense'; pk = 'id_categorie'; }
      else if (activeTab === 'modes') { table = 'admin_modes_paiement'; pk = 'id_mode'; }
      else if (activeTab === 'codes') { table = 'admin_codes_analytiques'; pk = 'id_code'; }
      else if (activeTab === 'postes') { table = 'admin_postes'; pk = 'id_poste'; }
      else if (activeTab === 'personnel') { table = 'admin_personnel'; pk = 'id_personnel'; }

      // Clean payload: remove UI helper fields and empty strings for UUIDs
      const payload = { ...formData };
      delete payload.poste_titre;
      delete payload.admin_postes; // Remove joined object if it exists

      // For personnel, ensure id_poste is null if not selected, rather than an empty string
      if (activeTab === 'personnel' && !payload.id_poste) {
        payload.id_poste = null;
      }

      if (payload[pk]) {
        const id = payload[pk];
        // Don't include PK in the update payload for most DBs
        const updateData = { ...payload };
        delete updateData[pk];
        await db.updateItem(table, id, updateData);
      } else {
        // Remove the empty PK if it's a new item so DB can generate it
        delete payload[pk];
        await db.createItem(table, payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Erreur lors de l\'enregistrement: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      let table = '';
      if (activeTab === 'categories') table = 'admin_categories_depense';
      else if (activeTab === 'modes') table = 'admin_modes_paiement';
      else if (activeTab === 'codes') table = 'admin_codes_analytiques';
      else if (activeTab === 'postes') table = 'admin_postes';
      else if (activeTab === 'personnel') table = 'admin_personnel';

      await db.deleteItem(table, id);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Impossible de supprimer. Cet élément est probablement utilisé ailleurs.');
    }
  };

  const renderContent = () => {
    if (loading) return <div className="p-12 text-center text-muted-foreground"><RefreshCw size={32} className="animate-spin mx-auto mb-4" /> Chargement...</div>;

    switch (activeTab) {
      case 'categories':
        return (
          <table className="table w-full">
            <thead className="bg-primary/5">
              <tr><th className="px-4 py-3 text-left">Nom Catégorie</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id_categorie} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.nom_categorie}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(c)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id_categorie)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'modes':
        return (
          <table className="table w-full">
            <thead className="bg-primary/5">
              <tr><th className="px-4 py-3 text-left">Mode de Paiement</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {modes.map(m => (
                <tr key={m.id_mode} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{m.nom_mode}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(m)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(m.id_mode)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'codes':
        return (
          <table className="table w-full">
            <thead className="bg-primary/5">
              <tr><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id_code} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-4 py-3 text-sm">{c.description}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(c)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id_code)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'postes':
        return (
          <table className="table w-full">
            <thead className="bg-primary/5">
              <tr><th className="px-4 py-3 text-left">Titre du Poste</th><th className="px-4 py-3 text-left">Catégorie</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {postes.map(p => (
                <tr key={p.id_poste} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.titre_poste}</td>
                  <td className="px-4 py-3"><span className="badge badge-soft badge-secondary">{p.categorie_poste}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(p)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id_poste)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'personnel':
        return (
          <table className="table w-full">
            <thead className="bg-primary/5">
              <tr><th className="px-4 py-3 text-left">Nom & Prénom</th><th className="px-4 py-3 text-left">Poste</th><th className="px-4 py-3 text-left">Téléphone</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {personnel.map(p => (
                <tr key={p.id_personnel} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.prenom} {p.nom}</td>
                  <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{p.poste_titre}</span></td>
                  <td className="px-4 py-3 font-mono text-sm">{p.telephone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(p)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id_personnel)} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres Administratifs</h1>
          <p className="text-muted-foreground text-sm">Gérer les référentiels de dépenses, codes analytiques et personnel.</p>
        </div>
        <button 
          onClick={() => openModal()}
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus size={18} /> Ajouter
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-soft-xl overflow-hidden min-h-[500px] flex flex-col">
        <div className="flex border-b border-border bg-muted/20 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('categories')} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'categories' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Layers size={14} /> Catégories</button>
          <button onClick={() => setActiveTab('modes')} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'modes' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><CreditCard size={14} /> Modes Paiement</button>
          <button onClick={() => setActiveTab('codes')} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'codes' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Code size={14} /> Codes Analytiques</button>
          <button onClick={() => setActiveTab('postes')} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'postes' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Briefcase size={14} /> Postes</button>
          <button onClick={() => setActiveTab('personnel')} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'personnel' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Users size={14} /> Personnel</button>
        </div>

        <div className="flex-1 overflow-x-auto">
          {renderContent()}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings className="text-primary" size={18} />
                {formData.id_categorie || formData.id_mode || formData.id_code || formData.id_poste || formData.id_personnel ? 'Modifier' : 'Ajouter'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
               {activeTab === 'categories' && (
                 <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom de la catégorie</label>
                    <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.nom_categorie || ''} onChange={e => setFormData({...formData, nom_categorie: e.target.value})} placeholder="Ex: Maintenance" />
                 </div>
               )}

               {activeTab === 'modes' && (
                 <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom du mode</label>
                    <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.nom_mode || ''} onChange={e => setFormData({...formData, nom_mode: e.target.value})} placeholder="Ex: Espèces, Chèque..." />
                 </div>
               )}

               {activeTab === 'codes' && (
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Code Analytique</label>
                      <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono uppercase" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="Ex: PRJ-25" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                      <textarea className="w-full border border-input rounded-xl p-2.5 text-sm bg-background min-h-[80px]" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description du code..." />
                    </div>
                 </div>
               )}

               {activeTab === 'postes' && (
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Titre du Poste</label>
                      <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.titre_poste || ''} onChange={e => setFormData({...formData, titre_poste: e.target.value})} placeholder="Ex: Chauffeur Chargeuse" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Catégorie</label>
                      <div className="space-y-2">
                        <select 
                          className="w-full border border-input rounded-xl p-2.5 text-sm bg-background"
                          value={isManualCategory ? 'manual' : (formData.categorie_poste || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'manual') {
                              setIsManualCategory(true);
                              setFormData({ ...formData, categorie_poste: '' });
                            } else {
                              setIsManualCategory(false);
                              setFormData({ ...formData, categorie_poste: val });
                            }
                          }}
                        >
                          <option value="">Sélectionner une catégorie...</option>
                          {PRELOADED_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="manual">Autre...</option>
                        </select>
                        
                        {isManualCategory && (
                          <div className="animate-in slide-in-from-top-1">
                            <input 
                              required
                              className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" 
                              value={formData.categorie_poste || ''} 
                              onChange={e => setFormData({...formData, categorie_poste: e.target.value})} 
                              placeholder="Saisir la catégorie manuellement..." 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               )}

               {activeTab === 'personnel' && (
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
                        <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.prenom || ''} onChange={e => setFormData({...formData, prenom: e.target.value})} placeholder="Prénom" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
                        <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.nom || ''} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Nom" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Poste (Rôle)</label>
                      <select 
                        required 
                        className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" 
                        value={formData.id_poste || ''} 
                        onChange={e => setFormData({...formData, id_poste: e.target.value})}
                      >
                        <option value="">Sélectionner un poste...</option>
                        {postes.map(p => <option key={p.id_poste} value={p.id_poste}>{p.titre_poste}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input className="w-full pl-10 pr-4 border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.telephone || ''} onChange={e => setFormData({...formData, telephone: e.target.value})} placeholder="7x xxx xx xx" />
                      </div>
                    </div>
                 </div>
               )}

               <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl text-sm font-bold transition-colors">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold shadow-soft-xl flex items-center gap-2 transition-all">
                    <Save size={18} /> Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
