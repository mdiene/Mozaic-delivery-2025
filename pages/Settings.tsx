
import { useState, useEffect, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { Map, MapPin, Briefcase, Plus, Trash2, Edit2, ChevronRight, X, Users, Search, Phone, Building2, User, Filter, Layers, Save, Ruler } from 'lucide-react';
import { Region, Department, Commune, Project, Operator } from '../types';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'geographic' | 'projects' | 'operators';
type GeoTab = 'regions' | 'departments' | 'communes';

export const Settings = () => {
  const { user } = useAuth();
  const isVisitor = user?.role === 'VISITOR';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [communeSearch, setCommuneSearch] = useState('');
  const [isCommuneDropdownOpen, setIsCommuneDropdownOpen] = useState(false);
  const [filterDeptId, setFilterDeptId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, d, c, p, used, o] = await Promise.all([db.getRegions(), db.getDepartments(), db.getCommunes(), db.getProjects(), db.getUsedProjectIds(), db.getOperators()]);
      setRegions(r); setDepartments(d); setCommunes(c); setProjects(p); setUsedProjectIds(used); setOperators(o);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (table: string, id: string) => {
    if (isVisitor) return;
    if (!confirm('Êtes-vous sûr ?')) return;
    try { await db.deleteItem(table, id); fetchData(); } catch (e) { alert('Erreur suppression.'); }
  };

  const handleEdit = (type: string, item: any) => {
    if (isVisitor) return;
    setModalType(type);
    const data = { ...item };
    if (type === 'operator') {
      const commune = communes.find(c => c.id === item.commune_id);
      setCommuneSearch(commune?.name || '');
      if (item.phone) data.phone = item.phone;
    }
    setFormData(data); setIsModalOpen(true);
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
      let payload = { ...formData };
      if (modalType === 'project') { payload.numero_phase = Number(payload.numero_phase); payload.tonnage_total = Number(payload.tonnage_total); }
      if (modalType === 'commune') { payload.distance_mine = payload.distance_mine ? Number(payload.distance_mine) : null; }
      if (modalType === 'operator') { payload.operateur_coop_gie = payload.is_coop; if (!payload.is_coop) payload.coop_name = null; payload.contact_info = payload.phone; delete payload.is_coop; delete payload.phone; delete payload.commune_name; delete payload.project_name; delete payload.project; delete payload.project_id; }
      if (!payload.id) delete payload.id;
      if (formData.id) await db.updateItem(table, formData.id, payload); else await db.createItem(table, payload);
      setIsModalOpen(false); setFormData({}); fetchData();
    } catch (error) { alert('Échec.'); }
  };

  const openModal = (type: string) => { if (isVisitor) return; setModalType(type); setFormData({}); setCommuneSearch(''); setIsModalOpen(true); };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres Système</h1>
      <div className="flex gap-4 border-b border-border">
        <button onClick={() => setActiveTab('geographic')} className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'geographic' ? 'border-primary text-primary' : 'border-transparent'}`}>Géographie</button>
        <button onClick={() => setActiveTab('projects')} className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent'}`}>Projets</button>
        <button onClick={() => setActiveTab('operators')} className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'operators' ? 'border-primary text-primary' : 'border-transparent'}`}>Opérateurs</button>
      </div>

      {activeTab === 'operators' && (
        <div className="bg-card p-6 rounded-xl border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Users size={20} className="text-primary" /> Opérateurs</h2>
            <button onClick={() => openModal('operator')} disabled={isVisitor} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:grayscale">Ajouter Opérateur</button>
          </div>
          <table className="table">
            <thead><tr><th>Nom</th><th>Type</th><th>Commune</th><th>Projet</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {operators.filter(op => selectedPhaseFilter === 'all' ? true : op.projet_id === selectedPhaseFilter).map(op => (
                <tr key={op.id}>
                  <td>{op.name}</td>
                  <td>{op.is_coop ? 'Coop' : 'Indiv'}</td>
                  <td>{communes.find(c => c.id === op.commune_id)?.name || '-'}</td>
                  <td>{op.project_name}</td>
                  <td className="text-right">
                    <button onClick={() => handleEdit('operator', op)} disabled={isVisitor} className="btn btn-circle btn-text disabled:opacity-30"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete('operators', op.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-text-error disabled:opacity-30"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-card p-6 rounded-xl border">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold">Projets</h2>
            <button onClick={() => openModal('project')} disabled={isVisitor} className="bg-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Ajouter Projet</button>
          </div>
          <table className="table">
            <thead><tr><th>Phase</th><th>Marché</th><th>Tonnage</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>{p.numero_phase}</td><td>{p.numero_marche}</td><td>{p.tonnage_total} T</td>
                  <td className="text-right">
                    <button onClick={() => handleEdit('project', p)} disabled={isVisitor} className="btn btn-circle disabled:opacity-30"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete('project', p.id)} disabled={isVisitor || usedProjectIds.has(p.id)} className="btn btn-circle disabled:opacity-30"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'geographic' && (
        <div className="bg-card p-6 rounded-xl border">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold capitalize">{geoTab}</h2>
            <button onClick={() => openModal(geoTab.slice(0, -1))} disabled={isVisitor} className="bg-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Ajouter {geoTab.slice(0,-1)}</button>
          </div>
          <table className="table">
            <thead><tr><th>Nom</th><th>Code</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {geoTab === 'regions' && regions.map(item => (
                <tr key={item.id}><td>{item.name}</td><td>{item.code}</td><td className="text-right"><button onClick={() => handleEdit('region', item)} disabled={isVisitor} className="btn btn-circle disabled:opacity-30"><Edit2 size={16} /></button><button onClick={() => handleDelete('regions', item.id)} disabled={isVisitor} className="btn btn-circle disabled:opacity-30"><Trash2 size={16} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
