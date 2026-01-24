
import { useState, useMemo, FormEvent } from 'react';
import { db } from '../services/db';
import { AllocationView, DeliveryView } from '../types';
import { useAllocations, useReferenceData, useUpdateItem, useDeleteItem } from '../hooks/useData';
import { 
  Plus, Search, MapPin, Edit2, Trash2, AlertTriangle, Lock, Unlock, X, Save,
  CheckCircle, TrendingUp, Activity, Eye, Printer, ArrowUpDown, ChevronRight, Layers, ListFilter, Truck,
  Phone, User, Box, Calendar, FileText, Info, Lightbulb, History as HistoryIcon, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../components/Layout';
import { AdvancedSelect } from '../components/AdvancedSelect';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export const Allocations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProject, projects, setSelectedProject } = useProject();
  const queryClient = useQueryClient();
  
  const isVisitor = user?.role === 'VISITOR';
  
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
      if (selectedProject !== 'all' && alloc.project_id !== selectedProject) return false;
      if (statusFilter !== 'ALL' && alloc.status !== statusFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          alloc.operator_name.toLowerCase().includes(lower) ||
          (alloc.coop_name && alloc.coop_name.toLowerCase().includes(lower)) ||
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
        if (sortConfig.key === 'performance') { aValue = a.progress; bValue = b.progress; }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sortedAllocations]);

  const toggleGroup = (phase: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(phase)) newSet.delete(phase); else newSet.add(phase);
    setExpandedGroups(newSet);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

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
    try {
      const allDeliveries = await db.getDeliveriesView();
      const related = allDeliveries.filter(d => d.allocation_id === alloc.id);
      setViewDeliveries(related);
      setIsViewModalOpen(true);
    } catch (e) {
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

      if (formData.id) await updateMutation.mutateAsync({ id: formData.id, payload });
      else {
        await db.createItem('allocations', payload);
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handlePrint = () => { window.print(); };

  const filteredDepartments = useMemo(() => {
    if (!formData.region_id) return [];
    return departments.filter(d => d.region_id === formData.region_id);
  }, [departments, formData.region_id]);

  const filteredCommunes = useMemo(() => {
    if (!formData.department_id) return [];
    return communes.filter(c => c.department_id === formData.department_id);
  }, [communes, formData.department_id]);

  const filteredOperators = useMemo(() => {
    if (!formData.project_id) return [];
    return operators.filter(op => op.project_id === formData.project_id);
  }, [operators, formData.project_id]);

  const handleOperatorSelect = (operatorId: string) => {
    const op = operators.find(o => o.id === operatorId);
    if (!op) return;
    const updates: any = { 
      operator_id: operatorId,
      coop_name: op.coop_name,
      is_coop: op.is_coop
    };
    if (op.name) updates.responsible_name = op.name;
    if (op.phone) updates.responsible_phone_raw = op.phone;
    if (op.commune_id) {
      const commune = communes.find(c => c.id === op.commune_id);
      if (commune) {
        updates.commune_id = commune.id;
        updates.department_id = commune.department_id;
        const dept = departments.find(d => d.id === commune.department_id);
        if (dept) updates.region_id = dept.region_id;
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
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nouvelle Allocation
        </button>
      </div>

      {/* Modern Filter Ribbon */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
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
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-2 shrink-0 flex items-center gap-1"><Layers size={14} /> Phase:</span>
              <form className="filter">
                <input className="btn btn-square" type="reset" value="×" onClick={() => setSelectedProject('all')} />
                <input className="btn" type="radio" name="allocation-phase" aria-label="Toutes" checked={selectedProject === 'all'} onChange={() => setSelectedProject('all')} />
                {projects.map(p => (
                  <input key={p.id} className="btn" type="radio" name="allocation-phase" aria-label={`Phase ${p.numero_phase}`} checked={selectedProject === p.id} onChange={() => setSelectedProject(p.id)} />
                ))}
              </form>
            </div>
          </div>
        </div>
        <div className="bg-muted/30 p-3 flex items-center justify-start gap-4 overflow-x-auto">
           <div className="flex items-center gap-1 text-muted-foreground shrink-0"><ListFilter size={16} /><span className="text-xs font-bold uppercase tracking-wider">Statut:</span></div>
           <div className="flex items-center gap-2">
             {(['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'OVER_DELIVERED'] as const).map(status => {
                const labelMap: any = { 'ALL': 'Tous', 'OPEN': 'Ouvert', 'IN_PROGRESS': 'En Cours', 'CLOSED': 'Clôturé', 'OVER_DELIVERED': 'Dépassement' };
                const isActive = statusFilter === status;
                return (
                  <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border shadow-sm ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>{labelMap[status]}</button>
                );
             })}
           </div>
        </div>
      </div>

      {/* Accordion Content */}
      <div className="accordion flex flex-col gap-4">
         {groupedAllocations.length === 0 && <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">Aucune allocation trouvée.</div>}
         {groupedAllocations.map(([phase, items]) => {
            const isOpen = expandedGroups.has(phase);
            const totalTarget = items.reduce((sum, item) => sum + item.target_tonnage, 0);
            const totalDelivered = items.reduce((sum, item) => sum + item.delivered_tonnage, 0);
            const progress = totalTarget > 0 ? (totalDelivered / totalTarget) * 100 : 0;
            return (
               <div key={phase} className="accordion-item shadow-sm hover:shadow-md transition-shadow duration-200">
                  <button onClick={() => toggleGroup(phase)} className="accordion-toggle bg-card hover:bg-muted/50 transition-colors duration-200 py-4">
                     <div className="flex items-center gap-4">
                        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-primary' : 'text-muted-foreground'}`}><ChevronRight size={20} /></span>
                        <div className="flex flex-col"><span className="text-lg font-bold text-foreground">{phase}</span><span className="text-xs text-muted-foreground font-medium">{items.length} Allocations</span></div>
                     </div>
                     <div className="flex items-center gap-8 mr-4">
                        <div className="text-right hidden sm:block"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cible Total</p><p className="font-mono font-bold text-base">{totalTarget.toLocaleString()} T</p></div>
                        <div className="text-right hidden sm:block"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Livré Total</p><p className={`font-mono font-bold text-base ${progress >= 100 ? 'text-emerald-600' : 'text-primary'}`}>{totalDelivered.toLocaleString()} T</p></div>
                     </div>
                  </button>
                  <div className={`accordion-content ${!isOpen ? 'hidden' : ''}`}>
                     <div className="w-full overflow-x-auto">
                        <table className="table w-full">
                           <thead className="bg-primary/5 border-b-2 border-primary/20">
                              <tr>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Opérateur / Référence</th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Localisation</th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Coopérative</th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => requestSort('performance')}>
                                    <div className="flex items-center gap-1">Performance & Quota <ArrowUpDown size={14} className={sortConfig?.key === 'performance' ? 'text-primary' : 'text-primary/50'} /></div>
                                 </th>
                                 <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Statut</th>
                                 <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-border">
                              {items.map(alloc => {
                                 const progress = alloc.progress;
                                 let progressColor = 'bg-primary'; let textColor = 'text-primary'; let StatusIcon = Activity;
                                 if (progress > 100) { progressColor = 'bg-red-500'; textColor = 'text-red-500'; StatusIcon = AlertTriangle; }
                                 else if (progress >= 100) { progressColor = 'bg-emerald-500'; textColor = 'text-emerald-500'; StatusIcon = CheckCircle; }
                                 else if (progress >= 70) { progressColor = 'bg-sky-500'; textColor = 'text-sky-500'; StatusIcon = TrendingUp; }
                                 const stepsFilled = Math.min(10, Math.floor(progress / 10));
                                 return (
                                    <tr key={alloc.id} className="hover:bg-muted/30 transition-colors">
                                       <td className="px-4 py-3">
                                          <div className="group relative">
                                             <div className="flex flex-col cursor-help"><span className="font-bold text-foreground text-sm">{alloc.operator_name}</span><span className="text-xs text-muted-foreground font-mono">{alloc.allocation_key}</span></div>
                                             <div className="invisible group-hover:visible absolute z-50 left-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-xl shadow-soft-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="flex flex-col gap-2">
                                                   <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest"><User size={12} /> Contact Responsable</div>
                                                   <div className="space-y-1.5"><p className="text-sm font-bold text-foreground">{alloc.responsible_name || 'Non spécifié'}</p>{alloc.responsible_phone_raw ? (<div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Phone size={12} /></div><span className="text-xs font-mono font-bold text-foreground tracking-tight">{alloc.responsible_phone_raw}</span></div>) : (<p className="text-xs text-muted-foreground italic">Aucun téléphone</p>)}</div>
                                                   <div className="mt-1 pt-2 border-t border-border flex items-center gap-1.5"><MapPin size={10} className="text-muted-foreground" /><span className="text-[10px] text-muted-foreground font-medium truncate">{alloc.commune_name}, {alloc.region_name}</span></div>
                                                </div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3"><div className="flex flex-col text-sm"><span className="text-foreground">{alloc.commune_name}</span><span className="text-xs text-muted-foreground">{alloc.department_name}, {alloc.region_name}</span></div></td>
                                       <td className="px-4 py-3">
                                          <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground">{alloc.coop_name || 'Individuel'}</span>
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{alloc.project_phase || '-'}</span>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3 w-64">
                                          <div className="flex flex-col gap-1.5">
                                             <div className="flex justify-between text-xs font-medium"><span className={textColor}>{alloc.delivered_tonnage.toLocaleString()} / {alloc.target_tonnage.toLocaleString()} T</span><span className="text-muted-foreground">{alloc.progress.toFixed(0)}%</span></div>
                                             <div className="flex items-center gap-2"><div className="flex-1 flex gap-0.5 h-2">{[...Array(10)].map((_, i) => (<div key={i} className={`flex-1 rounded-sm transition-colors duration-300 ${ i < stepsFilled ? progressColor : 'bg-muted/50' }`}></div>))}</div><StatusIcon size={16} className={textColor} /></div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">
                                          {(() => {
                                             const config = { 'OPEN': { label: 'Ouvert', icon: Unlock, className: 'badge-info' }, 'IN_PROGRESS': { label: 'En Cours', icon: Activity, className: 'badge-warning' }, 'CLOSED': { label: 'Clôturé', icon: Lock, className: 'badge-success' }, 'OVER_DELIVERED': { label: 'Dépassement', icon: AlertTriangle, className: 'badge-error' } }[alloc.status as string] || { label: alloc.status, icon: Activity, className: 'badge-secondary' };
                                             const StatusIconComponent = config.icon;
                                             return ( <button onClick={() => setStatusFilter(alloc.status as any)} className={`badge badge-soft text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity gap-1.5 ${config.className}`} title="Filtrer par ce statut"><StatusIconComponent size={12} />{config.label}</button> );
                                          })()}
                                       </td>
                                       <td className="px-4 py-3 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                             <button onClick={() => handleView(alloc)} className="btn btn-circle btn-text btn-sm text-sky-600 hover:bg-sky-50" title="Voir Détails"><Eye size={16} /></button>
                                             <button onClick={() => handleCreateDelivery(alloc)} disabled={alloc.status === 'CLOSED' || isVisitor} className={`btn btn-circle btn-text btn-sm ${ (alloc.status === 'CLOSED' || isVisitor) ? 'text-muted-foreground opacity-30 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`} title={alloc.status === 'CLOSED' ? "Allocation fermée" : isVisitor ? "Lecture seule" : "Nouvelle Expédition"}><Truck size={16} /></button>
                                             <button onClick={() => handleCloseAllocation(alloc.id)} disabled={alloc.status === 'CLOSED' || alloc.progress < 100 || isVisitor} className={`btn btn-circle btn-text btn-sm ${ (alloc.status === 'CLOSED' || alloc.progress < 100 || isVisitor) ? 'text-muted-foreground opacity-30 cursor-not-allowed' : 'text-amber-600 hover:bg-amber-50' }`} title={ alloc.status === 'CLOSED' ? "Déjà clôturé" : alloc.progress < 100 ? "Objectif non atteint" : isVisitor ? "Lecture seule" : "Clôturer" }><Lock size={16} /></button>
                                             <button onClick={() => handleOpenModal(alloc)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed" title={isVisitor ? "Lecture seule" : "Modifier"}><Edit2 size={16} /></button>
                                             <button onClick={() => handleDelete(alloc.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm btn-text-error hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed" title={isVisitor ? "Lecture seule" : "Supprimer"}><Trash2 size={16} /></button>
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
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier Allocation' : 'Nouvelle Allocation'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Main Form Section */}
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-foreground mb-1">Projet</label><select required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.project_id || ''} onChange={e => setFormData({ ...formData, project_id: e.target.value, operator_id: '', region_id: '', department_id: '', commune_id: '' })}><option value="">Sélectionner un Projet...</option>{projects.map(p => (<option key={p.id} value={p.id}>Phase {p.numero_phase}</option>))}</select></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Région</label><select required disabled={!formData.project_id} className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50" value={formData.region_id || ''} onChange={e => setFormData({...formData, region_id: e.target.value, department_id: '', commune_id: ''})}><option value="">Sélectionner...</option>{regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Département</label><select required disabled={!formData.region_id} className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50" value={formData.department_id || ''} onChange={e => setFormData({...formData, department_id: e.target.value, commune_id: ''})}><option value="">Sélectionner...</option>{filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Commune</label><select required disabled={!formData.department_id} className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground disabled:opacity-50" value={formData.commune_id || ''} onChange={e => setFormData({...formData, commune_id: e.target.value})}><option value="">Sélectionner...</option>{filteredCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-foreground mb-1">Opérateur</label><AdvancedSelect options={filteredOperators.map(op => ({ value: op.id, label: op.name, subLabel: op.is_coop ? op.coop_name : 'Individuel' }))} value={formData.operator_id || ''} onChange={handleOperatorSelect} placeholder="Rechercher Opérateur..." disabled={!formData.project_id} /></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Objectif Tonnage (T)</label><input type="number" step="0.01" required className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.target_tonnage || ''} onChange={e => setFormData({...formData, target_tonnage: e.target.value})} /></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Responsable</label><input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.responsible_name || ''} onChange={e => setFormData({...formData, responsible_name: e.target.value})} /></div>
                      <div><label className="block text-sm font-medium text-foreground mb-1">Téléphone</label><input className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground" value={formData.responsible_phone_raw || ''} onChange={e => setFormData({...formData, responsible_phone_raw: e.target.value})} /></div>
                  </div>
                </div>

                {/* Sidebar Info Section (Updated Info) */}
                <div className="md:col-span-4 bg-muted/20 rounded-xl border border-border p-5 space-y-6">
                   <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                        <Building2 size={16} /> Détails de l'Opérateur
                      </h4>
                      <div className="p-3 bg-card rounded-lg border border-border shadow-soft-sm">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Coopérative</p>
                         <p className="text-sm font-bold text-foreground">{formData.coop_name || 'Individuel'}</p>
                         <span className={`inline-block mt-1 badge text-[9px] font-black uppercase ${formData.is_coop ? 'badge-info' : 'badge-secondary'}`}>
                            {formData.is_coop ? 'Membre Coopérative' : 'Producteur Privé'}
                         </span>
                      </div>
                   </div>

                   {formData.id && (
                     <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                          <Activity size={16} /> Suivi des Livraisons
                        </h4>
                        <div className="space-y-3">
                           <div className="flex justify-between items-end border-b border-border pb-2">
                              <span className="text-xs font-medium text-muted-foreground">Livré à ce jour</span>
                              <span className="text-lg font-black text-primary font-mono">{formData.delivered_tonnage || 0} T</span>
                           </div>
                           <div className="flex justify-between items-end border-b border-border pb-2">
                              <span className="text-xs font-medium text-muted-foreground">Reliquat</span>
                              <span className="text-lg font-black text-amber-600 font-mono">
                                 {Math.max(0, (formData.target_tonnage || 0) - (formData.delivered_tonnage || 0)).toLocaleString()} T
                              </span>
                           </div>
                           <div className="pt-2">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground mb-1">
                                 <span>Progression</span>
                                 <span>{(formData.progress || 0).toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                                 <div 
                                    className={`h-full transition-all duration-1000 ${formData.progress >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(111,66,193,0.5)]'}`} 
                                    style={{ width: `${Math.min(100, formData.progress || 0)}%` }} 
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                      <div className="flex gap-2 text-amber-800 dark:text-amber-200">
                         <Info size={14} className="shrink-0 mt-0.5" />
                         <p className="text-[10px] leading-relaxed italic">
                            Les modifications sur le tonnage affecteront directement le reliquat affiché dans le module d'expédition.
                         </p>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-12 pt-4 flex justify-end gap-2 border-t border-border mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 font-bold shadow-soft-xl hover:shadow-glow transition-all active:scale-95">
                    <Save size={18} /> Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENHANCED VIEW MODAL */}
      {isViewModalOpen && viewAllocation && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
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
              <div className="max-w-5xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-8 print-card">
                 {/* Header Actions */}
                 <div className="flex justify-between items-start mb-8 no-print border-b border-border pb-6">
                    <div>
                       <h2 className="text-2xl font-bold text-foreground">Détails de l'Allocation</h2>
                       <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                          <Activity size={14} className="text-primary" /> Vue complète et historique des rotations
                       </p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:shadow-glow transition-all active:scale-95"><Printer size={18} /> Imprimer</button>
                       <button onClick={() => setIsViewModalOpen(false)} className="flex items-center justify-center h-10 w-10 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-colors"><X size={20} /></button>
                    </div>
                 </div>

                 <div className="space-y-10">
                    {/* Header Summary Section */}
                    <div className="flex flex-col lg:flex-row justify-between gap-8 bg-muted/20 p-6 rounded-2xl border border-border border-dashed">
                       <div className="flex-1 space-y-4">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-primary/20">
                               {viewAllocation.status}
                            </div>
                            <h1 className="text-3xl font-black text-foreground leading-tight">{viewAllocation.operator_name}</h1>
                            <p className="text-lg text-muted-foreground font-mono mt-1 tracking-tight">{viewAllocation.allocation_key}</p>
                            <div className="flex items-center gap-2 mt-2">
                               <Building2 size={16} className="text-blue-500" />
                               <span className="text-sm font-bold text-foreground">{viewAllocation.coop_name || 'Individuel'}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-soft-sm"><MapPin size={20} /></div>
                                <div><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Localisation</p><p className="text-sm font-semibold text-foreground">{viewAllocation.commune_name}, {viewAllocation.region_name}</p></div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-soft-sm"><User size={20} /></div>
                                <div><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Responsable</p><p className="text-sm font-semibold text-foreground">{viewAllocation.responsible_name || '-'}</p></div>
                             </div>
                          </div>
                       </div>

                       <div className="lg:w-72 bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex flex-col justify-between">
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Cible</span>
                                <span className="font-mono font-bold text-foreground">{viewAllocation.target_tonnage} T</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Livré</span>
                                <span className="font-mono font-bold text-primary">{viewAllocation.delivered_tonnage} T</span>
                             </div>
                             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min(100, viewAllocation.progress)}%` }}></div>
                             </div>
                             <div className="flex justify-between items-center pt-2 border-t border-border">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Reste à livrer</span>
                                <span className="text-xl font-black text-amber-600 font-mono">
                                   {Math.max(0, viewAllocation.target_tonnage - viewAllocation.delivered_tonnage).toLocaleString()} T
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* NEW SECTION: Deliveries History */}
                    <div className="space-y-4">
                       <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                          <HistoryIcon size={16} className="text-primary" /> Historique des Livraisons ({viewDeliveries.length})
                       </h3>
                       
                       <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft-sm">
                          <table className="table w-full">
                             <thead className="bg-muted/30">
                                <tr>
                                   <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">N° BL</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Transport (Camion/Chauffeur)</th>
                                   <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Poids (T)</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border/50">
                                {viewDeliveries.length === 0 ? (
                                   <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">Aucune livraison enregistrée pour le moment.</td></tr>
                                ) : (
                                   viewDeliveries.map((del, idx) => (
                                      <tr key={idx} className="hover:bg-muted/20 transition-colors group">
                                         <td className="px-6 py-4"><div className="flex items-center gap-2"><FileText size={16} className="text-primary/70" /><span className="font-mono font-bold text-foreground text-sm">{del.bl_number}</span></div></td>
                                         <td className="px-6 py-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar size={14} />{new Date(del.delivery_date).toLocaleDateString('fr-FR')}</div></td>
                                         <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                               <span className="text-sm font-bold text-foreground flex items-center gap-2"><Truck size={14} className="text-muted-foreground" /> {del.truck_plate}</span>
                                               <span className="text-xs text-muted-foreground ml-5">{del.driver_name}</span>
                                            </div>
                                         </td>
                                         <td className="px-6 py-4 text-right"><span className="px-2.5 py-1 rounded-lg bg-primary/5 text-primary font-bold font-mono text-sm">{del.tonnage_loaded} T</span></td>
                                      </tr>
                                   ))
                                )}
                             </tbody>
                             {viewDeliveries.length > 0 && (
                                <tfoot className="bg-muted/10 border-t border-border">
                                   <tr>
                                      <td colSpan={2} className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Statistiques Globales</td>
                                      <td className="px-6 py-4 font-bold text-sm text-foreground">{viewDeliveries.length} Rotation{viewDeliveries.length > 1 ? 's' : ''}</td>
                                      <td className="px-6 py-4 text-right font-black text-lg text-primary font-mono">{viewAllocation.delivered_tonnage} T</td>
                                   </tr>
                                </tfoot>
                             )}
                          </table>
                       </div>
                    </div>

                    {/* NEW SECTION: Recommendations & Important Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-6 rounded-2xl shadow-soft-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><Lightbulb size={100} className="text-amber-600" /></div>
                          <div className="relative z-10">
                             <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-400 tracking-widest flex items-center gap-2 mb-4">
                                <Lightbulb size={16} /> Recommandations
                             </h4>
                             <ul className="space-y-3">
                                <li className="flex gap-3 text-sm text-amber-900/80 dark:text-amber-200">
                                   <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-bold">1</span></div>
                                   <span>
                                      {viewAllocation.progress < 50 ? "Le rythme de livraison est faible. Planifiez 2 rotations supplémentaires cette semaine." : "Le rythme est conforme au planning prévisionnel."}
                                   </span>
                                </li>
                                <li className="flex gap-3 text-sm text-amber-900/80 dark:text-amber-200">
                                   <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-bold">2</span></div>
                                   <span>Vérifiez la capacité de stockage sur site à <strong>{viewAllocation.commune_name}</strong> avant le prochain envoi.</span>
                                </li>
                                {viewAllocation.progress >= 90 && (
                                   <li className="flex gap-3 text-sm text-amber-900/80 dark:text-amber-200 font-bold">
                                      <div className="h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={12} className="text-white" /></div>
                                      <span>Allocation proche de la saturation. Préparez le PV de fin de cession.</span>
                                   </li>
                                )}
                             </ul>
                          </div>
                       </div>

                       <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 p-6 rounded-2xl shadow-soft-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><Info size={100} className="text-blue-600" /></div>
                          <div className="relative z-10">
                             <h4 className="text-xs font-black uppercase text-blue-800 dark:text-blue-400 tracking-widest flex items-center gap-2 mb-4">
                                <Info size={16} /> Détails Importants
                             </h4>
                             <div className="space-y-4">
                                <div>
                                   <p className="text-[10px] font-bold text-blue-800/60 dark:text-blue-400/60 uppercase mb-1">Status Finalisation</p>
                                   <p className="text-sm text-blue-900 dark:text-blue-100 font-medium leading-relaxed">
                                      {viewAllocation.status === 'CLOSED' ? 
                                         "Cette allocation est clôturée. Aucune modification de tonnage n'est autorisée sans validation administrateur." : 
                                         `Il reste exactement ${Math.max(0, viewAllocation.target_tonnage - viewAllocation.delivered_tonnage).toFixed(2)} Tonnes à charger pour atteindre l'objectif 100%.`
                                      }
                                   </p>
                                </div>
                                <div className="pt-2 border-t border-blue-100 dark:border-blue-800">
                                   <p className="text-[10px] font-bold text-blue-800/60 dark:text-blue-400/60 uppercase mb-1">Note Logistique</p>
                                   <p className="text-sm text-blue-900 dark:text-blue-100 italic">
                                      Assurez-vous que tous les Bons de Livraison (BL) ont été émargés par le responsable <strong>{viewAllocation.responsible_name}</strong>.
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 {/* Print-only footer signature area */}
                 <div className="mt-16 hidden print-content-wrapper flex justify-between pt-10 border-t-2 border-dashed border-border">
                    <div className="w-64 text-center">
                       <p className="font-bold text-sm mb-16">Signature Responsable Site</p>
                       <div className="w-full border-b border-black"></div>
                    </div>
                    <div className="w-64 text-center">
                       <p className="font-bold text-sm mb-16">Cachet & Signature SOMA</p>
                       <div className="w-full border-b border-black"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
