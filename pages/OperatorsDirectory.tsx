import { useState, useMemo, Fragment, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/db';
import { Operator, AllocationView } from '../types';
import { useReferenceData, useAllocations } from '../hooks/useData';
import { useProject } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getPhaseColor } from '../lib/colors';
import { AdvancedSelect } from '../components/AdvancedSelect';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Plus, Search, MapPin, Edit2, Trash2, X, Save, 
  Layers, Phone, Building2, User, Filter, ChevronRight, FilePlus, ChevronDown
} from 'lucide-react';

export const OperatorsDirectory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { projects } = useProject();
  const queryClient = useQueryClient();
  const isVisitor = user?.role === 'VISITOR';

  // React Query Reference Data & Allocations
  const { data: refData, isLoading: loadingRefs } = useReferenceData();
  const { data: allocations = [], isLoading: loadingAllocations } = useAllocations('all');

  const regions = refData?.regions || [];
  const departments = refData?.departments || [];
  const communes = refData?.communes || [];
  const operators = refData?.operators || [];

  const loading = loadingRefs || loadingAllocations;

  // Local UI State
  const [operatorSearch, setOperatorSearch] = useState('');
  const [operatorPhaseFilter, setOperatorPhaseFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [groupByRegion, setGroupByRegion] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<string>('');
  const [quickAddData, setQuickAddData] = useState<any>({});

  // Memoized calculations for allocation tonnage per operator in their phase
  const operatorAllocationStats = useMemo(() => {
    const stats: Record<string, { target: number; delivered: number }> = {};
    
    // Sum up target & delivered tonnage of allocations for each operator in their project phase
    allocations.forEach((alloc) => {
      if (!alloc.operator_id || !alloc.project_id) return;
      const key = `${alloc.operator_id}_${alloc.project_id}`;
      if (!stats[key]) {
        stats[key] = { target: 0, delivered: 0 };
      }
      stats[key].target += Number(alloc.target_tonnage || 0);
      stats[key].delivered += Number(alloc.delivered_tonnage || 0);
    });

    return stats;
  }, [allocations]);

  // Handle opening modal
  const openModal = (type: string, item: any = {}) => {
    if (isVisitor) return;
    setModalType(type);
    
    if (type === 'operator') {
      if (!item.id) {
        setFormData({ ...item, is_coop: true });
      } else {
        setFormData({
          ...item,
          is_coop: item.is_coop !== false
        });
      }
    } else {
      setFormData(item);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Voulez-vous vraiment supprimer cet opérateur ?')) return;
    try {
      await db.deleteItem('operators', id);
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression de l\'opérateur.');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      const payload = { ...formData };
      
      if (modalType === 'operator') { 
        payload.operateur_coop_gie = !!payload.is_coop; 
        payload.contact_info = payload.phone;
        
        // Clear coop_name if not a coop
        if (!payload.operateur_coop_gie) {
          payload.coop_name = null;
        }

        // Clean up UI-only properties
        delete payload.is_coop;
        delete payload.phone;
        delete payload.commune_name;
        delete payload.project_name;
        delete payload.project;
        delete payload.project_id;
        
        payload.projet_id = formData.projet_id; 
      }

      if (formData.id) {
        await db.updateItem('operators', formData.id, payload);
      } else {
        await db.createItem('operators', payload);
      }

      setIsModalOpen(false);
      setFormData({});
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    } catch (error) { 
      console.error(error);
      alert('Erreur lors de l\'enregistrement.'); 
    }
  };

  const handleQuickAddSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;

    try {
      const payload = { ...quickAddData };
      payload.distance_mine = payload.distance_mine ? Number(payload.distance_mine) : null;

      const result = await db.createItem('communes', payload);
      
      // Update react query cache for reference data
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });

      // Automatically select the newly created commune in the parent modal
      if (result && result[0]) {
        setFormData(prev => ({ ...prev, commune_id: result[0].id }));
      }

      setIsQuickAddOpen(false);
      setQuickAddData({});
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création de la commune.');
    }
  };

  // Toggle groups
  const toggleGroup = (regionName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(regionName)) {
      newCollapsed.delete(regionName);
    } else {
      newCollapsed.add(regionName);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Filtering Logic
  const filteredOperators = useMemo(() => {
    return operators.filter(op => {
      const commune = communes.find(c => c.id === op.commune_id);
      const communeName = commune?.name || '';
      const dept = departments.find(d => d.id === commune?.department_id);
      const region = regions.find(r => r.id === dept?.region_id);
      const regionName = region?.name || '';

      const matchesSearch = op.name.toLowerCase().includes(operatorSearch.toLowerCase()) || 
                            communeName.toLowerCase().includes(operatorSearch.toLowerCase());
      
      const matchesPhase = operatorPhaseFilter === 'all' || op.projet_id === operatorPhaseFilter;
      const matchesRegion = regionFilter === 'all' || regionName === regionFilter;

      return matchesSearch && matchesPhase && matchesRegion;
    });
  }, [operators, communes, departments, regions, operatorSearch, operatorPhaseFilter, regionFilter]);

  // Grouping Logic
  const groupedOperators = useMemo(() => {
    const groups: Record<string, Operator[]> = {};
    
    filteredOperators.forEach(op => {
      const commune = communes.find(c => c.id === op.commune_id);
      const dept = departments.find(d => d.id === commune?.department_id);
      const region = regions.find(r => r.id === dept?.region_id);
      const regionName = region?.name || 'Région Inconnue';
      
      if (!groups[regionName]) {
        groups[regionName] = [];
      }
      groups[regionName].push(op);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredOperators, communes, departments, regions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground">Chargement de l'annuaire...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Annuaire Opérateurs</h1>
          <p className="text-muted-foreground text-sm">Gérer la liste des opérateurs et leurs quotas de distribution.</p>
        </div>
        <button 
          onClick={() => openModal('operator')} 
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-bold shadow-soft-lg transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus size={18} /> Ajouter un Opérateur
        </button>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-card rounded-2xl border border-border shadow-soft-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom ou commune..."
              value={operatorSearch}
              onChange={(e) => setOperatorSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Region Filter */}
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 shadow-soft-sm">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Région:</span>
              <select 
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="text-xs bg-transparent border-none outline-none font-semibold text-foreground cursor-pointer focus:ring-0"
              >
                <option value="all">Toutes les régions</option>
                {regions.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Group By Toggle */}
            <button
              onClick={() => setGroupByRegion(!groupByRegion)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-soft-sm ${groupByRegion ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
            >
              <Layers size={14} />
              <span>Grouper par Région : {groupByRegion ? 'Actif' : 'Inactif'}</span>
            </button>
          </div>
        </div>

        {/* Phase Filter Button Row */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Filtrer par Phase de Projet :</span>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setOperatorPhaseFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${operatorPhaseFilter === 'all' ? 'bg-primary text-white border-primary shadow-soft-sm' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
            >
              Toutes les Phases
            </button>
            {projects.map(p => {
              const phaseColor = getPhaseColor(p.numero_phase);
              const isActive = operatorPhaseFilter === p.id;
              return (
                <button 
                  key={p.id}
                  onClick={() => setOperatorPhaseFilter(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex flex-col items-start min-w-[120px] max-w-[200px] ${isActive ? `${phaseColor.bg} ${phaseColor.text} ${phaseColor.border} shadow-soft-sm` : `bg-background text-muted-foreground border-border hover:${phaseColor.border}/50`}`}
                >
                  <span>Phase {p.numero_phase}</span>
                  {p.project_description && (
                    <span className={`text-[9px] lowercase italic font-normal text-left break-words whitespace-normal line-clamp-1 w-full ${isActive ? 'text-white/80' : 'text-muted-foreground/70'}`}>
                      {p.project_description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operators List Table */}
      <div className="bg-card rounded-2xl border border-border shadow-soft-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-muted-foreground text-xs uppercase tracking-widest font-black">
                <th className="p-4 pl-6">Opérateur</th>
                <th className="p-4">Type</th>
                <th className="p-4">Commune Siège</th>
                <th className="p-4">Phase Projet</th>
                <th className="p-4">Allocation Accordée</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupByRegion ? (
                groupedOperators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground italic">Aucun opérateur trouvé.</td>
                  </tr>
                ) : (
                  groupedOperators.map(([regionName, items]) => {
                    const isCollapsed = collapsedGroups.has(regionName);
                    return (
                      <Fragment key={regionName}>
                        {/* Region Collapsible Header Row */}
                        <tr 
                          onClick={() => toggleGroup(regionName)}
                          className="bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer border-b border-border/40 select-none"
                        >
                          <td colSpan={6} className="p-3 pl-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-primary" />
                                <span className="text-xs font-black uppercase tracking-widest text-primary">{regionName}</span>
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold ml-2">
                                  {items.length} {items.length > 1 ? 'opérateurs' : 'opérateur'}
                                </span>
                              </div>
                              <ChevronDown 
                                size={16} 
                                className={`text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} 
                              />
                            </div>
                          </td>
                        </tr>
                        
                        {/* Group Items */}
                        {!isCollapsed && items.map(op => {
                          const project = projects.find(p => p.id === op.projet_id);
                          const phaseNum = project?.numero_phase || 1;
                          const phaseColor = getPhaseColor(phaseNum);
                          const commune = communes.find(c => c.id === op.commune_id);
                          const dept = departments.find(d => d.id === commune?.department_id);

                          // Given allocation tonnage details
                          const statsKey = `${op.id}_${op.projet_id}`;
                          const stats = operatorAllocationStats[statsKey] || { target: 0, delivered: 0 };
                          const progressPercent = stats.target > 0 ? Math.min((stats.delivered / stats.target) * 100, 100) : 0;

                          return (
                            <tr key={op.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                              <td className="p-4 pl-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground text-sm">{op.name}</span>
                                  {op.is_coop && op.coop_name && (
                                    <span className={`text-[10px] ${phaseColor.softText} font-semibold italic leading-tight`}>
                                      {op.coop_name}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{op.phone || 'Sans téléphone'}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`badge badge-soft text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${op.is_coop ? phaseColor.badge : 'badge-secondary bg-muted text-muted-foreground'}`}>
                                  {op.is_coop ? 'Coopérative / GIE' : 'Individuel'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm text-foreground font-medium">{commune?.name || '-'}</span>
                                  {dept && (
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                      {dept.name}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`badge badge-soft ${phaseColor.badge} text-[10px] font-black px-2 py-1 rounded-md`}>
                                  Phase {project?.numero_phase || '-'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col max-w-[150px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-foreground">
                                      {stats.target > 0 ? `${stats.target} T` : '0 T'}
                                    </span>
                                    {stats.target > 0 && (
                                      <span className="text-[10px] text-muted-foreground font-semibold">
                                        {stats.delivered} T livré
                                      </span>
                                    )}
                                  </div>
                                  {stats.target > 0 ? (
                                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Aucune allocation</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <div className="flex justify-end items-center gap-2">
                                  {/* Quick Allocation Action Icon */}
                                  <button 
                                    onClick={() => navigate(`/allocations?action=new&operatorId=${op.id}&projetId=${op.projet_id}&communeId=${op.commune_id}`)}
                                    disabled={isVisitor}
                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-200"
                                    title="Créer une allocation directe"
                                  >
                                    <FilePlus size={15} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => openModal('operator', op)} 
                                    disabled={isVisitor} 
                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-200"
                                    title="Modifier l'opérateur"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleDelete(op.id)} 
                                    disabled={isVisitor} 
                                    className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )
              ) : (
                filteredOperators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground italic">Aucun opérateur trouvé.</td>
                  </tr>
                ) : (
                  filteredOperators.map(op => {
                    const project = projects.find(p => p.id === op.projet_id);
                    const phaseNum = project?.numero_phase || 1;
                    const phaseColor = getPhaseColor(phaseNum);
                    const commune = communes.find(c => c.id === op.commune_id);
                    const dept = departments.find(d => d.id === commune?.department_id);

                    // Given allocation tonnage details
                    const statsKey = `${op.id}_${op.projet_id}`;
                    const stats = operatorAllocationStats[statsKey] || { target: 0, delivered: 0 };
                    const progressPercent = stats.target > 0 ? Math.min((stats.delivered / stats.target) * 100, 100) : 0;

                    return (
                      <tr key={op.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">{op.name}</span>
                            {op.is_coop && op.coop_name && (
                              <span className={`text-[10px] ${phaseColor.softText} font-semibold italic leading-tight`}>
                                {op.coop_name}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{op.phone || 'Sans téléphone'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`badge badge-soft text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${op.is_coop ? phaseColor.badge : 'badge-secondary bg-muted text-muted-foreground'}`}>
                            {op.is_coop ? 'Coopérative / GIE' : 'Individuel'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground font-medium">{commune?.name || '-'}</span>
                            {dept && (
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {dept.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`badge badge-soft ${phaseColor.badge} text-[10px] font-black px-2 py-1 rounded-md`}>
                            Phase {project?.numero_phase || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col max-w-[150px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-foreground">
                                {stats.target > 0 ? `${stats.target} T` : '0 T'}
                              </span>
                              {stats.target > 0 && (
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {stats.delivered} T livré
                                </span>
                              )}
                            </div>
                            {stats.target > 0 ? (
                              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Aucune allocation</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex justify-end items-center gap-2">
                            {/* Quick Allocation Action Icon */}
                            <button 
                              onClick={() => navigate(`/allocations?action=new&operatorId=${op.id}&projetId=${op.projet_id}&communeId=${op.commune_id}`)}
                              disabled={isVisitor}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-200"
                              title="Créer une allocation directe"
                            >
                              <FilePlus size={15} />
                            </button>
                            
                            <button 
                              onClick={() => openModal('operator', op)} 
                              disabled={isVisitor} 
                              className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-200"
                              title="Modifier l'opérateur"
                            >
                              <Edit2 size={15} />
                            </button>
                            
                            <button 
                              onClick={() => handleDelete(op.id)} 
                              disabled={isVisitor} 
                              className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-foreground capitalize">
                {formData.id ? 'Modifier' : 'Ajouter'} Opérateur
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet</label>
                <input 
                  required 
                  className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Coopérative de Thiès" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Téléphone</label>
                   <input 
                     className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono" 
                     value={formData.phone || ''} 
                     onChange={e => setFormData({...formData, phone: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Type</label>
                   <select 
                     className="w-full border border-input rounded-xl p-2.5 text-sm bg-background transition-all focus:ring-1 focus:ring-primary" 
                     value={formData.is_coop ? 'true' : 'false'} 
                     onChange={e => setFormData({...formData, is_coop: e.target.value === 'true'})}
                   >
                      <option value="false">Individuel</option>
                      <option value="true">Coopérative / GIE</option>
                   </select>
                 </div>
              </div>
              
              {formData.is_coop && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium mb-1">Nom de la Coopérative / GIE</label>
                  <input 
                    required 
                    className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" 
                    value={formData.coop_name || ''} 
                    onChange={e => setFormData({...formData, coop_name: e.target.value})} 
                    placeholder="Ex: GIE des Maraîchers de Thiès" 
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Commune Siège</label>
                <AdvancedSelect
                  options={communes.map(c => ({
                    value: c.id,
                    label: c.name,
                    subLabel: departments.find(d => d.id === c.department_id)?.name
                  }))}
                  value={formData.commune_id || ''}
                  onChange={val => setFormData({...formData, commune_id: val})}
                  placeholder="Sélectionner une commune..."
                  required
                  footer={
                    <button 
                      type="button"
                      onClick={() => {
                        setQuickAddType('commune');
                        setQuickAddData({});
                        setIsQuickAddOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Ajouter une nouvelle commune
                    </button>
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phase Projet</label>
                <div className="border border-input rounded-xl bg-background overflow-hidden">
                  <div className="max-h-[140px] overflow-y-auto p-1 space-y-0.5 no-scrollbar">
                    {projects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">Aucune phase disponible</div>
                    ) : (
                      [...projects].sort((a, b) => (b.numero_phase || 0) - (a.numero_phase || 0)).map(p => {
                        const phaseColor = getPhaseColor(p.numero_phase);
                        const isSelected = formData.projet_id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setFormData({...formData, projet_id: p.id})}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${isSelected ? `${phaseColor.bg} ${phaseColor.softText} border-primary` : 'hover:bg-muted/50 border-transparent'} border text-sm`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg ${isSelected ? 'bg-white shadow-sm' : phaseColor.bg} flex items-center justify-center font-black text-xs ${isSelected ? phaseColor.softText : phaseColor.text}`}>
                                {p.numero_phase}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold">Phase {p.numero_phase}</span>
                                {p.project_description && (
                                  <span className="text-[10px] opacity-70 truncate max-w-[180px]">{p.project_description}</span>
                                )}
                              </div>
                            </div>
                            {isSelected && <div className={`h-2 w-2 rounded-full ${phaseColor.text} animate-pulse`} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

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

      {/* Quick Add Commune Sub-modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-3xl w-full max-w-sm overflow-hidden border border-primary/20"
          >
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-primary/5">
              <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                <MapPin size={16} /> Ajouter une commune
              </h3>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-muted-foreground hover:text-foreground transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleQuickAddSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 ml-1">Département</label>
                <select 
                  required 
                  className="w-full border border-input rounded-xl p-2.5 text-sm bg-background transition-all focus:ring-1 focus:ring-primary shadow-soft-sm" 
                  value={quickAddData.department_id || ''} 
                  onChange={e => setQuickAddData({...quickAddData, department_id: e.target.value})}
                >
                   <option value="">Sélectionner...</option>
                   {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 ml-1">Nom de la Commune</label>
                  <input 
                    required 
                    className="w-full border border-input rounded-xl p-2.5 text-sm bg-background shadow-soft-sm" 
                    value={quickAddData.name || ''} 
                    onChange={e => setQuickAddData({...quickAddData, name: e.target.value})} 
                    placeholder="Ex: Tivaouane" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 ml-1">Code</label>
                  <input 
                    required 
                    className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono uppercase shadow-soft-sm" 
                    value={quickAddData.code || ''} 
                    onChange={e => setQuickAddData({...quickAddData, code: e.target.value.toUpperCase()})} 
                    placeholder="TIV" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 ml-1">Dist. (km)</label>
                  <input 
                    type="number" 
                    className="w-full border border-input rounded-xl p-2.5 text-sm bg-background shadow-soft-sm" 
                    value={quickAddData.distance_mine || ''} 
                    onChange={e => setQuickAddData({...quickAddData, distance_mine: e.target.value})} 
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border mt-2">
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className="flex-1 px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95">Enregistrer</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
