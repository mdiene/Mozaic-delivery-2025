import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Map, MapPin, Briefcase, Plus, Trash2, Edit2, ChevronRight, X } from 'lucide-react';
import { Region, Department, Commune, Project } from '../types';

type Tab = 'geographic' | 'projects';
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

  // UI State
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>(''); // 'region', 'department', 'commune', 'project'
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, d, c, p] = await Promise.all([
        db.getRegions(),
        db.getDepartments(),
        db.getCommunes(),
        db.getProjects()
      ]);
      setRegions(r);
      setDepartments(d);
      setCommunes(c);
      setProjects(p);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let table = '';
      if (modalType === 'region') table = 'regions';
      if (modalType === 'department') table = 'departments';
      if (modalType === 'commune') table = 'communes';
      if (modalType === 'project') table = 'project';

      await db.createItem(table, formData);
      setIsModalOpen(false);
      setFormData({});
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to save.');
    }
  };

  const openModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setIsModalOpen(true);
  };

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
      </div>

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
                  <th className="px-4 py-3">Total Tonnage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{p.numero_marche}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.numero_bon_disposition}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.numero_phase}</td>
                    <td className="px-4 py-3 text-foreground font-mono">{p.tonnage_total} T</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete('project', p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete('regions', item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {geoTab === 'departments' && departments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{regions.find(r => r.id === item.region_id)?.name}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete('departments', item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {geoTab === 'communes' && communes.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{departments.find(d => d.id === item.department_id)?.name}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete('communes', item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
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
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-border">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground capitalize">Add {modalType}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Common Fields */}
              {modalType !== 'project' && (
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

              {/* Specific Logic */}
              {modalType === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Region</label>
                  <select required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
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
                    <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
                      value={formData.numero_marche || ''} 
                      onChange={e => setFormData({...formData, numero_marche: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numero Bon Disposition</label>
                    <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" 
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

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};