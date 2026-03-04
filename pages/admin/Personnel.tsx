
import React, { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { AdminPoste, AdminPersonnel } from '../../types';
import { 
  Plus, Edit2, Trash2, X, Save, RefreshCw, Users, Phone, User, Settings, Search, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const PersonnelPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [postes, setPostes] = useState<AdminPoste[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, pers] = await Promise.all([
        db.getAdminPostes(),
        db.getAdminPersonnel()
      ]);
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
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      const payload = { ...formData };
      delete payload.poste_titre;
      delete payload.admin_postes;

      if (!payload.id_poste) payload.id_poste = null;

      if (payload.id_personnel) {
        const id = payload.id_personnel;
        const updateData = { ...payload };
        delete updateData.id_personnel;
        await db.updateItem('admin_personnel', id, updateData);
      } else {
        delete payload.id_personnel;
        await db.createItem('admin_personnel', payload);
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      await db.deleteItem('admin_personnel', id);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Impossible de supprimer. Cet employé est probablement lié à d\'autres données.');
    }
  };

  const filteredPersonnel = personnel.filter(p => 
    `${p.prenom} ${p.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.poste_titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telephone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Gestion du Personnel</h1>
          <p className="text-muted-foreground text-sm">Gérer les employés, leurs postes et coordonnées.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
          <button 
            onClick={() => openModal()}
            disabled={isVisitor}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Plus size={18} /> Ajouter
          </button>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-soft-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employé</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Poste & Rôle</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-primary" />
                    <span className="text-muted-foreground font-medium">Chargement du personnel...</span>
                  </td>
                </tr>
              ) : filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    Aucun employé trouvé.
                  </td>
                </tr>
              ) : (
                filteredPersonnel.map(p => (
                  <tr key={p.id_personnel} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {p.prenom.charAt(0)}{p.nom.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{p.prenom} {p.nom}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">ID: {p.id_personnel.split('-')[0]}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Settings size={14} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">{p.poste_titre || 'Non assigné'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                        <Phone size={14} className="text-primary" />
                        {p.telephone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(p)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id_personnel)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <User className="text-primary" size={24} />
                  {formData.id_personnel ? 'Modifier l\'Employé' : 'Ajouter un Employé'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prénom</label>
                    <input 
                      required 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                      value={formData.prenom || ''} 
                      onChange={e => setFormData({...formData, prenom: e.target.value})} 
                      placeholder="Prénom" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom</label>
                    <input 
                      required 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                      value={formData.nom || ''} 
                      onChange={e => setFormData({...formData, nom: e.target.value})} 
                      placeholder="Nom" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Poste (Rôle)</label>
                  <select 
                    required 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.id_poste || ''} 
                    onChange={e => setFormData({...formData, id_poste: e.target.value})}
                  >
                    <option value="">Sélectionner un poste...</option>
                    {postes.map(p => <option key={p.id_poste} value={p.id_poste}>{p.titre_poste}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      className="w-full pl-10 pr-4 bg-background border border-border rounded-xl py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                      value={formData.telephone || ''} 
                      onChange={e => setFormData({...formData, telephone: e.target.value})} 
                      placeholder="7x xxx xx xx" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2">
                    <Save size={18} /> Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
