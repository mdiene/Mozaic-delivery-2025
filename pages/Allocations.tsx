
import { useState, useMemo, FormEvent } from 'react';
import { db } from '../services/db';
import { AllocationView, DeliveryView } from '../types';
import { useAllocations, useReferenceData, useUpdateItem, useDeleteItem } from '../hooks/useData';
import { 
  Plus, Search, MapPin, Edit2, Trash2, AlertTriangle, Lock, Unlock, X, Save,
  CheckCircle, TrendingUp, Activity, Eye, Printer, ArrowUpDown, ChevronRight, Layers, ListFilter, Truck,
  Phone, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../components/Layout';
import { AdvancedSelect } from '../components/AdvancedSelect';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export const Allocations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVisitor = user?.role === 'VISITOR';
  const { selectedProject, projects, setSelectedProject } = useProject();
  const queryClient = useQueryClient();
  
  // Data Fetching via React Query
  const { data: allocations = [], isLoading: loadingAllocations } = useAllocations(selectedProject);
  const { data: refData, isLoading: loadingRefs } = useReferenceData();
  
  const regions = refData?.regions || [];
  const departments = refData?.departments || [];
  const communes = refData?.communes || [];
  const operators = refData?.operators || [];

  // Mutations
  const updateMutation = useUpdateItem('allocations');
  const deleteMutation = useDeleteItem('allocations');

  const loading = loadingAllocations || loadingRefs;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVER_DELIVERED'>('ALL');

  // Sorting & Grouping
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewAllocation, setViewAllocation] = useState<AllocationView | null>(null);
  const [viewDeliveries, setViewDeliveries] = useState<DeliveryView[]>([]);

  // Filter Logic
  const filteredAllocations = useMemo(() => {
    return allocations.filter(alloc => {
      // 1. Project Context Filter
      if (selectedProject !== 'all' && alloc.project_id !== selectedProject) return false;

      // 2. Status Filter
      if (statusFilter !== 'ALL' && alloc.status !== statusFilter) return false;

      // 3. Search
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          alloc.operator_name.toLowerCase().includes(lower) ||
          alloc.commune_name.toLowerCase().includes(lower) ||
          (alloc.allocation_key && alloc.allocation_key.toLowerCase().includes(lower))
        );
      }
      return true;
    });
  }, [allocations, selectedProject, statusFilter, searchTerm]);

  // Sorting Logic
  const sortedAllocations = useMemo(() => {
    let sortableItems = [...filteredAllocations];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof AllocationView];
        let bValue: any = b[sortConfig.key as keyof AllocationView];

        // Custom sort for performance (progress)
        if (sortConfig.key === 'performance') {
           aValue = a.progress;
           bValue = b.progress;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredAllocations, sortConfig]);

  // Grouping Logic
  const groupedAllocations = useMemo(() => {
    const groups: Record<string, AllocationView[]> = {};
    sortedAllocations.forEach(alloc => {
        const phase = alloc.project_phase || 'Autres';
        if (!groups[phase]) groups[phase] = [];
        groups[phase].push(alloc);
    });
    
    // Sort keys (Phases) - usually reverse chronological or alphabetical
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Descending phase
  }, [sortedAllocations]);

  const toggleGroup = (phase: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(phase)) {
      newSet.delete(phase);
    } else {
      newSet.add(phase);
    }
    setExpandedGroups(newSet);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handlers
  const handleCreateDelivery = (alloc: AllocationView) => {
    navigate(`/logistics/dispatch?action=new&allocationId=${alloc.id}`);
  };

  const handleCloseAllocation = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Voulez-vous vraiment clôturer cette allocation ? Elle ne pourra plus recevoir de livraisons.')) return;
    try {
      await updateMutation.mutateAsync({ id, payload: { status: 'CLOSED' } });
    } catch (e) {
      alert("Erreur lors de la clôture.");
    }
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Supprimer cette allocation ? Attention, cela supprimera toutes les livraisons associées.')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      alert("Impossible de supprimer.");
    }
  };

  const handleView = async (alloc: AllocationView) => {
    setViewAllocation(alloc);
    // Fetch deliveries for this specific allocation (Not migrated to hooks yet for direct view logic)
    try {
      const allDeliveries = await db.getDeliveriesView();
      const related = allDeliveries.filter(d => d.allocation_id === alloc.id);
      setViewDeliveries(related);
      setIsViewModalOpen(true);
    } catch (e) {
      console.error("Error fetching deliveries for view", e);
      alert("Erreur lors du chargement des livraisons.");
    }
  };

  const handleOpenModal = (alloc?: AllocationView) => {
    if (isVisitor) return;
    if (alloc) {
      setFormData({ ...alloc });
    } else {
      setFormData({
        status: 'OPEN',
        target_tonnage: 0,
        allocation_key: `ALL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    try {
      const payload = {
        allocation_key: formData.allocation_key,
        project_id: formData.project_id,
        region_id: formData.region_id,
        department_id: formData.department_id,
        commune_id: formData.commune_id,
        operator_id: formData.operator_id,
        target_tonnage: Number(formData.target_tonnage),
        status: formData.status || 'OPEN',
        responsible_name: formData.responsible_name,
        responsible_phone_raw: formData.responsible_phone_raw
      };

      if (formData.id) {
        await updateMutation.mutateAsync({ id: formData.id, payload });
      } else {
        await db.createItem('allocations', payload);
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Modal Specific Logic ---

  // Helper for cascading selects in Modal
  const filteredDepartments = useMemo(() => {
    if (!formData.region_id) return [];
    return departments.filter(d => d.region_id === formData.region_id);
  }, [departments, formData.region_id]);

  const filteredCommunes = useMemo(() => {
    if (!formData.department_id) return [];
    return communes.filter(c => c.department_id === formData.department_id);
  }, [communes, formData.department_id]);

  // Filter Operators by Selected Project (Phase)
  const filteredOperators = useMemo(() => {
    if (!formData.project_id) return [];
    return operators.filter(op => op.project_id === formData.project_id);
  }, [operators, formData.project_id]);

  // Handle Operator Selection: Auto-fill Phone & Geo Data & Name
  const handleOperatorSelect = (operatorId: string) => {
    const op = operators.find(o => o.id === operatorId);
    if (!op) return;

    const updates: any = { operator_id: operatorId };

    // Auto-fill Name
    if (op.name) {
      updates.responsible_name = op.name;
    }

    // Auto-fill Phone
    if (op.phone) {
      updates.responsible_phone_raw = op.phone;
    }

    // Auto-fill Geographic Data based on Operator's Commune
    if (op.commune_id) {
      const commune = communes.find(c => c.id === op.commune_id);
      if (commune) {
        updates.commune_id = commune.id;
        updates.department_id = commune.department_id;
        
        const dept = departments.find(d => d.id === commune.department_id);
        if (dept) {
          updates.region_id = dept.region_id;
        }
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="text-muted-foreground">Chargement des allocations...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Allocations</h1>
          <p className="text-muted-foreground text-sm">Gérer les quotas par commune et par opérateur.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nouvelle Allocation
        </button>
      </div>

      {/* Modern Filter Ribbon */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Top Row: Search & Phase */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center border-b border-border/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher Opérateur, Commune, Référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          
          <div className="flex-1 w-full md:w-auto">
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
                <Layers size={14} /> Phase:
              </span>
              <form className="filter">
                <input 
                  className="btn btn-square" 
                  type="reset" 
                  value="×" 
                  onClick={() => setSelectedProject('all')}
                  title="Réinitialiser"
                />
                <input 
                  className="btn" 
                  type="radio" 
                  name="allocation-phase" 
                  aria-label="Toutes"
                  checked={selectedProject === 'all'}
                  onChange={() => setSelectedProject('all')}
                />
                {projects.map(p => (
                  <input
                    key={p.id}
                    className="btn" 
                    type="radio" 
                    name="allocation-phase" 
                    aria-label={`Phase ${p.numero_phase}`}
                    checked={selectedProject === p.id}
                    onChange={() => setSelectedProject(p.id)}
                  />
                ))}
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Row: Status Filters - Dedicated Area */}
        <div className="bg-muted/30 p-3 flex items-center justify-start gap-4 overflow-x-auto">
           <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <ListFilter size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Statut:</span>
           </div>
           <div className="flex items-center gap-2">
             {(['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'OVER_DELIVERED'] as const).map(status => {
                const labelMap: any = { 'ALL': 'Tous', 'OPEN': 'Ouvert', 'IN_PROGRESS': 'En Cours', 'CLOSED': 'Clôturé', 'OVER_DELIVERED': 'Dépassement' };
                const isActive = statusFilter === status;
                
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border shadow-sm
                       ${isActive 
                         ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20' 
                         : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                       }`}
                  >
                    {labelMap[status]}
                  </button>
                );
             })}
           </div>
        </div>
      </div>

      {/* Accordion Content */}
      <div className="accordion flex flex-col gap-4">
         {groupedAllocations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
               Aucune allocation trouvée.
            </div>
         )}

         {groupedAllocations.map(([phase, items]) => {
            const isOpen = expandedGroups.has(phase);
            const totalTarget = items.reduce((sum, item) => sum + item.target_tonnage, 0);
            const totalDelivered = items.reduce((sum, item) => sum + item.delivered_tonnage, 0);
            const progress = totalTarget > 0 ? (totalDelivered / totalTarget) * 100 : 0;

            return (
               <div key={phase} className="accordion-item shadow-sm hover:shadow-md transition-shadow duration-200">
                  <button 
                     onClick={() => toggleGroup(phase)}
                     className="accordion-toggle bg-card hover:bg-muted/50 transition-colors duration-200 py-4"
                     aria-expanded={isOpen}
                  >
                     <div className="flex items-center gap-4">
                        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-primary' : 'text-muted-foreground'}`}>
                           <ChevronRight size={20} />
                        </span>
                        <div className="flex flex-col">
                           <span className="text-lg font-bold text-foreground">{phase}</span>
                           <span className="text-xs text-muted-foreground font-medium">{items.length} Allocations</span>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-8 mr-4">
                        <div className="text-right hidden sm:block">
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cible Total</p>
                           <p className="font-mono font-bold text-base">{totalTarget.toLocaleString()} T</p>
                        </div>
                        <div className="text-right hidden sm:block">
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Livré Total</p>
                           <p className={`font-mono font-bold text-base ${progress >= 100 ? 'text-emerald-600' : 'text-primary'}`}>
                              {totalDelivered.toLocaleString()} T
                           </p>
                        </div>
                     </div>
                  </button>

                  <div className={`accordion-content ${!isOpen ? 'hidden' : ''}`}>
                     <div className="w-full overflow-x-auto">
                        <table className="table w-full">
                           <thead className="bg-primary/5 border-b-2 border-primary/20">
                              <tr>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Opérateur / Référence</th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Localisation</th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Phase</th>
                                 <th 
                                    className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider cursor-pointer hover:bg-primary/10 transition-colors"
                                    onClick={() => requestSort('performance')}
                                 >
                                    <div className="flex items-center gap-1">
                                       Performance & Quota
                                       <ArrowUpDown size={14} className={sortConfig?.key === 'performance' ? 'text-primary' : 'text-primary/50'} />
                                    </div>
                                 </th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Statut</th>
                                 <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-border">
                              {items.map(alloc => {
                                 // Progress Bar Logic
                                 const progress = alloc.progress;
                                 let progressColor = 'bg-primary';
                                 let textColor = 'text-primary';
                                 let StatusIcon = Activity;

                                 if (progress > 100) {
                                    progressColor = 'bg-red-500';
                                    textColor = 'text-red-500';
                                    StatusIcon = AlertTriangle;
                                 } else if (progress >= 100) {
                                    progressColor = 'bg-emerald-500';
                                    textColor = 'text-emerald-500';
                                    StatusIcon = CheckCircle;
                                 } else if (progress >= 70) {
                                    progressColor = 'bg-sky-500';
                                    textColor = 'text-sky-500';
                                    StatusIcon = TrendingUp;
                                 } else if (progress >= 40) {
                                    progressColor = 'bg-amber-500';
                                    textColor = 'text-amber-500';
                                    StatusIcon = Activity;
                                 }

                                 const stepsFilled = Math.min(10, Math.floor(progress / 10));

                                 return (
                                    <tr key={alloc.id} className="hover:bg-muted/30 transition-colors">
                                       <td className="px-4 py-3">
                                          <div className="group relative">
                                             <div className="flex flex-col cursor-help">
                                                <span className="font-bold text-foreground text-sm">{alloc.operator_name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{alloc.allocation_key}</span>
                                             </div>
                                             
                                             {/* Hover Tooltip Card */}
                                             <div className="invisible group-hover:visible absolute z-50 left-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-xl shadow-soft-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="flex flex-col gap-2">
                                                   <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                                      <User size={12} /> Contact Responsable
                                                   </div>
                                                   <div className="space-y-1.5">
                                                      <p className="text-sm font-bold text-foreground">{alloc.responsible_name || 'Non spécifié'}</p>
                                                      {alloc.responsible_phone_raw ? (
                                                         <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                               <Phone size={12} />
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-foreground tracking-tight">{alloc.responsible_phone_raw}</span>
                                                         </div>
                                                      ) : (
                                                         <p className="text-xs text-muted-foreground italic">Aucun téléphone enregistré</p>
                                                      )}
                                                   </div>
                                                   <div className="mt-1 pt-2 border-t border-border flex items-center gap-1.5">
                                                      <MapPin size={10} className="text-muted-foreground" />
                                                      <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                         {alloc.commune_name}, {alloc.region_name}
                                                      </span>
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="flex flex-col text-sm">
                                             <span className="text-foreground">{alloc.commune_name}</span>
                                             <span className="text-xs text-muted-foreground">{alloc.department_name}, {alloc.region_name}</span>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">
                                          <span className="badge badge-soft badge-secondary text-xs">{alloc.project_phase || '-'}</span>
                                       </td>
                                       <td className="px-4 py-3 w-64">
                                          <div className="flex flex-col gap-1.5">
                                             <div className="flex justify-between text-xs font-medium">
                                                <span className={textColor}>
                                                   {alloc.delivered_tonnage.toLocaleString()} / {alloc.target_tonnage.toLocaleString()} T
                                                </span>
                                                <span className="text-muted-foreground">{alloc.progress.toFixed(0)}%</span>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <div className="flex-1 flex gap-0.5 h-2">
                                                   {[...Array(10)].map((_, i) => (
                                                      <div 
                                                         key={i}
                                                         className={`flex-1 rounded-sm transition-colors duration-300 ${
                                                            i < stepsFilled ? progressColor : 'bg-muted/50'
                                                         }`}
                                                      ></div>
                                                   ))}
                                                </div>
                                                <StatusIcon size={16} className={textColor} />
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">
                                          {(() => {
                                             const config = {
                                                'OPEN': { label: 'Ouvert', icon: Unlock, className: 'badge-info' },
                                                'IN_PROGRESS': { label: 'En Cours', icon: Activity, className: 'badge-warning' },
                                                'CLOSED': { label: 'Clôturé', icon: Lock, className: 'badge-success' },
                                                'OVER_DELIVERED': { label: 'Dépassement', icon: AlertTriangle, className: 'badge-error' }
                                             }[alloc.status as string] || { label: alloc.status, icon: Activity, className: 'badge-secondary' };
                                             
                                             const StatusIconComponent = config.icon;

                                             return (
                                                <button 
                                                   onClick={() => setStatusFilter(alloc.status as any)}
                                                   className={`badge badge-soft text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity gap-1.5 ${config.className}`}
                                                   title="Filtrer par ce statut"
                                                >
                                                   <StatusIconComponent size={12} />
                                                   {config.label}
                                                </button>
                                             );
                                          })()}
                                       </td>
                                       <td className="px-4 py-3 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                             <button 
                                               onClick={() => handleView(alloc)}
                                               className="btn btn-circle btn-text btn-sm text-sky-600 hover:bg-sky-50"
                                               title="Voir Détails"
                                             >
                                               <Eye size={16} />
                                             </button>
                                             <button 
                                               onClick={() => handleCreateDelivery(alloc)}
                                               disabled={alloc.status === 'CLOSED' || isVisitor}
                                               className={`btn btn-circle btn-text btn-sm ${ (alloc.status === 'CLOSED' || isVisitor) ? 'text-muted-foreground opacity-30 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                               title={alloc.status === 'CLOSED' ? "Allocation fermée" : isVisitor ? "Lecture seule" : "Nouvelle Expédition"}
                                             >
                                               <Truck size={16} />
                                             </button>
                                             
                                             <button 
                                               onClick={() => handleCloseAllocation(alloc.id)}
                                               disabled={alloc.status === 'CLOSED' || alloc.progress < 100 || isVisitor}
                                               className={`btn btn-circle btn-text btn-sm ${
                                                 (alloc.status === 'CLOSED' || alloc.progress < 100 || isVisitor)
                                                   ? 'text-muted-foreground opacity-30 cursor-not-allowed' 
                                                   : 'text-amber-600 hover:bg-amber-50'
                                               }`}
                                               title={
                                                 alloc.status === 'CLOSED' 
                                                   ? "Déjà clôturé" 
                                                   : alloc.progress < 100 
                                                     ? "Objectif non atteint (100% requis pour clôturer)" 
                                                     : isVisitor ? "Lecture seule" : "Clôturer"
                                               }
                                             >
                                               <Lock size={16} />
                                             </button>

                                             <button 
                                               onClick={() => handleOpenModal(alloc)}
                                               disabled={isVisitor}
                                               className="btn btn-circle btn-text btn-sm text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                               title={isVisitor ? "Lecture seule" : "Modifier"}
                                             >
                                                <Edit2 size={16} />
                                             </button>
                                             <button 
                                               onClick={() => handleDelete(alloc.id)}
                                               disabled={isVisitor}
                                               className="btn btn-circle btn-text btn-sm btn-text-error hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                               title={isVisitor ? "Lecture seule" : "Supprimer"}
                                             >
                                                <Trash2 size={16} />
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier Allocation' : 'Nouvelle Allocation'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Left Col */}
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Projet</label>
                     <select 
                        required
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.project_id || ''}
                        onChange={e => setFormData({
                           ...formData, 
                           project_id: e.target.value,
                           operator_id: '', // Reset dependant fields
                           region_id: '',
                           department_id: '',
                           commune_id: ''
                        })}
                     >
                        <option value="">Sélectionner un Projet...</option>
                        {projects.map(p => (
                           <option key={p.id} value={p.id}>Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}</option>
                        ))}
                     </select>
                  </div>
                  
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Région</label>
                     <select 
                        required
                        disabled={!formData.project_id}
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.region_id || ''}
                        onChange={e => setFormData({...formData, region_id: e.target.value, department_id: '', commune_id: ''})}
                     >
                        <option value="">Sélectionner...</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Département</label>
                     <select 
                        required
                        disabled={!formData.region_id || !formData.project_id}
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.department_id || ''}
                        onChange={e => setFormData({...formData, department_id: e.target.value, commune_id: ''})}
                     >
                        <option value="">Sélectionner...</option>
                        {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Commune</label>
                     <select 
                        required
                        disabled={!formData.department_id || !formData.project_id}
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.commune_id || ''}
                        onChange={e => setFormData({...formData, commune_id: e.target.value})}
                     >
                        <option value="">Sélectionner...</option>
                        {filteredCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
               </div>

               {/* Right Col */}
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Opérateur</label>
                     <AdvancedSelect 
                        options={filteredOperators.map(op => ({
                           value: op.id, 
                           label: op.name, 
                           subLabel: op.is_coop ? op.coop_name : 'Individuel'
                        }))}
                        value={formData.operator_id || ''}
                        onChange={handleOperatorSelect}
                        placeholder={formData.project_id ? "Rechercher Opérateur..." : "Sélectionner un projet d'abord"}
                        disabled={!formData.project_id}
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Objectif Tonnage (T)</label>
                     <input 
                        type="number"
                        step="0.01"
                        required
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.target_tonnage || ''}
                        onChange={e => setFormData({...formData, target_tonnage: e.target.value})}
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Responsable (Sur site)</label>
                     <input 
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.responsible_name || ''}
                        onChange={e => setFormData({...formData, responsible_name: e.target.value})}
                        placeholder="Nom complet"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-foreground mb-1">Téléphone Responsable</label>
                     <input 
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                        value={formData.responsible_phone_raw || ''}
                        onChange={e => setFormData({...formData, responsible_phone_raw: e.target.value})}
                        placeholder="77 000 00 00"
                     />
                  </div>
                  
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
                        </select>
                     </div>
                  )}
               </div>

               <div className="md:col-span-2 pt-4 flex justify-end gap-2 border-t border-border mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                     <Save size={16} /> Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL (KEPT AS IS) */}
      {isViewModalOpen && viewAllocation && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
           <style>
             {`
               @media print {
                 body > *:not(.print-content-wrapper) { display: none !important; }
                 .print-content-wrapper { display: block !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
                 .no-print { display: none !important; }
                 .print-card { border: 1px solid #ddd !important; box-shadow: none !important; }
               }
             `}
           </style>

           <div className="print-content-wrapper min-h-screen p-4 md:p-8">
              <div className="max-w-5xl mx-auto bg-card rounded-xl shadow-2xl border border-border p-8 print-card">
                 {/* Header Actions */}
                 <div className="flex justify-between items-start mb-8 no-print border-b border-border pb-4">
                    <div>
                       <h2 className="text-2xl font-bold text-foreground">Détails de l'Allocation</h2>
                       <p className="text-muted-foreground text-sm">Vue complète et statut des livraisons</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90"><Printer size={18} /> Imprimer</button>
                       <button onClick={() => setIsViewModalOpen(false)} className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium hover:bg-muted/80"><X size={18} /> Fermer</button>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                       <div className="flex-1">
                          <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-2">{viewAllocation.status}</div>
                          <h1 className="text-3xl font-bold text-foreground mb-1">{viewAllocation.operator_name}</h1>
                          <p className="text-lg text-muted-foreground font-mono">{viewAllocation.allocation_key}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Responsable</p>
                          <p className="font-medium text-foreground text-lg">{viewAllocation.responsible_name || 'Non spécifié'}</p>
                          <p className="font-mono text-muted-foreground">{viewAllocation.responsible_phone_raw || '-'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
