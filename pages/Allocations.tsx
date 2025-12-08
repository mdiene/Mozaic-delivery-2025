
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { AllocationView, Project, Operator, Region, Department, Commune } from '../types';
import { Plus, Search, Filter, Edit2, Trash2, X, Save, RefreshCw, User, Phone, Layers, Lock, CheckCircle, Truck, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

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
               aria-label="Tous"
               checked={selectedPhaseFilter === 'all'}
               onChange={() => setSelectedPhaseFilter('all')}
             />
             <input 
               className="btn" 
               type="radio" 
               name="alloc-phase" 
               aria-label="Non Assignés"
               checked={selectedPhaseFilter === 'unassigned'}
               onChange={() => setSelectedPhaseFilter('unassigned')}
             />
             {projects.map(p => {
               const count = allocations.filter(a => a.project_id === p.id).length;
               if (count === 0) return null;
               return (
                 <input
                   key={p.id}
                   className="btn" 
                   type="radio" 
                   name="alloc-phase" 
                   aria-label={`Phase ${p.numero_phase}`}
                   checked={selectedPhaseFilter === p.id}
                   onChange={() => setSelectedPhaseFilter(p.id)}
                 />
               );
             })}
           </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clé d'Allocation</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opérateur</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Région / Commune</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progression</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement des allocations...</td>
                </tr>
              )}
              {!loading && filteredAllocations.length === 0 && (
                 <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Aucune allocation trouvée.</td>
                 </tr>
              )}
              
              {groupedAllocations.map((group) => (
                <React.Fragment key={group.key}>
                  {groupBy !== 'none' && (
                    <tr className="bg-muted/30 border-y border-border">
                      <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">
                        {group.key} ({group.items.length})
                      </td>
                    </tr>
                  )}
                  {group.items.map((alloc) => (
                    <tr 
                      key={alloc.id} 
                      className={`hover:bg-muted/50 transition-colors group ${alloc.status === 'CLOSED' ? 'opacity-60 bg-muted/20 grayscale-[0.5]' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-medium text-foreground bg-muted px-2 py-1 rounded border border-border">
                          {alloc.allocation_key}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{alloc.operator_name}</p>
                        <p className="text-xs text-muted-foreground">
                           {alloc.responsible_name !== alloc.operator_name ? `Resp: ${alloc.responsible_name}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">{alloc.region_name}</p>
                        <p className="text-xs text-muted-foreground">{alloc.commune_name}</p>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{alloc.delivered_tonnage} / {alloc.target_tonnage} T</span>
                          <span className="font-medium text-primary">{alloc.progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(alloc.progress, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {/* Status Select - Always Enabled to allow re-opening */}
                        <select
                          className={`text-xs font-medium border-none bg-transparent focus:ring-0 cursor-pointer rounded px-2 py-1
                            ${alloc.status === 'IN_PROGRESS' ? 'text-blue-600 bg-blue-50' : ''}
                            ${alloc.status === 'OPEN' ? 'text-emerald-600 bg-emerald-50' : ''}
                            ${alloc.status === 'CLOSED' ? 'text-slate-500 bg-slate-100' : ''}
                            ${alloc.status === 'OVER_DELIVERED' ? 'text-red-600 bg-red-50' : ''}
                          `}
                          value={alloc.status}
                          onChange={(e) => handleStatusChange(alloc.id, e.target.value)}
                        >
                          <option value="OPEN">OUVERT</option>
                          <option value="IN_PROGRESS">EN COURS</option>
                          <option value="CLOSED">FERMÉ</option>
                          <option value="OVER_DELIVERED">SUR-LIVRÉ</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                        
                        {/* Add Delivery Action */}
                        <button
                          onClick={() => handleCreateDelivery(alloc)}
                          disabled={alloc.status === 'CLOSED'}
                          className={`p-2 rounded-lg transition-colors border ${
                            alloc.status !== 'CLOSED'
                              ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer shadow-sm'
                              : 'bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50'
                          }`}
                          title="Nouvelle Expédition"
                        >
                          <Truck size={16} />
                        </button>

                        <div className="w-px h-4 bg-border mx-1"></div>

                        {/* Close Button - Active only if 100% */}
                        <button
                          onClick={() => handleCloseAllocation(alloc.id)}
                          disabled={alloc.progress < 100 || alloc.status === 'CLOSED'}
                          className={`p-2 rounded-lg transition-colors border ${
                            alloc.progress >= 100 && alloc.status !== 'CLOSED'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 cursor-pointer shadow-sm'
                              : 'bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50'
                          }`}
                          title={alloc.progress >= 100 ? "Clôturer l'allocation (100% atteint)" : "Progression insuffisante pour clôture auto"}
                        >
                          {alloc.status === 'CLOSED' ? <CheckCircle size={16} /> : <Lock size={16} />}
                        </button>

                        <div className="w-px h-4 bg-border mx-1"></div>

                        <button 
                          onClick={() => handleOpenModal(alloc)}
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                          title="Modifier Allocation"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(alloc.id)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                          title="Supprimer Allocation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
             <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
               <h3 className="font-semibold text-foreground">
                 {formData.id ? 'Modifier Allocation' : 'Nouvelle Allocation'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-[70vh] overflow-y-auto">
                {/* ... (Existing form content remains unchanged) ... */}
                {/* Project */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Phase Projet</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.project_id || ''}
                    onChange={(e) => {
                      const newProjectId = e.target.value;
                      const newProject = projects.find(p => p.id === newProjectId);
                      
                      setFormData((prev: any) => {
                        const currentOp = operators.find(o => o.id === prev.operator_id);
                        const currentOpProject = projects.find(p => p.id === currentOp?.projet_id);
                        
                        const isOpValid = !prev.operator_id || (
                            currentOpProject && 
                            newProject && 
                            currentOpProject.numero_phase === newProject.numero_phase
                        );
                        
                        return {
                          ...prev,
                          project_id: newProjectId,
                          operator_id: isOpValid ? prev.operator_id : ''
                        };
                      });
                    }}
                  >
                    <option value="">Sélectionner Projet...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator (Triggers auto-fill) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Opérateur</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.operator_id || ''}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                  >
                    <option value="">Sélectionner Opérateur...</option>
                    {operators
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
                      .map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.commune_name ? `(${o.commune_name})` : ''} {(!formData.project_id && o.project_name && o.project_name !== '-') ? `- ${o.project_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                     {formData.project_id 
                      ? "Seuls les opérateurs de la même Phase sont affichés."
                      : "Affichage de tous les opérateurs non alloués."}
                  </p>
                </div>
                
                {/* Responsible Person Section (DB Requirement) */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
                   <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Détails Responsable</div>
                   <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <User size={14} /> Nom Complet
                      </label>
                      <input 
                        type="text"
                        required
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.responsible_name || ''}
                        onChange={(e) => setFormData({...formData, responsible_name: e.target.value})}
                        placeholder="Nom du responsable"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Phone size={14} /> Téléphone
                      </label>
                      <input 
                        type="text"
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.responsible_phone || ''}
                        onChange={(e) => setFormData({...formData, responsible_phone: e.target.value})}
                        placeholder="Numéro de contact"
                      />
                   </div>
                </div>

                {/* Location Fields */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Région</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.region_id || ''}
                    onChange={(e) => setFormData({...formData, region_id: e.target.value})}
                  >
                     <option value="">Sélectionner Région...</option>
                     {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Département</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.department_id || ''}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  >
                     <option value="">Sélectionner Département...</option>
                     {departments
                       .filter(d => !formData.region_id || d.region_id === formData.region_id)
                       .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                     }
                  </select>
                </div>

                <div className="md:col-span-2 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-900/10">
                  <label className="block text-sm font-medium text-foreground mb-1">Commune</label>
                  <select 
                    required 
                    className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                    value={formData.commune_id || ''}
                    onChange={(e) => handleCommuneChange(e.target.value)}
                  >
                     <option value="">Sélectionner Commune...</option>
                     {getAvailableCommunes()
                       .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                     }
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sélectionner une commune mettra automatiquement à jour la Région et le Département.
                  </p>
                </div>

                <div>
                   <label className="block text-sm font-medium text-foreground mb-1">Tonnage Cible</label>
                   <input 
                     type="number" 
                     required 
                     className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                     value={formData.target_tonnage || ''}
                     onChange={(e) => setFormData({...formData, target_tonnage: e.target.value})}
                   />
                </div>

                <div className="md:col-span-2">
                   <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-foreground">Clé d'Allocation</label>
                      <button 
                        type="button" 
                        onClick={generateKey}
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <RefreshCw size={12} /> Auto-Générer
                      </button>
                   </div>
                   <input 
                     type="text" 
                     required 
                     className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground font-mono uppercase"
                     value={formData.allocation_key || ''}
                     onChange={(e) => setFormData({...formData, allocation_key: e.target.value.toUpperCase()})}
                     placeholder="ex: PH1-DK-OP-1234"
                   />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-foreground mb-1">Statut</label>
                   <select 
                     className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                     value={formData.status || 'OPEN'}
                     onChange={(e) => setFormData({...formData, status: e.target.value})}
                   >
                     <option value="OPEN">Ouvert</option>
                     <option value="IN_PROGRESS">En Cours</option>
                     <option value="CLOSED">Fermé</option>
                   </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border mt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                   <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                     <Save size={16} /> Enregistrer
                   </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};
