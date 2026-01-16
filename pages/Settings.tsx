
import { useState, useEffect, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { Map, MapPin, Briefcase, Plus, Trash2, Edit2, ChevronRight, X, Users, Search, Phone, Building2, User, Filter, Layers, Save, Ruler, Info } from 'lucide-react';
import { Region, Department, Commune, Project, Operator } from '../types';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'geographic' | 'projects' | 'operators';
type GeoTab = 'regions' | 'departments' | 'communes';

export const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('geographic');
  const [geoTab, setGeoTab] = useState<GeoTab>('regions');
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usedProjectIds, setUsedProjectIds] = useState<Set<string>>(new Set());
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, d, c, p, used, o] = await Promise.all([
        db.getRegions(), 
        db.getDepartments(), 
        db.getCommunes(), 
        db.getProjects(), 
        db.getUsedProjectIds(), 
        db.getOperators()
      ]);
      setRegions(r); 
      setDepartments(d); 
      setCommunes(c); 
      setProjects(p); 
      setUsedProjectIds(used); 
      setOperators(o);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const openModal = (type: string, item: any = {}) => {
    if (isVisitor) return;
    setModalType(type);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      let table = '';
      if (modalType === 'region') table = 'regions';
      if (modalType === 'department') table = 'departments';
      if (modalType === 'commune') table = 'communes';
      if (modalType === 'project') table = 'project';
      if (modalType === 'operator') table = 'operators';

      const payload = { ...formData };
      
      // Data transformations
      if (modalType === 'project') { 
        payload.numero_phase = Number(payload.numero_phase); 
        payload.tonnage_total = Number(payload.tonnage_total); 
      }
      if (modalType === 'commune') { 
        payload.distance_mine = payload.distance_mine ? Number(payload.distance_mine) : null; 
      }
      if (modalType === 'operator') { 
        payload.operateur_coop_gie = !!payload.is_coop; 
        payload.contact_info = payload.phone;
        // Clean UI-only fields
        delete payload.is_coop;
        delete payload.phone;
        delete payload.commune_name;
        delete payload.project_name;
        delete payload.project;
        delete payload.project_id;
        // Map project link correctly
        payload.projet_id = formData.projet_id; 
      }

      if (formData.id) {
        await db.updateItem(table, formData.id, payload);
      } else {
        await db.createItem(table, payload);
      }

      setIsModalOpen(false);
      setFormData({});
      fetchData();
    } catch (error) { 
      console.error(error);
      alert('Erreur lors de l\'enregistrement.'); 
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (isVisitor) return;
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    try { 
      await db.deleteItem(table, id); 
      fetchData(); 
    } catch (e) { 
      alert('Impossible de supprimer. L\'élément est peut-être lié à d\'autres données.'); 
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Chargement des paramètres...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres Système</h1>
          <p className="text-muted-foreground text-sm">Gestion des données de référence : géographie, phases et acteurs.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border">
        <button onClick={() => setActiveTab('geographic')} className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'geographic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Géographie</button>
        <button onClick={() => setActiveTab('projects')} className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Projets</button>
        <button onClick={() => setActiveTab('operators')} className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'operators' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Opérateurs</button>
      </div>

      {activeTab === 'geographic' && (
        <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 capitalize">
                 <MapPin size={20} className="text-primary" /> Configuration Géographique
              </h2>
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border w-fit shadow-soft-xs">
                <button onClick={() => setGeoTab('regions')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${geoTab === 'regions' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>Régions</button>
                <button onClick={() => setGeoTab('departments')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${geoTab === 'departments' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>Départements</button>
                <button onClick={() => setGeoTab('communes')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${geoTab === 'communes' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>Communes</button>
              </div>
            </div>
            <button 
              onClick={() => openModal(geoTab.slice(0, -1))} 
              disabled={isVisitor}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-soft-sm transition-all disabled:opacity-50 h-fit"
            >
              <Plus size={18} /> Ajouter {geoTab.slice(0, -1)}
            </button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  {geoTab === 'communes' && <th>Dist. Mine (km)</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {geoTab === 'regions' && regions.map(item => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.name}</td>
                    <td className="font-mono">{item.code}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('region', item)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('regions', item.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {geoTab === 'departments' && departments.map(item => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.name}</td>
                    <td className="font-mono">{item.code}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('department', item)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('departments', item.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {geoTab === 'communes' && communes.map(item => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.name}</td>
                    <td className="font-mono">{item.code}</td>
                    <td>{item.distance_mine || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('commune', item)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('communes', item.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
               <Briefcase size={20} className="text-primary" /> Phases de Campagne
            </h2>
            <button 
              onClick={() => openModal('project')} 
              disabled={isVisitor}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Plus size={18} /> Ajouter une Phase
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Phase</th>
                  <th>N° Marché</th>
                  <th>Tonnage Total</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td className="font-bold">Phase {p.numero_phase}</td>
                    <td className="font-mono text-sm">{p.numero_marche || '-'}</td>
                    <td className="font-mono font-bold text-primary">{p.tonnage_total.toLocaleString()} T</td>
                    <td className="text-muted-foreground">{p.date_mise_disposition ? new Date(p.date_mise_disposition).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('project', p)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('project', p.id)} disabled={isVisitor || usedProjectIds.has(p.id)} className="btn btn-circle btn-text btn-sm text-destructive disabled:opacity-30"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'operators' && (
        <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
               <Users size={20} className="text-primary" /> Annuaire Opérateurs
            </h2>
            <button 
              onClick={() => openModal('operator')} 
              disabled={isVisitor}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Plus size={18} /> Ajouter un Opérateur
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Commune</th>
                  <th>Phase Projet</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.map(op => (
                  <tr key={op.id}>
                    <td>
                       <div className="flex flex-col">
                          <span className="font-bold text-foreground">{op.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{op.phone || 'Sans téléphone'}</span>
                       </div>
                    </td>
                    <td>
                       <span className={`badge badge-soft text-[10px] font-black uppercase ${op.is_coop ? 'badge-primary' : 'badge-secondary'}`}>
                          {op.is_coop ? 'Coopérative / GIE' : 'Individuel'}
                       </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{communes.find(c => c.id === op.commune_id)?.name || '-'}</td>
                    <td><span className="badge badge-soft badge-secondary text-[10px] font-bold">Phase {projects.find(p => p.id === op.projet_id)?.numero_phase || '-'}</span></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('operator', op)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('operators', op.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Setting Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-foreground capitalize">
                {formData.id ? 'Modifier' : 'Ajouter'} {modalType}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
               {/* Fields based on modalType */}
               {(modalType === 'region' || modalType === 'department' || modalType === 'commune') && (
                 <>
                   {modalType === 'department' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Région Parenthèse</label>
                        <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.region_id || ''} onChange={e => setFormData({...formData, region_id: e.target.value})}>
                           <option value="">Sélectionner...</option>
                           {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                   )}
                   {modalType === 'commune' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Département Parenthèse</label>
                        <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.department_id || ''} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                           <option value="">Sélectionner...</option>
                           {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                   )}
                   <div>
                     <label className="block text-sm font-medium mb-1">Nom</label>
                     <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Thiès" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Code</label>
                     <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono uppercase" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="Ex: TH" />
                   </div>
                   {modalType === 'commune' && (
                     <div>
                       <label className="block text-sm font-medium mb-1">Distance Mine (km)</label>
                       <input type="number" className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.distance_mine || ''} onChange={e => setFormData({...formData, distance_mine: e.target.value})} />
                     </div>
                   )}
                 </>
               )}

               {modalType === 'project' && (
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Phase N°</label>
                        <input type="number" required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.numero_phase || ''} onChange={e => setFormData({...formData, numero_phase: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tonnage Total</label>
                        <input type="number" required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.tonnage_total || ''} onChange={e => setFormData({...formData, tonnage_total: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Référence Marché</label>
                      <input className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono" value={formData.numero_marche || ''} onChange={e => setFormData({...formData, numero_marche: e.target.value})} placeholder="Ex: M-2025-001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date mise à dispo</label>
                      <input type="date" className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.date_mise_disposition || ''} onChange={e => setFormData({...formData, date_mise_disposition: e.target.value})} />
                    </div>
                 </div>
               )}

               {modalType === 'operator' && (
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom complet</label>
                      <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Coopérative de Thiès" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium mb-1">Téléphone</label>
                         <input className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                       </div>
                       <div>
                         <label className="block text-sm font-medium mb-1">Type</label>
                         <select className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.is_coop ? 'true' : 'false'} onChange={e => setFormData({...formData, is_coop: e.target.value === 'true'})}>
                            <option value="false">Individuel</option>
                            <option value="true">Coopérative / GIE</option>
                         </select>
                       </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Commune Siège</label>
                      <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.commune_id || ''} onChange={e => setFormData({...formData, commune_id: e.target.value})}>
                         <option value="">Sélectionner...</option>
                         {communes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phase Projet</label>
                      <select required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.projet_id || ''} onChange={e => setFormData({...formData, projet_id: e.target.value})}>
                         <option value="">Sélectionner...</option>
                         {projects.map(p => <option key={p.id} value={p.id}>Phase {p.numero_phase}</option>)}
                      </select>
                    </div>
                 </div>
               )}

               <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl text-sm font-bold">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold shadow-soft-xl flex items-center gap-2 transition-all active:scale-95">
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
