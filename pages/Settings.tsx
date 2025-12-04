import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Map, MapPin, Briefcase, Plus, Trash2, Edit2, ChevronRight, X, Users, Search, Phone } from 'lucide-react';
import { Region, Department, Commune, Project, Operator } from '../types';

type Tab = 'geographic' | 'projects' | 'operators';
type GeoTab = 'regions' | 'departments' | 'communes';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('geographic');
  
  // Geographic State
  const [geoTab, setGeoTab] = useState<GeoTab>('regions');
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  
  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [usedProjectIds, setUsedProjectIds] = useState<Set<string>>(new Set());

  // Operators State
  const [operators, setOperators] = useState<Operator[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>(''); // 'region', 'department', 'commune', 'project', 'operator'
  const [formData, setFormData] = useState<any>({});
  
  // Searchable Select State
  const [communeSearch, setCommuneSearch] = useState('');
  const [isCommuneDropdownOpen, setIsCommuneDropdownOpen] = useState(false);

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
      console.error("Error fetching settings data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await db.deleteItem(table, id);
      fetchData(); // Reload
    } catch (e) {
      alert('Error deleting item. It might be referenced by other records.');
    }
  };

  const handleEdit = (type: string, item: any) => {
    setModalType(type);
    const data = { ...item };
    
    // Setup for edit specific fields
    if (type === 'operator') {
      setCommuneSearch(item.commune_name || '');
      // Ensure specific fields are present for form state
      if (item.phone) data.phone = item.phone;
    }
    
    setFormData(data);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let table = '';
      if (modalType === 'region') table = 'regions';
      if (modalType === 'department') table = 'departments';
      if (modalType === 'commune') table = 'communes';
      if (modalType === 'project') table = 'project';
      if (modalType === 'operator') table = 'operators';

      // Prepare payload
      let payload = { ...formData };
      
      // Project specific types
      if (modalType === 'project') {
        payload.numero_phase = Number(payload.numero_phase);
        payload.tonnage_total = Number(payload.tonnage_total);
      }
      
      // Operator specific mapping
      if (modalType === 'operator') {
        payload.operateur_coop_gie = payload.is_coop; // Map frontend bool to DB column
        if (!payload.is_coop) payload.coop_name = null; // Clear coop name if individual
        payload.contact_info = { phone: payload.phone }; // Map phone to jsonb
        
        // Remove UI helper props
        delete payload.is_coop;
        delete payload.phone;
        delete payload.commune_name;
      }
      
      // Remove ID if it's empty or null to allow DB to generate it
      if (!payload.id) {
         delete payload.id;
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
      alert('Failed to save. Please check console for details.');
    }
  };

  const openModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setCommuneSearch('');
    setIsModalOpen(true);
  };

  // Check for duplicate phase number
  const isDuplicatePhase = modalType === 'project' && projects.some(p => 
    String(p.numero_phase) === String(formData.numero_phase) && 
    p.id !== formData.id // Allow same phase if we are editing the same project
  );

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Settings...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground text-sm">Manage configuration, reference data, and projects.</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('geographic')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'geographic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Geographic Data
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveTab('operators')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'operators' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Operators
        </button>
      </div>

      {/* OPERATORS TAB */}
      {activeTab === 'operators' && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" /> Operators
            </h2>
            <button 
              onClick={() => openModal('operator')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90"
            >
              <Plus size={16} /> Add Operator
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Commune</th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone size={14} /> Phone
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {operators.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No operators found. Add one to get started.</td>
                  </tr>
                )}
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{op.name}</div>
                      {op.is_coop && <div className="text-xs text-muted-foreground">{op.coop_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        op.is_coop 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' 
                        : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {op.is_coop ? 'Cooperative / GIE' : 'Individual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{op.commune_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {op.phone ? (
                        <a href={`tel:${op.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
                           {op.phone}
                        </a>
                      ) : (
                        <span className="opacity-50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit('operator', op)} 
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                        title="Edit Operator"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete('operators', op.id)} 
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                        title="Delete Operator"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase size={20} className="text-primary" /> Projects
            </h2>
            <button 
              onClick={() => openModal('project')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90"
            >
              <Plus size={16} /> Add Project
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Market #</th>
                  <th className="px-4 py-3">Disp. #</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total Tonnage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No projects found. Add one to get started.</td>
                  </tr>
                )}
                {projects.map((p) => {
                  const isUsed = usedProjectIds.has(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.numero_marche}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.numero_bon_disposition}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.numero_phase}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.date_mise_disposition ? new Date(p.date_mise_disposition).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-foreground font-mono">{p.tonnage_total} T</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit('project', p)} 
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                          title="Edit Project"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => !isUsed && handleDelete('project', p.id)} 
                          disabled={isUsed}
                          className={`p-2 rounded-lg transition-colors ${
                            isUsed 
                              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                          }`}
                          title={isUsed ? "Cannot delete: Project is currently assigned to allocations" : "Delete Project"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GEOGRAPHIC TAB */}
      {activeTab === 'geographic' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar for Geo Tabs */}
          <div className="bg-card p-2 rounded-xl border border-border shadow-sm h-fit">
            <button
              onClick={() => setGeoTab('regions')}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm mb-1 ${
                geoTab === 'regions' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2"><Map size={16} /> Regions</span>
              <ChevronRight size={14} className={geoTab === 'regions' ? 'opacity-100' : 'opacity-0'} />
            </button>
            <button
              onClick={() => setGeoTab('departments')}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm mb-1 ${
                geoTab === 'departments' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2"><MapPin size={16} /> Departments</span>
              <ChevronRight size={14} className={geoTab === 'departments' ? 'opacity-100' : 'opacity-0'} />
            </button>
            <button
              onClick={() => setGeoTab('communes')}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm ${
                geoTab === 'communes' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2"><MapPin size={16} /> Communes</span>
              <ChevronRight size={14} className={geoTab === 'communes' ? 'opacity-100' : 'opacity-0'} />
            </button>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 bg-card p-6 rounded-xl border border-border shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-foreground capitalize">{geoTab}</h2>
              <button 
                onClick={() => openModal(geoTab.slice(0, -1))} // remove 's'
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90"
              >
                <Plus size={16} /> Add {geoTab.slice(0, -1)}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Code</th>
                    {geoTab !== 'regions' && <th className="px-4 py-3">Parent</th>}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {geoTab === 'regions' && regions.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit('regions', item)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('regions', item.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {geoTab === 'departments' && departments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{regions.find(r => r.id === item.region_id)?.name}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit('departments', item)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('departments', item.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {geoTab === 'communes' && communes.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{departments.find(d => d.id === item.department_id)?.name}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                         <button onClick={() => handleEdit('communes', item)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('communes', item.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Generic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-visible animate-fade-in border border-border">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground capitalize">
                {formData.id ? 'Edit' : 'Add'} {modalType}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Common Fields (Name/Code) for Geo */}
              {(modalType === 'region' || modalType === 'department' || modalType === 'commune') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                    <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Code</label>
                    <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.code || ''} 
                      onChange={e => setFormData({...formData, code: e.target.value})} 
                    />
                  </div>
                </>
              )}

              {/* Specific Geo Logic */}
              {modalType === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Region</label>
                  <select required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.region_id || ''}
                    onChange={e => setFormData({...formData, region_id: e.target.value})}
                  >
                    <option value="">Select Region...</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}

              {modalType === 'commune' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                  <select required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.department_id || ''}
                    onChange={e => setFormData({...formData, department_id: e.target.value})}
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* Project Fields */}
              {modalType === 'project' && (
                 <>
                   <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numero Marche</label>
                    <input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.numero_marche || ''} 
                      onChange={e => setFormData({...formData, numero_marche: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numero Bon Disposition</label>
                    <input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.numero_bon_disposition || ''} 
                      onChange={e => setFormData({...formData, numero_bon_disposition: e.target.value})} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Phase</label>
                      <input type="number" required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                        value={formData.numero_phase || ''} 
                        onChange={e => setFormData({...formData, numero_phase: e.target.value})} 
                      />
                      {isDuplicatePhase && (
                        <p className="text-destructive text-xs mt-1 animate-fade-in">
                          Phase number already used. Please change.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tonnage Total</label>
                      <input type="number" required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                        value={formData.tonnage_total || ''} 
                        onChange={e => setFormData({...formData, tonnage_total: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Date Mise Disposition</label>
                    <input type="date" required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.date_mise_disposition || ''} 
                      onChange={e => setFormData({...formData, date_mise_disposition: e.target.value})} 
                    />
                  </div>
                 </>
              )}

              {/* Operator Fields */}
              {modalType === 'operator' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Operator Name</label>
                    <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" className="rounded border-input text-primary focus:ring-primary"
                        checked={formData.is_coop || false}
                        onChange={e => setFormData({...formData, is_coop: e.target.checked})}
                      />
                      Is Cooperative / GIE
                    </label>
                  </div>
                  {formData.is_coop && (
                    <div className="animate-fade-in">
                      <label className="block text-sm font-medium text-foreground mb-1">Cooperative Name</label>
                      <input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                        value={formData.coop_name || ''} 
                        onChange={e => setFormData({...formData, coop_name: e.target.value})} 
                        placeholder="e.g. GIE And Suxali"
                      />
                    </div>
                  )}
                  
                  {/* Searchable Commune Select */}
                  <div className="relative">
                     <label className="block text-sm font-medium text-foreground mb-1">Commune</label>
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                       <input 
                         type="text" 
                         required 
                         className="w-full pl-9 border border-input rounded-lg p-2 text-sm bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none" 
                         value={communeSearch}
                         placeholder="Search commune..."
                         onFocus={() => setIsCommuneDropdownOpen(true)}
                         onChange={(e) => {
                           setCommuneSearch(e.target.value);
                           setIsCommuneDropdownOpen(true);
                           // Clear ID if user modifies text without selecting
                           if (formData.commune_id) setFormData({...formData, commune_id: ''});
                         }}
                       />
                     </div>
                     {isCommuneDropdownOpen && (
                       <ul className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                         {communes
                           .filter(c => c.name.toLowerCase().includes(communeSearch.toLowerCase()))
                           .map(c => (
                             <li 
                               key={c.id}
                               className="px-4 py-2 hover:bg-muted text-sm cursor-pointer text-popover-foreground"
                               onClick={() => {
                                 setFormData({...formData, commune_id: c.id});
                                 setCommuneSearch(c.name);
                                 setIsCommuneDropdownOpen(false);
                               }}
                             >
                               {c.name}
                             </li>
                           ))
                         }
                         {communes.filter(c => c.name.toLowerCase().includes(communeSearch.toLowerCase())).length === 0 && (
                           <li className="px-4 py-2 text-sm text-muted-foreground">No communes found</li>
                         )}
                       </ul>
                     )}
                     {/* Hidden input to enforce requirement */}
                     <input type="text" className="sr-only" required value={formData.commune_id || ''} onChange={()=>{}} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                    <input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="+221 ..."
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isDuplicatePhase}
                  className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                    isDuplicatePhase 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};