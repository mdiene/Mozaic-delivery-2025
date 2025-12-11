
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { AllocationView, Project, Operator, Region, Department, Commune, DeliveryView } from '../types';
import { Plus, Search, Filter, Edit2, Trash2, X, Save, RefreshCw, User, Phone, Layers, Lock, CheckCircle, Truck, EyeOff, Eye, Printer, MapPin, Calendar, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';

type GroupBy = 'none' | 'project';

export const Allocations = () => {
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState<AllocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter & Grouping State
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [hideClosed, setHideClosed] = useState(false);

  // Dropdown Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // View/Preview Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewAllocation, setViewAllocation] = useState<AllocationView | null>(null);
  const [viewDeliveries, setViewDeliveries] = useState<DeliveryView[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [all, proj, ops, reg, dep, com] = await Promise.all([
        db.getAllocationsView(),
        db.getProjects(),
        db.getOperators(),
        db.getRegions(),
        db.getDepartments(),
        db.getCommunes()
      ]);
      setAllocations(all);
      setProjects(proj);
      setOperators(ops);
      setRegions(reg);
      setDepartments(dep);
      setCommunes(com);
      
      // Auto-Status Update Logic
      all.forEach(async (a) => {
        // Auto-Close if 100%
        if (a.progress >= 100 && (a.status === 'OPEN' || a.status === 'IN_PROGRESS')) {
           console.log(`Auto-closing allocation ${a.allocation_key}`);
           await db.updateItem('allocations', a.id, { status: 'CLOSED' });
        }
        // Auto-Start if > 0% and OPEN
        else if (a.progress > 0 && a.status === 'OPEN') {
           console.log(`Auto-starting allocation ${a.allocation_key}`);
           await db.updateItem('allocations', a.id, { status: 'IN_PROGRESS' });
        }
      });
      
    } catch (e) {
      console.error('Error fetching allocation data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (alloc?: AllocationView) => {
    if (alloc) {
      setFormData({ 
        ...alloc,
        // Map DB fields back to UI inputs
        responsible_phone: alloc.responsible_phone_raw || ''
      });
    } else {
      setFormData({
        target_tonnage: 0,
        status: 'OPEN',
        allocation_key: '',
        project_id: '',
        operator_id: '',
        region_id: '',
        department_id: '',
        commune_id: '',
        responsible_name: '',
        responsible_phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleViewAllocation = async (alloc: AllocationView) => {
    setViewAllocation(alloc);
    setIsViewOpen(true);
    setViewLoading(true);
    try {
      // Fetch all deliveries then filter (simplest approach reusing existing service)
      // In a larger app, you'd want a specific db.getDeliveriesByAllocation(id)
      const allDeliveries = await db.getDeliveriesView();
      const relevant = allDeliveries.filter(d => d.allocation_id === alloc.id);
      
      // Sort by date descending
      relevant.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
      
      setViewDeliveries(relevant);
    } catch (e) {
      console.error("Error fetching deliveries for view", e);
    } finally {
      setViewLoading(false);
    }
  };

  const handlePrintView = () => {
    window.print();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette allocation ?')) return;
    try {
      await db.deleteItem('allocations', id);
      fetchData();
    } catch (e) {
      alert('Erreur lors de la suppression. Elle peut être liée à des livraisons existantes.');
    }
  };

  const handleCreateDelivery = (alloc: AllocationView) => {
    // Navigate to Logistics page with params to trigger modal
    navigate(`/logistics?action=new&allocationId=${alloc.id}`);
  };

  const generateKey = () => {
    const proj = projects.find(p => p.id === formData.project_id);
    const reg = regions.find(r => r.id === formData.region_id);
    const op = operators.find(o => o.id === formData.operator_id);
    
    const phasePart = proj ? `PH${proj.numero_phase}` : 'PHX';
    const regPart = reg ? reg.code : 'XX';
    const opPart = op ? op.name.substring(0, 3).toUpperCase().replace(/\s/g, '') : 'OP';
    const random = Math.floor(1000 + Math.random() * 9000);

    const key = `${phasePart}-${regPart}-${opPart}-${random}`;
    setFormData({ ...formData, allocation_key: key });
  };

  // Auto-fill location data and responsible person when operator is selected
  const handleOperatorChange = (opId: string) => {
    const op = operators.find(o => o.id === opId);
    if (!op) {
      setFormData({ ...formData, operator_id: opId });
      return;
    }

    // Find location hierarchy
    const commune = communes.find(c => c.id === op.commune_id);
    const dept = commune ? departments.find(d => d.id === commune.department_id) : null;
    const reg = dept ? regions.find(r => r.id === dept.region_id) : null;

    setFormData({
      ...formData,
      operator_id: opId,
      commune_id: commune?.id || '',
      department_id: dept?.id || '',
      region_id: reg?.id || '',
      project_id: op.projet_id || formData.project_id,
      // Auto-fill responsible person from operator details
      responsible_name: op.name,
      responsible_phone: op.phone || ''
    });
  };

  // Reverse Auto-fill: When commune is selected, fill department and region
  const handleCommuneChange = (communeId: string) => {
    const selectedCommune = communes.find(c => c.id === communeId);
    
    if (selectedCommune) {
      const dept = departments.find(d => d.id === selectedCommune.department_id);
      const reg = dept ? regions.find(r => r.id === dept.region_id) : null;
      
      setFormData((prev: any) => ({
        ...prev,
        commune_id: communeId,
        department_id: dept ? dept.id : prev.department_id,
        region_id: reg ? reg.id : prev.region_id
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, commune_id: communeId }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side Validation
    if (Number(formData.target_tonnage) <= 0) {
      alert("Le tonnage cible doit être supérieur à 0");
      return;
    }
    if (!formData.allocation_key) {
      alert("La clé d'allocation est requise");
      return;
    }

    try {
      // Allowlist Strategy: Explicitly construct payload with ONLY columns that exist in 'allocations' table
      const dbPayload: any = {
        allocation_key: formData.allocation_key,
        region_id: formData.region_id,
        department_id: formData.department_id,
        commune_id: formData.commune_id,
        operator_id: formData.operator_id,
        responsible_name: formData.responsible_name,
        // Map UI phone input to DB columns
        responsible_phone_raw: formData.responsible_phone || null,
        responsible_phone_normalized: formData.responsible_phone ? formData.responsible_phone.replace(/\s/g, '') : null,
        target_tonnage: Number(formData.target_tonnage),
        status: formData.status || 'OPEN',
        // Foreign keys: map empty strings to null
        project_id: formData.project_id || null
      };

      if (!formData.id) {
         await db.createItem('allocations', dbPayload);
      } else {
         await db.updateItem('allocations', formData.id, dbPayload);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Save Error:", error);
      // Try to extract readable error
      const msg = error.details || error.hint || error.message || JSON.stringify(error);
      alert(`Échec de l'enregistrement: ${msg}`);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // Optimistic Update
      setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
      
      await db.updateItem('allocations', id, { status: newStatus });
    } catch (e) {
      alert("Erreur lors de la mise à jour du statut.");
      fetchData(); // Revert
    }
  };

  const handleCloseAllocation = async (id: string) => {
    if (confirm("Confirmez-vous la clôture de cette allocation ?")) {
      await handleStatusChange(id, 'CLOSED');
    }
  };

  // Helper to filter communes based on selected region/dept
  const getAvailableCommunes = () => {
    return communes.filter(c => {
      // If Department is selected, must match department
      if (formData.department_id) {
        return c.department_id === formData.department_id;
      }
      // If Region is selected (but no Dept), must match Region
      if (formData.region_id) {
        const dept = departments.find(d => d.id === c.department_id);
        return dept?.region_id === formData.region_id;
      }
      // Otherwise show all
      return true;
    });
  };
  
  // Calculate assigned operator IDs to filter dropdown
  const assignedOperatorIds = new Set(allocations.map(a => a.operator_id));

  // Helper to get selected project object
  const selectedProject = projects.find(p => p.id === formData.project_id);

  // Grouping and Filtering Logic
  const filteredAllocations = useMemo(() => {
    return allocations.filter(a => {
      // Search Term
      const matchesSearch = 
        a.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.allocation_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.region_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Closed Filter
      if (hideClosed && a.status === 'CLOSED') return false;

      // Project Filter
      if (selectedPhaseFilter === 'all') return true;
      if (selectedPhaseFilter === 'unassigned') return !a.project_id;
      return a.project_id === selectedPhaseFilter;
    });
  }, [allocations, searchTerm, selectedPhaseFilter, hideClosed]);

  const groupedAllocations = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'All', items: filteredAllocations }];
    }
    
    // Group by Project
    const groups: Record<string, AllocationView[]> = {};
    filteredAllocations.forEach(a => {
      const key = a.project_phase || 'Phase Non Assignée';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return Object.entries(groups).map(([key, items]) => ({ key, items }));
  }, [filteredAllocations, groupBy]);

  // Transform operators for AdvancedSelect
  const operatorOptions: Option[] = useMemo(() => {
    return operators
      .filter(o => {
        if (selectedProject) {
          const opProject = projects.find(p => p.id === o.projet_id);
          if (!opProject || opProject.numero_phase !== selectedProject.numero_phase) {
            return false;
          }
        }
        if (assignedOperatorIds.has(o.id) && o.id !== formData.operator_id) return false;
        return true;
      })
      .map(o => ({
        value: o.id,
        label: o.name,
        subLabel: `${o.commune_name || ''} ${(!formData.project_id && o.project_name && o.project_name !== '-') ? `- ${o.project_name}` : ''}`
      }));
  }, [operators, selectedProject, assignedOperatorIds, formData.operator_id, formData.project_id, projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Allocations</h1>
          <p className="text-muted-foreground text-sm">Gérer les quotas régionaux et l'affectation des opérateurs.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nouvelle Allocation
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher opérateur, région, clé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          
          <div className="flex items-center gap-2">
             <button
                onClick={() => setHideClosed(!hideClosed)}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
                  hideClosed
                    ? 'bg-primary/10 text-primary border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
                title={hideClosed ? "Afficher les allocations fermées" : "Masquer les allocations fermées"}
             >
               {hideClosed ? <EyeOff size={16} /> : <Eye size={16} />} 
               <span className="hidden sm:inline">Masquer Fermés</span>
             </button>

             <button
                onClick={() => setGroupBy(prev => prev === 'none' ? 'project' : 'none')}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
                  groupBy === 'project' 
                    ? 'bg-primary/10 text-primary border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
             >
               <Layers size={16} /> Grouper par Phase
             </button>
          </div>
        </div>

        {/* Phase Filters - Horizontal Scroll */}
        <div className="overflow-x-auto pb-2">
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
               name="alloc-phase" 
               aria-label="Toutes les Phases"
               checked={selectedPhaseFilter === 'all'}
               onChange={() => setSelectedPhaseFilter('all')}
             />
             <input 
               className="btn" 
               type="radio" 
               name="alloc-phase" 
               aria-label="Non Assignée"
               checked={selectedPhaseFilter === 'unassigned'}
               onChange={() => setSelectedPhaseFilter('unassigned')}
             />
             {projects.map(p => (
               <input
                 key={p.id}
                 className="btn" 
                 type="radio" 
                 name="alloc-phase" 
                 aria-label={`Phase ${p.numero_phase}${p.numero_marche ? ` - ${p.numero_marche}` : ''}`}
                 checked={selectedPhaseFilter === p.id}
                 onChange={() => setSelectedPhaseFilter(p.id)}
               />
             ))}
           </form>
        </div>
      </div>

      <div className="w-full overflow-x-auto bg-card rounded-xl border border-border shadow-sm min-h-[500px]">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Opérateur / Clé</th>
              <th>Localisation</th>
              <th>Objectif</th>
              <th>Progression</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                   {searchTerm ? 'Aucun résultat trouvé.' : 'Aucune allocation disponible.'}
                </td>
              </tr>
            )}

            {groupedAllocations.map((group) => (
               <React.Fragment key={group.key}>
                  {groupBy !== 'none' && (
                    <tr className="bg-slate-100 dark:bg-slate-800/50 border-y border-border">
                       <td colSpan={6} className="px-6 py-3 text-sm font-bold text-foreground">
                          {group.key} ({group.items.length})
                       </td>
                    </tr>
                  )}
                  
                  {group.items.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-muted/50 transition-colors">
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{alloc.operator_name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{alloc.allocation_key}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{alloc.commune_name}</span>
                          <span className="text-xs text-muted-foreground">{alloc.department_name}, {alloc.region_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono font-medium text-foreground">{alloc.target_tonnage} T</span>
                      </td>
                      <td className="w-48">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-primary">{alloc.delivered_tonnage} T</span>
                            <span className="text-muted-foreground">{alloc.progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                alloc.progress >= 100 ? 'bg-success' : 'bg-primary'
                              }`} 
                              style={{ width: `${Math.min(alloc.progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                         <span className={`badge badge-soft text-xs 
                           ${alloc.status === 'OPEN' ? 'badge-info' : ''}
                           ${alloc.status === 'IN_PROGRESS' ? 'badge-warning' : ''}
                           ${alloc.status === 'CLOSED' ? 'badge-secondary' : ''}
                           ${alloc.status === 'OVER_DELIVERED' ? 'badge-error' : ''}
                         `}>
                           {alloc.status === 'OPEN' && 'OUVERT'}
                           {alloc.status === 'IN_PROGRESS' && 'EN COURS'}
                           {alloc.status === 'CLOSED' && 'CLÔTURÉ'}
                           {alloc.status === 'OVER_DELIVERED' && 'DÉPASSÉ'}
                         </span>
                      </td>
                      <td className="text-right">
                         <div className="flex justify-end gap-1">
                            <button 
                                onClick={() => handleViewAllocation(alloc)}
                                className="btn btn-circle btn-text btn-sm text-purple-600"
                                title="Voir Détails"
                            >
                                <Eye size={16} />
                            </button>
                            {alloc.status !== 'CLOSED' && (
                               <button 
                                 onClick={() => handleCreateDelivery(alloc)}
                                 className="btn btn-circle btn-text btn-sm text-emerald-600"
                                 title="Nouvelle Expédition"
                               >
                                  <Truck size={16} />
                               </button>
                            )}
                            {alloc.status !== 'CLOSED' && (
                               <button 
                                 onClick={() => handleCloseAllocation(alloc.id)}
                                 className="btn btn-circle btn-text btn-sm text-amber-600"
                                 title="Clôturer"
                               >
                                  <Lock size={16} />
                               </button>
                            )}
                            <button 
                              onClick={() => handleOpenModal(alloc)}
                              className="btn btn-circle btn-text btn-sm text-blue-600"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(alloc.id)}
                              className="btn btn-circle btn-text btn-sm btn-text-error"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
               </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE/EDIT Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier Allocation' : 'Nouvelle Allocation'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
                
                {/* Operator Select (Advanced) */}
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-foreground mb-1">Opérateur</label>
                   <AdvancedSelect 
                      options={operatorOptions}
                      value={formData.operator_id || ''}
                      onChange={(val) => handleOperatorChange(val)}
                      placeholder="Rechercher un Opérateur..."
                   />
                   {formData.operator_id && !operatorOptions.find(o => o.value === formData.operator_id) && (
                      <p className="text-xs text-amber-600 mt-1">L'opérateur actuellement assigné ne correspond pas aux filtres de projet.</p>
                   )}
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Projet (Phase)</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.project_id || ''}
                    onChange={e => setFormData({...formData, project_id: e.target.value})}
                  >
                    <option value="">Sélectionner un projet...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Région</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.region_id || ''}
                    onChange={e => setFormData({...formData, region_id: e.target.value, department_id: '', commune_id: ''})}
                  >
                    <option value="">Sélectionner...</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Département</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.department_id || ''}
                    onChange={e => setFormData({...formData, department_id: e.target.value, commune_id: ''})}
                    disabled={!formData.region_id}
                  >
                    <option value="">Sélectionner...</option>
                    {departments
                      .filter(d => d.region_id === formData.region_id)
                      .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    }
                  </select>
                </div>

                {/* Commune Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Commune</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.commune_id || ''}
                    onChange={e => handleCommuneChange(e.target.value)}
                  >
                    <option value="">Sélectionner...</option>
                    {getAvailableCommunes().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Allocation Key Generation */}
                <div className="md:col-span-2">
                   <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-foreground">Clé d'Allocation</label>
                      <button 
                        type="button" 
                        onClick={generateKey}
                        className="text-xs flex items-center gap-1 text-primary hover:underline"
                      >
                         <RefreshCw size={12} /> Générer
                      </button>
                   </div>
                   <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground font-mono"
                      value={formData.allocation_key || ''}
                      onChange={e => setFormData({...formData, allocation_key: e.target.value})}
                      placeholder="Ex: PH3-XX-OP-1234"
                   />
                </div>

                {/* Target Tonnage */}
                <div>
                   <label className="block text-sm font-medium text-foreground mb-1">Objectif (Tonnes)</label>
                   <input 
                      type="number"
                      required 
                      min="1"
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.target_tonnage || ''}
                      onChange={e => setFormData({...formData, target_tonnage: e.target.value})}
                   />
                </div>

                {/* Responsible Person */}
                <div>
                   <label className="block text-sm font-medium text-foreground mb-1">Responsable</label>
                   <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.responsible_name || ''}
                      onChange={e => setFormData({...formData, responsible_name: e.target.value})}
                      placeholder="Nom complet"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                   <input 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.responsible_phone || ''}
                      onChange={e => setFormData({...formData, responsible_phone: e.target.value})}
                      placeholder="77 000 00 00"
                   />
                </div>

                {/* Status (Only on Edit) */}
                {formData.id && (
                   <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Statut</label>
                     <select 
                       className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                       value={formData.status || 'OPEN'}
                       onChange={e => setFormData({...formData, status: e.target.value})}
                     >
                        <option value="OPEN">Ouvert</option>
                        <option value="IN_PROGRESS">En Cours</option>
                        <option value="CLOSED">Clôturé</option>
                        <option value="OVER_DELIVERED">Dépassé</option>
                     </select>
                   </div>
                )}
                
                <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-border mt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                   <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                     <Save size={16} /> Enregistrer
                   </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW/PREVIEW Modal */}
      {isViewOpen && viewAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print-modal-overlay">
           <style>{`
             @media print {
               body > * { display: none !important; }
               .print-modal-overlay { 
                 position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                 background: white; z-index: 9999; display: flex !important; 
                 align-items: flex-start; justify-content: center; overflow: visible;
               }
               .print-modal-content {
                 box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important;
               }
               .no-print { display: none !important; }
             }
           `}</style>
           <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border print-modal-content">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <User size={20} />
                     </div>
                     <div>
                        <h2 className="text-lg font-bold text-foreground leading-tight">{viewAllocation.operator_name}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                           <span>{viewAllocation.allocation_key}</span>
                           <span className="w-1 h-1 rounded-full bg-border"></span>
                           <span className={`px-1.5 rounded-sm font-bold ${
                              viewAllocation.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                              viewAllocation.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                              viewAllocation.status === 'CLOSED' ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'
                           }`}>{viewAllocation.status}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                     <button 
                       onClick={handlePrintView}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary hover:bg-muted text-secondary-foreground rounded-lg transition-colors"
                     >
                        <Printer size={16} /> Imprimer
                     </button>
                     <button onClick={() => setIsViewOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                        <X size={20} />
                     </button>
                  </div>
              </div>

              <div className="p-6 space-y-8">
                 {/* Section 1: Overview Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                       <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <MapPin size={12} /> Localisation
                       </h4>
                       <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{viewAllocation.commune_name}</p>
                          <p className="text-xs text-muted-foreground">{viewAllocation.department_name}, {viewAllocation.region_name}</p>
                       </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                       <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Layers size={12} /> Projet
                       </h4>
                       <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{viewAllocation.project_phase || 'Phase N/A'}</p>
                          <p className="text-xs text-muted-foreground">Responsable: {viewAllocation.responsible_name}</p>
                       </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                       <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Calendar size={12} /> Activité
                       </h4>
                       <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{viewDeliveries.length} Expédition(s)</p>
                          <p className="text-xs text-muted-foreground">Dernière: {viewDeliveries[0] ? new Date(viewDeliveries[0].delivery_date).toLocaleDateString() : '-'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Section 2: Performance Comparison */}
                 <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                       <Layers size={16} className="text-primary" /> Performance & Quota
                    </h3>
                    <div className="bg-muted/20 p-6 rounded-2xl border border-border">
                       <div className="flex items-end justify-between mb-2">
                          <div>
                             <span className="text-3xl font-bold text-primary">{viewAllocation.delivered_tonnage} T</span>
                             <span className="text-sm text-muted-foreground ml-2">Livré</span>
                          </div>
                          <div className="text-right">
                             <span className="text-sm text-muted-foreground block">Sur un objectif de</span>
                             <span className="text-xl font-bold text-foreground">{viewAllocation.target_tonnage} T</span>
                          </div>
                       </div>
                       
                       {/* Progress Bar */}
                       <div className="h-4 w-full bg-secondary rounded-full overflow-hidden mb-2">
                          <div 
                             className={`h-full transition-all duration-1000 ${
                                viewAllocation.progress > 100 ? 'bg-red-500' : 'bg-primary'
                             }`}
                             style={{ width: `${Math.min(viewAllocation.progress, 100)}%` }}
                          ></div>
                       </div>
                       
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-primary">{viewAllocation.progress.toFixed(1)}% Réalisé</span>
                          <span className={viewAllocation.target_tonnage - viewAllocation.delivered_tonnage < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                             {Math.max(0, viewAllocation.target_tonnage - viewAllocation.delivered_tonnage).toFixed(2)} T Restant
                             {viewAllocation.target_tonnage - viewAllocation.delivered_tonnage < 0 && ` (+${Math.abs(viewAllocation.target_tonnage - viewAllocation.delivered_tonnage).toFixed(2)} T Excès)`}
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Section 3: Fleet Involved */}
                 <div>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                       <Truck size={16} className="text-primary" /> Flotte Mobilisée
                    </h3>
                    {viewDeliveries.length > 0 ? (
                       <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(viewDeliveries.map(d => `${d.truck_plate}|${d.driver_name}`))).map((combo: string, idx) => {
                             const [plate, driver] = combo.split('|');
                             return (
                                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-sm">
                                   <div className="p-1 bg-muted rounded">
                                      <Truck size={14} className="text-muted-foreground" />
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-foreground">{plate || 'Inconnu'}</p>
                                      <p className="text-[10px] text-muted-foreground">{driver || 'Non assigné'}</p>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    ) : (
                       <p className="text-sm text-muted-foreground italic">Aucune livraison enregistrée.</p>
                    )}
                 </div>

                 {/* Section 4: Deliveries List */}
                 <div>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                       <Package size={16} className="text-primary" /> Historique des Expéditions
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                       <table className="w-full text-sm text-left">
                          <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
                             <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">N° BL</th>
                                <th className="px-4 py-3">Camion</th>
                                <th className="px-4 py-3 text-right">Tonnage</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             {viewLoading ? (
                                <tr><td colSpan={4} className="p-4 text-center">Chargement...</td></tr>
                             ) : viewDeliveries.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground italic">Aucune donnée.</td></tr>
                             ) : (
                                viewDeliveries.map((d, i) => (
                                   <tr key={i} className="hover:bg-muted/20">
                                      <td className="px-4 py-3">{new Date(d.delivery_date).toLocaleDateString()}</td>
                                      <td className="px-4 py-3 font-mono font-medium">{d.bl_number}</td>
                                      <td className="px-4 py-3 text-muted-foreground text-xs">{d.truck_plate}</td>
                                      <td className="px-4 py-3 text-right font-bold">{d.tonnage_loaded} T</td>
                                   </tr>
                                ))
                             )}
                          </tbody>
                          {viewDeliveries.length > 0 && (
                             <tfoot className="bg-muted/30 font-bold text-foreground">
                                <tr>
                                   <td colSpan={3} className="px-4 py-3 text-right">TOTAL CHARGÉ</td>
                                   <td className="px-4 py-3 text-right text-primary">{viewAllocation.delivered_tonnage} T</td>
                                </tr>
                             </tfoot>
                          )}
                       </table>
                    </div>
                 </div>

              </div>
              
              <div className="p-6 border-t border-border bg-muted/10 text-center text-xs text-muted-foreground no-print">
                 Document généré le {new Date().toLocaleDateString()} via MASAE Tracker
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
