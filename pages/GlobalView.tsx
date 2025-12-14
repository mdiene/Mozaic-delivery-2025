
import React, { useEffect, useState, useRef, ReactNode, useMemo } from 'react';
import { db } from '../services/db';
import { useProject } from '../components/Layout';
import { GlobalHierarchy, DeliveryView } from '../types';
import { 
  MapPin, 
  User, 
  Box, 
  FileText, 
  Truck, 
  ChevronRight,
  ChevronDown,
  Database,
  Building2,
  Filter,
  Minimize2,
  Maximize2,
  LayoutList,
  Folder,
  Calendar,
  TrendingUp,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

// Stats Helper Interface
interface LevelStats {
  count: number;
  totalTarget: number;
  totalDelivered: number;
}

// Driver Stats Interface
interface DriverStat {
  driverId: string;
  driverName: string;
  truckPlate: string; // Most recent or main truck
  totalTonnage: number;
  tripCount: number;
  deliveries: DeliveryView[];
}

// Stats Calculation Helper
const calculateNodeStats = (node: any, level: 'region' | 'dept' | 'commune' | 'operator' | 'allocation'): LevelStats => {
  let totalTarget = 0;
  let totalDelivered = 0;
  let count = 0; // Count of immediate children relevant to the next step

  const traverse = (item: any, currentLevel: string) => {
    if (currentLevel === 'allocation') {
      totalTarget += item.target || 0;
      totalDelivered += item.delivered || 0;
      return;
    }
    
    // Determine children based on level
    let children: any[] = [];
    let nextLevel = '';

    if (currentLevel === 'region') { children = item.departments; nextLevel = 'dept'; }
    else if (currentLevel === 'dept') { children = item.communes; nextLevel = 'commune'; }
    else if (currentLevel === 'commune') { children = item.operators; nextLevel = 'operator'; }
    else if (currentLevel === 'operator') { children = item.allocations; nextLevel = 'allocation'; }

    if (children) {
      children.forEach(child => traverse(child, nextLevel));
    }
  };

  traverse(node, level);

  // Count immediate children for display (e.g., Region -> N Depts)
  if (level === 'region') count = node.departments?.length || 0;
  if (level === 'dept') count = node.communes?.length || 0;
  if (level === 'commune') count = node.operators?.length || 0;
  if (level === 'operator') count = node.allocations?.length || 0;
  if (level === 'allocation') count = node.deliveries?.length || 0;

  return { count, totalTarget, totalDelivered };
};

// --- COMPONENTS ---

// 1. Accordion Section Wrapper
interface SectionProps {
  title: string;
  icon: React.ElementType;
  mode: 'split' | 'maximized' | 'hidden';
  onToggle: () => void;
  headerContent?: ReactNode;
  children: ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon: Icon,
  mode,
  onToggle,
  headerContent,
  children,
  className = "",
  scrollRef
}) => {
  if (mode === 'hidden') {
    return (
      <div className={`flex-none h-[52px] bg-card border border-border rounded-xl shadow-soft-xl overflow-hidden ${className}`}>
        <div onClick={onToggle} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground"><Icon size={16} /></div>
            <span className="font-bold text-sm text-foreground">{title}</span>
          </div>
          <button className="text-muted-foreground hover:text-primary"><Maximize2 size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        flex flex-col bg-card border border-border rounded-xl shadow-soft-xl overflow-hidden transition-all duration-300
        ${mode === 'maximized' ? 'flex-none h-auto' : 'flex-1 min-h-0'} 
        ${className}
      `}
    >
      {/* Header */}
      <div 
        onClick={onToggle}
        className={`
          flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-border/50 shrink-0
          ${mode === 'maximized' ? 'bg-card' : 'bg-muted/10 hover:bg-muted/20'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${mode === 'maximized' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon size={16} />
          </div>
          <span className={`font-bold text-sm ${mode === 'maximized' ? 'text-primary' : 'text-foreground'}`}>
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="opacity-100">{headerContent}</div>
          <button className="text-muted-foreground hover:text-primary transition-colors">
            {mode === 'maximized' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`
        ${mode === 'maximized' 
           ? 'relative w-full overflow-x-auto' // Maximized: Let it grow vertically, scroll horizontal
           : 'flex-1 overflow-hidden relative' // Split: Constrain to parent flex height
        }
      `}>
        <div 
          ref={scrollRef}
          className={`
            ${mode === 'maximized' 
               ? 'flex divide-x divide-border min-w-full w-max' 
               : 'absolute inset-0 overflow-x-auto overflow-y-hidden flex divide-x divide-border'
            }
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// 2. Generic Column Component
interface ColumnProps {
  title: string;
  stats?: LevelStats;
  children?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  isScrollable: boolean; // True = Split (Fixed H), False = Maximized (Auto H)
}

const Column: React.FC<ColumnProps> = ({ 
  title, 
  stats, 
  children,
  className = "",
  headerAction,
  isScrollable
}) => (
  <div className={`
    flex flex-col min-w-[320px] max-w-[360px] bg-card ${className} border-r border-border first:rounded-l-xl last:rounded-r-xl last:border-r-0
    ${isScrollable ? 'h-full' : 'h-auto min-h-full'}
  `}>
    <div className="p-4 border-b border-border shrink-0 bg-muted/20">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          {title} 
          {stats && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{stats.count}</span>}
        </h3>
        {headerAction}
      </div>
      
      {stats && (
        <>
          <div className="flex justify-between items-baseline mb-1.5 mt-2">
             <span className="text-[10px] text-muted-foreground font-medium uppercase">Progression</span>
             <span className="text-xs font-mono font-bold text-foreground">
               {stats.totalDelivered.toLocaleString()} <span className="text-muted-foreground font-normal">/ {stats.totalTarget.toLocaleString()} T</span>
             </span>
          </div>
          <div className="w-full bg-muted-foreground/10 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-primary/50 transition-all duration-500" 
              style={{ width: `${stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0}%` }}
            />
          </div>
        </>
      )}
    </div>
    
    {/* Body Content */}
    <div className={`
      flex-1 p-2 space-y-1 scrollbar-thin
      ${isScrollable ? 'overflow-y-auto' : 'overflow-visible'}
    `}>
      {children}
    </div>
  </div>
);

// 3. Generic List Item
interface ListItemProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  subLabel?: string | ReactNode;
  icon?: React.ElementType;
  hasChildren?: boolean;
  statusColor?: string;
  rightInfo?: ReactNode;
  progress?: { target: number; delivered: number };
}

const ListItem: React.FC<ListItemProps> = ({
  selected,
  onClick,
  label,
  subLabel,
  icon: Icon,
  hasChildren = true,
  statusColor = "",
  rightInfo,
  progress
}) => {
  // Logic for small progress bar inside list item
  const percent = progress && progress.target > 0 ? (progress.delivered / progress.target) * 100 : 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group border
        ${selected 
          ? 'bg-primary/10 border-primary/20 text-primary shadow-sm' 
          : 'bg-transparent border-transparent hover:bg-muted text-foreground hover:text-foreground'
        }
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {Icon && (
          <div className={`shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
            <Icon size={18} />
          </div>
        )}
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className={`text-sm font-semibold truncate ${selected ? 'text-primary' : 'text-foreground'}`}>
            {label}
          </span>
          {subLabel && (
            <span className={`text-xs truncate ${selected ? 'text-primary/80' : 'text-muted-foreground'}`}>
              {subLabel}
            </span>
          )}
          {progress && (
             <div className="w-full h-1 bg-muted-foreground/10 rounded-full mt-1.5 overflow-hidden">
                <div className={`h-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-primary/50'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
             </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 pl-2 shrink-0">
        {rightInfo}
        {statusColor && (
          <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
        )}
        {hasChildren && (
          <ChevronRight 
            size={16} 
            className={`transition-transform ${selected ? 'text-primary' : 'text-muted-foreground/50'}`} 
          />
        )}
      </div>
    </button>
  );
};

export const GlobalView = () => {
  const { selectedProject, projects, setSelectedProject } = useProject();
  const [hierarchy, setHierarchy] = useState<GlobalHierarchy>([]);
  const [flatDeliveries, setFlatDeliveries] = useState<DeliveryView[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout State: 'split' (both), 'geo' (maximized), 'drivers' (maximized), 'collapsed' (both hidden)
  const [layoutMode, setLayoutMode] = useState<'split' | 'geo' | 'drivers' | 'collapsed'>('collapsed');

  // New Column Selection State (Horizontal Flow)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [selectedAllocId, setSelectedAllocId] = useState<string | null>(null);

  // Driver Section State
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [hier, dels] = await Promise.all([
          db.getGlobalHierarchy(selectedProject),
          db.getDeliveriesView()
        ]);
        
        hier.sort((a, b) => a.name.localeCompare(b.name));
        setHierarchy(hier);

        const filteredDels = selectedProject === 'all' 
          ? dels 
          : dels.filter(d => d.project_id === selectedProject);
        setFlatDeliveries(filteredDels);

      } catch (e) {
        console.error("Error loading global view data", e);
      } finally {
        setLoading(false);
        resetSelections();
      }
    };
    loadData();
  }, [selectedProject]);

  // --- Auto-Selection Effects (Visible on Start) ---
  useEffect(() => {
    if (!loading && hierarchy.length > 0 && !selectedRegionId) {
      // Automatically expand first region to show departments (Requirement: "load all departments visible")
      // In Miller columns, this translates to selecting the first region.
      setSelectedRegionId(hierarchy[0].id);
    }
  }, [loading, hierarchy, selectedRegionId]);

  // --- Derived Data for Columns ---

  // 1. Region Data (Always available from hierarchy)
  const selectedRegion = useMemo(() => hierarchy.find(r => r.id === selectedRegionId), [hierarchy, selectedRegionId]);

  // 2. Department Data
  const departments = useMemo(() => selectedRegion ? selectedRegion.departments.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedRegion]);
  const selectedDept = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);

  // 3. Commune Data
  const communes = useMemo(() => selectedDept ? selectedDept.communes.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedDept]);
  const selectedCommune = useMemo(() => communes.find(c => c.id === selectedCommuneId), [communes, selectedCommuneId]);

  // 4. Operator Data
  const operators = useMemo(() => selectedCommune ? selectedCommune.operators.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedCommune]);
  const selectedOperator = useMemo(() => operators.find(o => o.id === selectedOperatorId), [operators, selectedOperatorId]);

  // 5. Allocation Data
  const allocations = useMemo(() => selectedOperator ? selectedOperator.allocations : [], [selectedOperator]);
  const selectedAllocation = useMemo(() => allocations.find(a => a.id === selectedAllocId), [allocations, selectedAllocId]);

  // 6. Delivery Data
  const deliveries = useMemo(() => selectedAllocation ? selectedAllocation.deliveries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [], [selectedAllocation]);

  // --- Stats Calculations ---
  
  const totalZoneStats = useMemo(() => {
    let totalTarget = 0;
    let totalDelivered = 0;
    let count = hierarchy.length;
    hierarchy.forEach(r => {
       const stats = calculateNodeStats(r, 'region');
       totalTarget += stats.totalTarget;
       totalDelivered += stats.totalDelivered;
    });
    return { count, totalTarget, totalDelivered };
  }, [hierarchy]);

  // Stats for the "Department" column (Aggregate of selected Region)
  const deptColumnStats = useMemo(() => {
    if (!selectedRegion) return { count: 0, totalTarget: 0, totalDelivered: 0 };
    return calculateNodeStats(selectedRegion, 'region'); // Returns stats for depts
  }, [selectedRegion]);

  // Stats for "Commune" column
  const communeColumnStats = useMemo(() => {
    if (!selectedDept) return { count: 0, totalTarget: 0, totalDelivered: 0 };
    return calculateNodeStats(selectedDept, 'dept');
  }, [selectedDept]);

  // Stats for "Operator" column
  const operatorColumnStats = useMemo(() => {
    if (!selectedCommune) return { count: 0, totalTarget: 0, totalDelivered: 0 };
    return calculateNodeStats(selectedCommune, 'commune');
  }, [selectedCommune]);

  const allocationStats = useMemo(() => {
    if (!selectedOperator) return { count: 0, totalTarget: 0, totalDelivered: 0 };
    return calculateNodeStats(selectedOperator, 'operator');
  }, [selectedOperator]);

  const deliveryStats = useMemo(() => {
    return {
      count: deliveries.length,
      totalDelivered: deliveries.reduce((acc, curr) => acc + curr.tonnage, 0),
      totalTarget: 0
    };
  }, [deliveries]);

  const driverStats: DriverStat[] = useMemo(() => {
    const stats: Record<string, DriverStat> = {};
    flatDeliveries.forEach(d => {
      const dId = d.driver_id || 'unknown';
      if (!stats[dId]) {
        stats[dId] = {
          driverId: dId,
          driverName: d.driver_name || 'Inconnu',
          truckPlate: d.truck_plate || '-',
          totalTonnage: 0,
          tripCount: 0,
          deliveries: []
        };
      }
      stats[dId].totalTonnage += Number(d.tonnage_loaded);
      stats[dId].tripCount += 1;
      stats[dId].deliveries.push(d);
    });
    return Object.values(stats).sort((a, b) => b.totalTonnage - a.totalTonnage);
  }, [flatDeliveries]);

  // Auto-select first driver (Requirement: "same behavior for performance chauffeurs")
  useEffect(() => {
    if (!loading && driverStats.length > 0 && !selectedDriverId) {
      setSelectedDriverId(driverStats[0].driverId);
    }
  }, [loading, driverStats, selectedDriverId]);

  const selectedDriver = useMemo(() => {
    return driverStats.find(d => d.driverId === selectedDriverId);
  }, [driverStats, selectedDriverId]);

  // Actions
  const toggleLayout = (target: 'geo' | 'drivers') => {
    if (layoutMode === target) {
      setLayoutMode('collapsed');
    } else {
      setLayoutMode(target);
    }
  };

  const resetSelections = () => {
    setSelectedRegionId(null);
    setSelectedDeptId(null);
    setSelectedCommuneId(null);
    setSelectedOperatorId(null);
    setSelectedAllocId(null);
    setSelectedDriverId(null);
  };

  const handleRegionSelect = (id: string) => {
    setSelectedRegionId(id);
    setSelectedDeptId(null);
    setSelectedCommuneId(null);
    setSelectedOperatorId(null);
    setSelectedAllocId(null);
  };

  const handleDeptSelect = (id: string) => {
    setSelectedDeptId(id);
    setSelectedCommuneId(null);
    setSelectedOperatorId(null);
    setSelectedAllocId(null);
  };

  const handleCommuneSelect = (id: string) => {
    setSelectedCommuneId(id);
    setSelectedOperatorId(null);
    setSelectedAllocId(null);
  };

  // Scroll effect for Miller Columns
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Auto-scroll to the right when a deep selection is made
      if (selectedOperatorId || selectedAllocId) {
        scrollContainerRef.current.scrollTo({ 
          left: scrollContainerRef.current.scrollWidth, 
          behavior: 'smooth' 
        });
      }
    }
  }, [selectedDeptId, selectedCommuneId, selectedOperatorId, selectedAllocId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground text-sm">Chargement de la hiérarchie...</span>
        </div>
      </div>
    );
  }

  // Determine modes for sections
  const geoMode = layoutMode === 'geo' ? 'maximized' : (layoutMode === 'drivers' || layoutMode === 'collapsed' ? 'hidden' : 'split');
  const driverMode = layoutMode === 'drivers' ? 'maximized' : (layoutMode === 'geo' || layoutMode === 'collapsed' ? 'hidden' : 'split');

  return (
    <div className={`flex flex-col space-y-4 ${layoutMode === 'split' ? 'h-[calc(100vh-8rem)]' : 'min-h-[calc(100vh-8rem)]'}`}>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vue Globale</h1>
          <p className="text-muted-foreground text-sm">Exploration : Arborescence géographique &rarr; Détails logistiques</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="flex bg-card border border-border rounded-lg p-1 shadow-sm">
              <button 
                onClick={resetSelections}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Réinitialiser la vue"
              >
                <RotateCcw size={14} /> <span className="hidden sm:inline">Réinitialiser</span>
              </button>
           </div>

           <div className="bg-card p-1 rounded-lg border border-border flex items-center gap-2 shadow-sm">
              <div className="px-2 text-muted-foreground">
                <Filter size={14} />
              </div>
              <form className="filter border-none p-0 bg-transparent shadow-none">
                <input 
                  className="btn btn-square h-8 w-8 min-h-0" 
                  type="reset" 
                  value="×" 
                  onClick={() => setSelectedProject('all')}
                  title="Tous"
                />
                {projects.map(p => (
                  <input
                    key={p.id}
                    className="btn h-8 min-h-0 px-3 text-xs" 
                    type="radio" 
                    name="global-view-phase" 
                    aria-label={`Phase ${p.numero_phase}`}
                    checked={selectedProject === p.id}
                    onChange={() => setSelectedProject(p.id)}
                  />
                ))}
              </form>
           </div>
        </div>
      </div>

      {/* --- MAIN LAYOUT : Vertical Accordion Sections --- */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        
        {/* SECTION 1: HIERARCHY (MILLER COLUMNS) */}
        <Section 
          title="Zones Géographiques" 
          icon={MapPin} 
          mode={geoMode}
          onToggle={() => toggleLayout('geo')}
          scrollRef={scrollContainerRef}
          headerContent={
            <div className="flex items-baseline gap-2">
               <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">Total:</span>
               <span className="text-sm font-bold font-mono text-primary">
                 {totalZoneStats.totalDelivered.toLocaleString()} / {totalZoneStats.totalTarget.toLocaleString()} T
               </span>
            </div>
          }
        >
            {/* Column 1: Regions */}
            <Column 
              title="Régions" 
              stats={totalZoneStats}
              isScrollable={geoMode === 'split'}
              headerAction={
                <button onClick={resetSelections} className="text-muted-foreground hover:text-foreground" title="Réinitialiser">
                  <LayoutList size={14} />
                </button>
              }
            >
              {hierarchy.map(region => {
                const rStats = calculateNodeStats(region, 'region');
                return (
                  <ListItem 
                    key={region.id}
                    label={region.name}
                    icon={MapPin}
                    selected={selectedRegionId === region.id}
                    onClick={() => handleRegionSelect(region.id)}
                    rightInfo={
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {rStats.totalDelivered.toLocaleString()} / {rStats.totalTarget.toLocaleString()} T
                      </span>
                    }
                    progress={{ target: rStats.totalTarget, delivered: rStats.totalDelivered }}
                  />
                );
              })}
            </Column>

            {/* Column 2: Departments */}
            {selectedRegion && (
              <Column 
                title="Départements" 
                stats={deptColumnStats}
                isScrollable={geoMode === 'split'}
                className="animate-in slide-in-from-left-4 fade-in duration-300"
              >
                {departments.map(dept => {
                  const dStats = calculateNodeStats(dept, 'dept');
                  return (
                    <ListItem 
                      key={dept.id}
                      label={dept.name}
                      icon={Folder}
                      selected={selectedDeptId === dept.id}
                      onClick={() => handleDeptSelect(dept.id)}
                      rightInfo={
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {dStats.totalDelivered.toLocaleString()} / {dStats.totalTarget.toLocaleString()} T
                        </span>
                      }
                      progress={{ target: dStats.totalTarget, delivered: dStats.totalDelivered }}
                    />
                  );
                })}
              </Column>
            )}

            {/* Column 3: Communes */}
            {selectedDept && (
              <Column 
                title="Communes" 
                stats={communeColumnStats}
                isScrollable={geoMode === 'split'}
                className="animate-in slide-in-from-left-4 fade-in duration-300"
              >
                {communes.map(commune => {
                  const cStats = calculateNodeStats(commune, 'commune');
                  return (
                    <ListItem 
                      key={commune.id}
                      label={commune.name}
                      icon={MapPin}
                      selected={selectedCommuneId === commune.id}
                      onClick={() => handleCommuneSelect(commune.id)}
                      rightInfo={
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {cStats.totalDelivered.toLocaleString()} / {cStats.totalTarget.toLocaleString()} T
                        </span>
                      }
                      progress={{ target: cStats.totalTarget, delivered: cStats.totalDelivered }}
                    />
                  );
                })}
              </Column>
            )}

            {/* Column 4: Operators */}
            {selectedCommune && (
              <Column 
                title="Opérateurs" 
                stats={operatorColumnStats} 
                isScrollable={geoMode === 'split'}
                className="animate-in slide-in-from-left-4 fade-in duration-300"
              >
                {operators.map(op => (
                  <ListItem 
                    key={op.id}
                    label={op.name}
                    subLabel={op.is_coop ? 'Coopérative / GIE' : 'Individuel'}
                    icon={op.is_coop ? Building2 : User}
                    selected={selectedOperatorId === op.id}
                    onClick={() => {
                      setSelectedOperatorId(op.id);
                      setSelectedAllocId(null);
                    }}
                  />
                ))}
              </Column>
            )}

            {/* Column 5: Allocations */}
            {selectedOperator && (
              <Column 
                title="Allocations" 
                stats={allocationStats} 
                isScrollable={geoMode === 'split'}
                className="animate-in slide-in-from-left-4 fade-in duration-300"
              >
                {allocations.map(alloc => {
                  const progress = alloc.target > 0 ? (alloc.delivered / alloc.target) * 100 : 0;
                  let color = 'bg-blue-500';
                  if (progress >= 100) color = 'bg-emerald-500';
                  else if (progress > 0) color = 'bg-amber-500';

                  return (
                    <ListItem 
                      key={alloc.id}
                      label={alloc.allocation_key}
                      subLabel={
                        <div className="flex flex-col gap-1 mt-0.5">
                          <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${color}`} style={{ width: `${Math.min(100, progress)}%` }}></div>
                          </div>
                        </div>
                      }
                      rightInfo={
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {alloc.delivered}/{alloc.target} T
                        </span>
                      }
                      icon={Box}
                      selected={selectedAllocId === alloc.id}
                      onClick={() => setSelectedAllocId(alloc.id)}
                      statusColor={color}
                    />
                  );
                })}
              </Column>
            )}

            {/* Column 6: Deliveries */}
            {selectedAllocation && (
              <Column 
                title="Livraisons" 
                stats={{ 
                  count: deliveryStats.count, 
                  totalTarget: 0,
                  totalDelivered: deliveryStats.totalDelivered 
                }} 
                isScrollable={geoMode === 'split'}
                className="animate-in slide-in-from-left-4 fade-in duration-300"
              >
                {deliveries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    Aucune livraison
                  </div>
                ) : (
                  deliveries.map(del => (
                    <div key={del.id} className="p-3 border rounded-lg bg-card mb-2 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-primary" />
                          <span className="font-mono font-bold text-sm text-foreground">{del.bl_number}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(del.date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck size={12} /> {del.truck_plate}
                        </span>
                        <span className="font-bold text-foreground bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                          {del.tonnage} T
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <User size={10} /> {del.driver_name}
                      </div>
                    </div>
                  ))
                )}
              </Column>
            )}
            
            {/* Spacer */}
            <div className="min-w-[50px] shrink-0" />
        </Section>

        {/* SECTION 2: DRIVER STATS */}
        <Section 
          title="Performance Chauffeurs" 
          icon={Truck} 
          mode={driverMode}
          onToggle={() => toggleLayout('drivers')}
          headerContent={
            <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded hidden sm:inline">
                  {driverStats.length} Actifs
               </span>
            </div>
          }
        >
           <div className="flex divide-x divide-border min-h-full">
              {/* Left: Driver List */}
              <div className={`w-1/3 min-w-[300px] p-2 space-y-1 bg-card ${driverMode === 'split' ? 'overflow-y-auto' : 'overflow-visible'}`}>
                 {driverStats.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                       Aucune donnée chauffeur pour cette sélection.
                    </div>
                 ) : (
                    driverStats.map(driver => (
                       <button
                          key={driver.driverId}
                          onClick={() => setSelectedDriverId(driver.driverId)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all border
                             ${selectedDriverId === driver.driverId 
                                ? 'bg-primary/10 border-primary/20 shadow-sm' 
                                : 'bg-transparent border-transparent hover:bg-muted'
                             }
                          `}
                       >
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className={`p-2 rounded-full ${selectedDriverId === driver.driverId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <User size={16} />
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-semibold truncate ${selectedDriverId === driver.driverId ? 'text-primary' : 'text-foreground'}`}>
                                   {driver.driverName}
                                </span>
                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                   <Truck size={10} /> {driver.truckPlate}
                                </span>
                             </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                             <span className="text-sm font-bold font-mono text-foreground">
                                {driver.totalTonnage.toLocaleString()} T
                             </span>
                             <span className="text-[10px] text-muted-foreground">
                                {driver.tripCount} Voyage{driver.tripCount > 1 ? 's' : ''}
                             </span>
                          </div>
                       </button>
                    ))
                 )}
              </div>

              {/* Right: Driver Details */}
              <div className={`flex-1 p-0 bg-muted/5 ${driverMode === 'split' ? 'overflow-y-auto' : 'overflow-visible'}`}>
                 {selectedDriver ? (
                    <div className="flex flex-col h-full">
                       <div className="p-4 border-b border-border bg-card shrink-0 sticky top-0 z-10">
                          <div className="flex justify-between items-start">
                             <div>
                                <h4 className="text-lg font-bold text-foreground">{selectedDriver.driverName}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                   <Truck size={14} /> {selectedDriver.truckPlate}
                                </p>
                             </div>
                             <div className="text-right">
                                <div className="text-2xl font-bold text-primary font-mono">{selectedDriver.totalTonnage.toLocaleString()} T</div>
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Livré</div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-4">
                          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                             <Calendar size={14} /> Historique des Livraisons ({selectedDriver.deliveries.length})
                          </h5>
                          <div className="space-y-2">
                             {selectedDriver.deliveries.sort((a,b) => new Date(b.date || b.delivery_date).getTime() - new Date(a.date || a.delivery_date).getTime()).map((del) => (
                                <div key={del.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded text-blue-600 dark:text-blue-400">
                                         <FileText size={16} />
                                      </div>
                                      <div>
                                         <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">{del.bl_number}</span>
                                            <span className="text-xs text-muted-foreground">
                                               {del.date ? new Date(del.date).toLocaleDateString() : (del.delivery_date ? new Date(del.delivery_date).toLocaleDateString() : '-')}
                                            </span>
                                         </div>
                                         <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                            <MapPin size={10} /> {del.commune_name || 'Destination inconnue'}
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <div className="text-right">
                                         <span className="block font-bold text-sm text-foreground">{del.operator_name}</span>
                                         <span className="text-[10px] text-muted-foreground">Opérateur</span>
                                      </div>
                                      <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold font-mono min-w-[3rem] text-center">
                                         {del.tonnage || del.tonnage_loaded} T
                                      </div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center min-h-[300px]">
                       <TrendingUp size={48} className="mb-4 opacity-20" />
                       <p>Sélectionnez un chauffeur à gauche pour voir son historique détaillé.</p>
                    </div>
                 )}
              </div>
           </div>
        </Section>

      </div>
    </div>
  );
};
