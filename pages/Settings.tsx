
import { useState, useEffect, Fragment, FormEvent } from 'react';
import { db } from '../services/db';
import { Map, MapPin, Briefcase, Plus, Trash2, Edit2, ChevronRight, X, Users, Search, Phone, Building2, User, Filter, Layers, Save, Ruler } from 'lucide-react';
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
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all'); // 'all', 'unassigned', or project_id

  // UI State
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>(''); // 'region', 'department', 'commune', 'project', 'operator'
  const [formData, setFormData] = useState<any>({});
  
  // Searchable Select State
  const [communeSearch, setCommuneSearch] = useState('');
  const [isCommuneDropdownOpen, setIsCommuneDropdownOpen] = useState(false);
  
  // Filters
  const [filterDeptId, setFilterDeptId] = useState('');

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      await db.deleteItem(table, id);
      fetchData(); // Reload
    } catch (e) {
      alert('Erreur lors de la suppression. L\'élément est peut-être référencé ailleurs.');
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

  const handleSave = async (e: FormEvent) => {
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
      
      // Commune specific types
      if (modalType === 'commune') {
        payload.distance_mine = payload.distance_mine ? Number(payload.distance_mine) : null;
      }

      // Operator specific mapping
      if (modalType === 'operator') {
        payload.operateur_coop_gie = payload.is_coop; // Map frontend bool to DB column
        if (!payload.is_coop) payload.coop_name = null; // Clear coop name if individual
        payload.contact_info = payload.phone; // Map phone directly to varchar column
        // projet_id is already in payload from formData
        
        // Remove UI helper props
        delete payload.is_coop;
        delete payload.phone;
        delete payload.commune_name;
        delete payload.project_name;
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
      alert('Échec de l\'enregistrement. Veuillez vérifier la console.');
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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement des Paramètres...</div>;

  const getModalTitle = (type: string) => {
      const typeMap: any = {
          'region': 'Région',
          'department': 'Département',
          'commune': 'Commune',
          'project': 'Projet',
          'operator': 'Opérateur'
      };
      const action = formData.id ? 'Modifier' : 'Ajouter';
      return `${action} ${typeMap[type] || type}`;
  };

  // Helper to render operator row
  const renderOperatorRow = (op: Operator) => (
    <tr key={op.id}>
      <td>
        <div className="font-medium text-foreground">{op.name}</div>
        {op.is_coop && <div className="text-xs text-muted-foreground">{op.coop_name}</div>}
      </td>
      <td>
        {op.is_coop ? (
          <div className="flex items-center gap-2" title="Coopérative / GIE">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
              <Building2 size={16} />
            </span>
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Coop</span>
          </div>
        ) : (
          <div className="flex items-center gap-2" title="Individuel">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground">
              <User size={16} />
            </span>
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Indiv.</span>
          </div>
        )}
      </td>
      <td className="text-sm text-foreground">{op.commune_name}</td>
      <td className="text-sm text-muted-foreground font-mono">
        {op.phone ? (
          <a href={`tel:${op.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
            {op.phone}
          </a>
        ) : (
          <span className="opacity-50">-</span>
        )}
      </td>
      <td className="text-sm text-foreground">
        {op.project_name !== '-' ? (
          <span className="badge badge-soft badge-secondary text-xs">
            {op.project_name}
          </span>
        ) : (
          <span className="opacity-50">-</span>
        )}
      </td>
      <td className="text-right">
        <button 
          onClick={() => handleEdit('operator', op)} 
          className="btn btn-circle btn-text btn-sm text-blue-600"
          title="Modifier Opérateur"
        >
          <Edit2 size={18} />
        </button>
        <button 
          onClick={() => handleDelete('operators', op.id)} 
          className="btn btn-circle btn-text btn-sm btn-text-error"
          title="Supprimer Opérateur"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Paramètres Système</h1>
        <p className="text-muted-foreground text-sm">Gérer la configuration, les données de référence et les projets.</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('geographic')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'geographic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Données Géographiques
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Projets
        </button>
        <button
          onClick={() => setActiveTab('operators')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'operators' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Opérateurs
        </button>
      </div>

      {/* OPERATORS TAB */}
      {activeTab === 'operators' && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" /> Opérateurs
            </h2>
            
            {/* Filter Buttons */}
            <div className="flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 mx-4">
               <form className="filter">
                  <input 
                     className="btn btn-square" 
                     type="reset" 
                     value="×" 
                     onClick={() => setSelectedPhaseFilter('all')}
                     title="Réinitialiser"
                  />
                  <input 
                     className="btn" 
                     type="radio" 
                     name="op-phase" 
                     aria-label="Tous"
                     checked={selectedPhaseFilter === 'all'}
                     onChange={() => setSelectedPhaseFilter('all')}
                  />
                  <input 
                     className="btn" 
                     type="radio" 
                     name="op-phase" 
                     aria-label="Non Assignés"
                     checked={selectedPhaseFilter === 'unassigned'}
                     onChange={() => setSelectedPhaseFilter('unassigned')}
                  />
                  {projects.map(p => {
                     const count = operators.filter(o => o.projet_id === p.id).length;
                     if (count === 0) return null;
                     return (
                        <input
                           key={p.id}
                           className="btn" 
                           type="radio" 
                           name="op-phase" 
                           aria-label={`Phase ${p.numero_phase}`}
                           checked={selectedPhaseFilter === p.id}
                           onChange={() => setSelectedPhaseFilter(p.id)}
                        />
                     );
                  })}
               </form>
            </div>

            <button 
              onClick={() => openModal('operator')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90 whitespace-nowrap"
            >
              <Plus size={16} /> Ajouter Opérateur
            </button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nom Opérateur</th>
                  <th>Type</th>
                  <th>Commune</th>
                  <th>
                    <div className="flex items-center gap-2">
                      <Phone size={14} /> Téléphone
                    </div>
                  </th>
                  <th>Projet</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Aucun opérateur trouvé.</td>
                  </tr>
                )}
                
                {operators
                  .filter(op => {
                    if (selectedPhaseFilter === 'all') return true;
                    if (selectedPhaseFilter === 'unassigned') return !op.projet_id;
                    return op.projet_id === selectedPhaseFilter;
                  })
                  .map((op) => renderOperatorRow(op))
                }
                
                {operators.filter(op => {
                    if (selectedPhaseFilter === 'all') return true;
                    if (selectedPhaseFilter === 'unassigned') return !op.projet_id;
                    return op.projet_id === selectedPhaseFilter;
                  }).length === 0 && operators.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Aucun opérateur ne correspond au filtre sélectionné.</td>
                    </tr>
                  )
                }

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
              <Briefcase size={20} className="text-primary" /> Projets
            </h2>
            <button 
              onClick={() => openModal('project')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90"
            >
              <Plus size={16} /> Ajouter Projet
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Marché N°</th>
                  <th>Bon Disp. N°</th>
                  <th>Phase</th>
                  <th>Date</th>
                  <th>Tonnage Total</th>
                  <th>Tonnage Livré</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Aucun projet trouvé.</td>
                  </tr>
                )}
                {projects.map((p) => {
                  const isUsed = usedProjectIds.has(p.id);
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-foreground">{p.numero_marche}</td>
                      <td className="text-muted-foreground">{p.numero_bon_disposition}</td>
                      <td className="text-muted-foreground">{p.numero_phase}</td>
                      <td className="text-muted-foreground">{p.date_mise_disposition ? new Date(p.date_mise_disposition).toLocaleDateString() : '-'}</td>
                      <td className="text-foreground font-mono">{p.tonnage_total} T</td>
                      <td className="text-emerald-600 font-mono font-medium">{p.total_delivered?.toLocaleString()} T</td>
                      <td className="text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit('project', p)} 
                          className="btn btn-circle btn-text btn-sm text-blue-600"
                          title="Modifier Projet"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => !isUsed && handleDelete('project', p.id)} 
                          disabled={isUsed}
                          className={`btn btn-circle btn-text btn-sm ${
                            isUsed 
                              ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                              : 'text-red-600 btn-text-error'
                          }`}
                          title={isUsed ? "Impossible de supprimer : Le projet est lié à des allocations" : "Supprimer Projet"}
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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* FlyonUI Vertical Tabs Nav */}
          <nav className="tabs tabs-bordered tabs-vertical bg-card p-2 rounded-xl border border-border shadow-sm h-fit lg:w-64 shrink-0" role="tablist" aria-label="Données Géographiques">
            <button
              type="button"
              onClick={() => setGeoTab('regions')}
              className={`tab h-auto justify-start py-3 px-4 text-sm font-medium gap-2 ${
                geoTab === 'regions' ? 'tab-active' : ''
              }`}
              role="tab"
              aria-selected={geoTab === 'regions'}
            >
              <Map size={16} /> Régions
            </button>
            <button
              type="button"
              onClick={() => setGeoTab('departments')}
              className={`tab h-auto justify-start py-3 px-4 text-sm font-medium gap-2 ${
                geoTab === 'departments' ? 'tab-active' : ''
              }`}
              role="tab"
              aria-selected={geoTab === 'departments'}
            >
              <MapPin size={16} /> Départements
            </button>
            <button
              type="button"
              onClick={() => setGeoTab('communes')}
              className={`tab h-auto justify-start py-3 px-4 text-sm font-medium gap-2 ${
                geoTab === 'communes' ? 'tab-active' : ''
              }`}
              role="tab"
              aria-selected={geoTab === 'communes'}
            >
              <MapPin size={16} /> Communes
            </button>
          </nav>

          {/* Content Area */}
          <div className="flex-1 bg-card p-6 rounded-xl border border-border shadow-sm min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground capitalize">
                  {geoTab === 'regions' ? 'Régions' : geoTab === 'departments' ? 'Départements' : 'Communes'}
                </h2>
                {geoTab === 'communes' && (
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <Filter size={14} />
                    </div>
                    <select
                      value={filterDeptId}
                      onChange={(e) => setFilterDeptId(e.target.value)}
                      className="h-9 pl-8 pr-4 text-sm bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer min-w-[180px]"
                    >
                      <option value="">Tous les départements</option>
                      {departments
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>
              <button 
                onClick={() => openModal(geoTab.slice(0, -1))} // remove 's'
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90"
              >
                <Plus size={16} /> Ajouter {geoTab === 'regions' ? 'Région' : geoTab === 'departments' ? 'Département' : 'Commune'}
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    {/* Header logic adjusted since we now use group rows */}
                    {geoTab === 'regions' && <th></th>}
                    {geoTab === 'departments' && <th>Région</th>}
                    {geoTab === 'communes' && <th>Département</th>}
                    {geoTab === 'communes' && <th>Distance Mine</th>}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* REGIONS */}
                  {geoTab === 'regions' && regions
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-foreground">{item.name}</td>
                      <td className="font-mono text-muted-foreground text-xs">{item.code}</td>
                      <td></td>
                      <td className="text-right">
                        <button onClick={() => handleEdit('region', item)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete('regions', item.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}

                  {/* DEPARTMENTS - Grouped by Region */}
                  {geoTab === 'departments' && regions
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((region) => {
                      const regionDepts = departments
                        .filter(d => d.region_id === region.id)
                        .sort((a, b) => a.name.localeCompare(b.name));
                      
                      if (regionDepts.length === 0) return null;

                      return (
                        <Fragment key={region.id}>
                          <tr className="bg-muted/50 border-y border-border">
                            <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                              Région: {region.name}
                            </td>
                          </tr>
                          {regionDepts.map((item) => (
                            <tr key={item.id}>
                              <td className="font-medium text-foreground pl-8">{item.name}</td>
                              <td className="font-mono text-muted-foreground text-xs">{item.code}</td>
                              <td className="text-sm text-muted-foreground">{region.name}</td>
                              <td className="text-right">
                                <button onClick={() => handleEdit('department', item)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete('departments', item.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })
                  }

                  {/* COMMUNES - Grouped by Department */}
                  {geoTab === 'communes' && departments
                    .filter(d => !filterDeptId || d.id === filterDeptId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((dept) => {
                       const deptCommunes = communes
                        .filter(c => c.department_id === dept.id)
                        .sort((a, b) => a.name.localeCompare(b.name));
                       
                       if (deptCommunes.length === 0) return null;

                       return (
                         <Fragment key={dept.id}>
                           <tr className="bg-muted/50 border-y border-border">
                             <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                               Département: {dept.name}
                             </td>
                           </tr>
                           {deptCommunes.map((item) => (
                             <tr key={item.id}>
                               <td className="font-medium text-foreground pl-8">{item.name}</td>
                               <td className="font-mono text-muted-foreground text-xs">{item.code}</td>
                               <td className="text-sm text-muted-foreground">{dept.name}</td>
                               <td className="text-sm text-foreground">{item.distance_mine ? `${item.distance_mine} km` : '-'}</td>
                               <td className="text-right">
                                  <button onClick={() => handleEdit('commune', item)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                                 <button onClick={() => handleDelete('communes', item.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                               </td>
                             </tr>
                           ))}
                         </Fragment>
                       );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Dynamic Form based on Type */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{getModalTitle(modalType)}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Region Form */}
              {modalType === 'region' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom de la Région</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Code (ex: DK)</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.code || ''}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                </>
              )}

              {/* Department Form */}
              {modalType === 'department' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Région Parenthèse</label>
                    <select 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.region_id || ''}
                      onChange={e => setFormData({...formData, region_id: e.target.value})}
                    >
                      <option value="">Sélectionner une région...</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom du Département</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Code (ex: PIK)</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.code || ''}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                </>
              )}

              {/* Commune Form */}
              {modalType === 'commune' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Département Parent</label>
                    <select 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.department_id || ''}
                      onChange={e => setFormData({...formData, department_id: e.target.value})}
                    >
                      <option value="">Sélectionner un département...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom de la Commune</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Code (ex: DKN)</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.code || ''}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                       <Ruler size={14} /> Distance Mine (km)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.distance_mine || ''}
                      onChange={e => setFormData({...formData, distance_mine: e.target.value})}
                      placeholder="ex: 120.5"
                    />
                  </div>
                </>
              )}

              {/* Project Form */}
              {modalType === 'project' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro Phase</label>
                    <input 
                      type="number"
                      required 
                      className={`w-full border rounded-lg p-2 text-sm bg-background text-foreground ${isDuplicatePhase ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                      value={formData.numero_phase || ''}
                      onChange={e => setFormData({...formData, numero_phase: e.target.value})}
                      placeholder="ex: 1, 2, 3"
                    />
                    {isDuplicatePhase && <p className="text-xs text-destructive mt-1">Cette phase existe déjà.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro Marché</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.numero_marche || ''}
                      onChange={e => setFormData({...formData, numero_marche: e.target.value})}
                      placeholder="ex: F_DAR_084"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro Bon de Disposition</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.numero_bon_disposition || ''}
                      onChange={e => setFormData({...formData, numero_bon_disposition: e.target.value})}
                      placeholder="ex: 394/MASAE/DA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tonnage Total (Objectif)</label>
                    <input 
                      type="number"
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.tonnage_total || ''}
                      onChange={e => setFormData({...formData, tonnage_total: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Date de Mise à Disposition</label>
                    <input 
                      type="date"
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.date_mise_disposition ? new Date(formData.date_mise_disposition).toISOString().split('T')[0] : ''}
                      onChange={e => setFormData({...formData, date_mise_disposition: e.target.value})}
                    />
                  </div>
                </>
              )}

              {/* Operator Form */}
              {modalType === 'operator' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom de l'Opérateur / GIE</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 py-2">
                    <input 
                      type="checkbox"
                      id="is_coop"
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      checked={formData.is_coop || false}
                      onChange={e => setFormData({...formData, is_coop: e.target.checked})}
                    />
                    <label htmlFor="is_coop" className="text-sm font-medium text-foreground cursor-pointer select-none">
                       Est une Coopérative / Union ?
                    </label>
                  </div>

                  {formData.is_coop && (
                    <div className="animate-in slide-in-from-top-2 fade-in">
                       <label className="block text-sm font-medium text-foreground mb-1">Nom de la Coopérative</label>
                       <input 
                         className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                         value={formData.coop_name || ''}
                         onChange={e => setFormData({...formData, coop_name: e.target.value})}
                         placeholder="ex: RESOPP"
                       />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                    <input 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="77 000 00 00"
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Phase Projet Assignée</label>
                     <select 
                        required
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.projet_id || ''}
                        onChange={e => setFormData({...formData, projet_id: e.target.value})}
                     >
                        <option value="">Sélectionner une Phase...</option>
                        {projects.map(p => (
                           <option key={p.id} value={p.id}>Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}</option>
                        ))}
                     </select>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-1">Commune de résidence</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      <input 
                        required 
                        className="w-full pl-9 border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        placeholder="Rechercher commune..."
                        value={communeSearch}
                        onChange={(e) => {
                          setCommuneSearch(e.target.value);
                          setIsCommuneDropdownOpen(true);
                          // Clear ID if typing
                          if (formData.commune_id) setFormData({...formData, commune_id: ''});
                        }}
                        onFocus={() => setIsCommuneDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsCommuneDropdownOpen(false), 200)}
                      />
                    </div>
                    {isCommuneDropdownOpen && communeSearch && (
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
                              {c.name} <span className="text-xs text-muted-foreground">({c.code})</span>
                            </li>
                          ))
                        }
                      </ul>
                    )}
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                <button 
                  type="submit" 
                  disabled={isDuplicatePhase}
                  className={`px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 ${isDuplicatePhase ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Save size={16} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
