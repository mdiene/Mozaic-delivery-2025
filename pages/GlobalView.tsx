
import React, { useEffect, useState, useRef, ReactNode, useMemo } from 'react';
import { db } from '../services/db';
import { useProject } from '../components/Layout';
import { GlobalHierarchy, DeliveryView } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  MapPin, 
  User, 
  Box, 
  FileText, 
  Truck, 
  ChevronRight,
  Database,
  Building2,
  Filter,
  Minimize2,
  Maximize2,
  LayoutList,
  Folder,
  Calendar,
  TrendingUp,
  RotateCcw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  History,
  LayoutDashboard
} from 'lucide-react';

// Palette for charts
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

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
  truckPlate: string;
  totalTonnage: number;
  tripCount: number;
  deliveries: DeliveryView[];
  isWague: boolean;
}

/**
 * Stats Calculation Helper
 * Fix: Updated logic to correctly traverse the new GlobalHierarchy structure (Region -> Dept -> Commune -> Operator -> Allocation -> Delivery).
 */
const calculateNodeStats = (node: any, level: 'region' | 'dept' | 'commune' | 'operator' | 'allocation'): LevelStats => {
  let totalTarget = 0;
  let totalDelivered = 0;
  let count = 0;

  const traverse = (item: any, currentLevel: string) => {
    if (currentLevel === 'allocation') {
      totalTarget += item.target || 0;
      totalDelivered += item.delivered || 0;
      return;
    }
    
    let children: any[] = [];
    let nextLevel = '';

    if (currentLevel === 'region') { children = item.departments; nextLevel = 'dept'; }
    else if (currentLevel === 'dept') { children = item.communes; nextLevel = 'commune'; }
    // Fix: In GlobalHierarchy, commune children are 'operators'
    else if (currentLevel === 'commune') { children = item.operators; nextLevel = 'operator'; }
    else if (currentLevel === 'operator') { children = item.allocations; nextLevel = 'allocation'; }

    if (children) {
      children.forEach(child => traverse(child, nextLevel));
    }
  };

  traverse(node, level);

  if (level === 'region') count = node.departments?.length || 0;
  if (level === 'dept') count = node.communes?.length || 0;
  // Fix: Explicitly accessing operators property to avoid property existence errors during type narrowing
  if (level === 'commune') count = (node as any).operators?.length || 0;
  if (level === 'operator') count = node.allocations?.length || 0;
  if (level === 'allocation') count = node.deliveries?.length || 0;

  return { count, totalTarget, totalDelivered };
};

// --- SUB-COMPONENTS ---

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
    <div className={`flex flex-col bg-card border border-border rounded-xl shadow-soft-xl overflow-hidden transition-all duration-300 ${mode === 'maximized' ? 'flex-none h-auto' : 'flex-1 min-h-0'} ${className}`}>
      <div onClick={onToggle} className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-border/50 shrink-0 ${mode === 'maximized' ? 'bg-card' : 'bg-muted/10 hover:bg-muted/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${mode === 'maximized' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon size={16} />
          </div>
          <span className={`font-bold text-sm ${mode === 'maximized' ? 'text-primary' : 'text-foreground'}`}>{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="opacity-100">{headerContent}</div>
          <button className="text-muted-foreground hover:text-primary transition-colors">
            {mode === 'maximized' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className={`${mode === 'maximized' ? 'relative w-full overflow-x-auto' : 'flex-1 overflow-hidden relative'}`}>
        <div ref={scrollRef} className={`${mode === 'maximized' ? 'flex divide-x divide-border min-w-full w-max' : 'absolute inset-0 overflow-x-auto overflow-y-hidden flex divide-x divide-border'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

interface ColumnProps {
  title: string;
  stats?: LevelStats;
  children?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  isScrollable: boolean;
}

const Column: React.FC<ColumnProps> = ({ title, stats, children, className = "", headerAction, isScrollable }) => (
  <div className={`flex flex-col min-w-[320px] max-w-[360px] bg-card ${className} border-r border-border first:rounded-l-xl last:rounded-r-xl last:border-r-0 ${isScrollable ? 'h-full' : 'h-auto min-h-full'}`}>
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
            <div className="h-full bg-primary/50 transition-all duration-500" style={{ width: `${stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0}%` }} />
          </div>
        </>
      )}
    </div>
    <div className={`flex-1 p-2 space-y-1 scrollbar-thin ${isScrollable ? 'overflow-y-auto' : 'overflow-visible'}`}>
      {children}
    </div>
  </div>
);

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

const ListItem: React.FC<ListItemProps> = ({ selected, onClick, label, subLabel, icon: Icon, hasChildren = true, statusColor = "", rightInfo, progress }) => {
  const percent = progress && progress.target > 0 ? (progress.delivered / progress.target) * 100 : 0;
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group border ${selected ? 'bg-primary/10 border-primary/20 text-primary shadow-sm' : 'bg-transparent border-transparent hover:bg-muted text-foreground hover:text-foreground'}`}>
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {Icon && <div className={`shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}><Icon size={18} /></div>}
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className={`text-sm font-semibold truncate ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</span>
          {subLabel && <span className={`text-xs truncate ${selected ? 'text-primary/80' : 'text-muted-foreground'}`}>{subLabel}</span>}
          {progress && (
             <div className="w-full h-1 bg-muted-foreground/10 rounded-full mt-1.5 overflow-hidden">
                <div className={`h-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-primary/50'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
             </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-2 shrink-0">
        {rightInfo}
        {statusColor && <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>}
        {hasChildren && <ChevronRight size={16} className={`transition-transform ${selected ? 'text-primary' : 'text-muted-foreground/50'}`} />}
      </div>
    </button>
  );
};

// --- DRIVER STATS DASHBOARD ---
const DriverStatsDashboard = ({ driver }: { driver: DriverStat }) => {
  // Compute Regional Distribution
  const regionData = useMemo(() => {
    const map: Record<string, number> = {};
    driver.deliveries.forEach(d => {
      const r = d.region_name || 'Inconnu';
      map[r] = (map[r] || 0) + Number(d.tonnage_loaded);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [driver]);

  // Compute Tonnage Progression (History of trips)
  const progressionData = useMemo(() => {
    return [...driver.deliveries]
      .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())
      .map((d, i) => ({
        index: i + 1,
        tonnage: Number(d.tonnage_loaded),
        date: d.delivery_date ? new Date(d.delivery_date).toLocaleDateString() : 'N/A'
      }));
  }, [driver]);

  const avgTonnage = driver.totalTonnage / (driver.tripCount || 1);
  const maxTonnage = Math.max(...driver.deliveries.map(d => Number(d.tonnage_loaded)), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-soft-sm">
           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Tonnage Moyen</p>
           <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground font-mono">{avgTonnage.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground font-medium">T / voyage</span>
           </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-soft-sm">
           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Max Chargé</p>
           <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground font-mono">{maxTonnage.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground font-medium">T</span>
           </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-soft-sm">
           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Performance</p>
           <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-600 font-mono">+{driver.tripCount}</span>
              <span className="text-xs text-muted-foreground font-medium">Livraisons</span>
           </div>
        </div>
      </div>

      {/* Vertical Chart Stacking as requested: Pie on top, Bar below */}
      <div className="space-y-6">
        {/* Top: Regional Distribution */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft-sm">
           <h6 className="text-xs font-bold text-foreground uppercase mb-6 flex items-center gap-2">
              <PieChartIcon size={14} className="text-primary" /> Répartition Géographique
           </h6>
           <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4 min-w-[120px]">
                 {regionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                       <span className="text-xs font-semibold text-foreground truncate">{entry.name}</span>
                       <span className="text-[10px] text-muted-foreground font-mono ml-auto">{entry.value}T</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Bottom: Progression Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft-sm">
           <h6 className="text-xs font-bold text-foreground uppercase mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" /> Constance du Tonnage
           </h6>
           <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="tonnage" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
           </div>
           <p className="text-[10px] text-muted-foreground text-center mt-3 italic">Évolution de la charge transportée par voyage (Tonnes)</p>
        </div>
      </div>
    </div>
  );
};

export const GlobalView = () => {
  const { selectedProject, projects, setSelectedProject } = useProject();
  const [hierarchy, setHierarchy] = useState<GlobalHierarchy>([]);
  const [flatDeliveries, setFlatDeliveries] = useState<DeliveryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'split' | 'geo' | 'drivers' | 'collapsed'>('collapsed');
  
  // Selection State
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [selectedAllocId, setSelectedAllocId] = useState<string | null>(null);
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
        const filteredDels = selectedProject === 'all' ? dels : dels.filter(d => d.project_id === selectedProject);
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

  useEffect(() => {
    if (!loading && hierarchy.length > 0 && !selectedRegionId) {
      setSelectedRegionId(hierarchy[0].id);
    }
  }, [loading, hierarchy, selectedRegionId]);

  const selectedRegion = useMemo(() => hierarchy.find(r => r.id === selectedRegionId), [hierarchy, selectedRegionId]);
  const departments = useMemo(() => selectedRegion ? selectedRegion.departments.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedRegion]);
  const selectedDept = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);
  const communes = useMemo(() => selectedDept ? selectedDept.communes.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedDept]);
  const selectedCommune = useMemo(() => communes.find(c => c.id === selectedCommuneId), [communes, selectedCommuneId]);
  const operators = useMemo(() => selectedCommune ? selectedCommune.operators.sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedCommune]);
  const selectedOperator = useMemo(() => operators.find(o => o.id === selectedOperatorId), [operators, selectedOperatorId]);
  const allocations = useMemo(() => selectedOperator ? selectedOperator.allocations : [], [selectedOperator]);
  const selectedAllocation = useMemo(() => allocations.find(a => a.id === selectedAllocId), [allocations, selectedAllocId]);
  const deliveries = useMemo(() => selectedAllocation ? selectedAllocation.deliveries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [], [selectedAllocation]);

  const totalZoneStats = useMemo(() => {
    let totalTarget = 0, totalDelivered = 0, count = hierarchy.length;
    hierarchy.forEach(r => {
       const stats = calculateNodeStats(r, 'region');
       totalTarget += stats.totalTarget; totalDelivered += stats.totalDelivered;
    });
    return { count, totalTarget, totalDelivered };
  }, [hierarchy]);

  const deptColumnStats = useMemo(() => selectedRegion ? calculateNodeStats(selectedRegion, 'region') : { count: 0, totalTarget: 0, totalDelivered: 0 }, [selectedRegion]);
  const communeColumnStats = useMemo(() => selectedDept ? calculateNodeStats(selectedDept, 'dept') : { count: 0, totalTarget: 0, totalDelivered: 0 }, [selectedDept]);
  const operatorColumnStats = useMemo(() => selectedCommune ? calculateNodeStats(selectedCommune, 'commune') : { count: 0, totalTarget: 0, totalDelivered: 0 }, [selectedCommune]);
  const allocationStats = useMemo(() => selectedOperator ? calculateNodeStats(selectedOperator, 'operator') : { count: 0, totalTarget: 0, totalDelivered: 0 }, [selectedOperator]);

  const driverStats: DriverStat[] = useMemo(() => {
    const stats: Record<string, DriverStat> = {};
    flatDeliveries.forEach(d => {
      const dId = d.driver_id || 'unknown';
      if (!stats[dId]) {
        stats[dId] = { driverId: dId, driverName: d.driver_name || 'Inconnu', truckPlate: d.truck_plate || '-', totalTonnage: 0, tripCount: 0, deliveries: [], isWague: d.truck_owner_type === true };
      }
      stats[dId].totalTonnage += Number(d.tonnage_loaded);
      stats[dId].tripCount += 1;
      stats[dId].deliveries.push(d);
    });
    return Object.values(stats).sort((a, b) => b.totalTonnage - a.totalTonnage);
  }, [flatDeliveries]);

  useEffect(() => {
    if (!loading && driverStats.length > 0 && !selectedDriverId) {
      setSelectedDriverId(driverStats[0].driverId);
    }
  }, [loading, driverStats, selectedDriverId]);

  const selectedDriver = useMemo(() => driverStats.find(d => d.driverId === selectedDriverId), [driverStats, selectedDriverId]);

  const toggleLayout = (target: 'geo' | 'drivers') => {
    setLayoutMode(layoutMode === target ? 'collapsed' : target);
  };

  const resetSelections = () => {
    setSelectedRegionId(null); setSelectedDeptId(null); setSelectedCommuneId(null);
    setSelectedOperatorId(null); setSelectedAllocId(null); setSelectedDriverId(null);
  };

  const handleRegionSelect = (id: string) => {
    setSelectedRegionId(id); setSelectedDeptId(null); setSelectedCommuneId(null); setSelectedOperatorId(null); setSelectedAllocId(null);
  };

  const handleDeptSelect = (id: string) => {
    setSelectedDeptId(id); setSelectedCommuneId(null); setSelectedOperatorId(null); setSelectedAllocId(null);
  };

  const handleCommuneSelect = (id: string) => {
    setSelectedCommuneId(id); setSelectedOperatorId(null); setSelectedAllocId(null);
  };

  useEffect(() => {
    if (scrollContainerRef.current && (selectedOperatorId || selectedAllocId)) {
      scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' });
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

  const geoMode = layoutMode === 'geo' ? 'maximized' : (layoutMode === 'drivers' || layoutMode === 'collapsed' ? 'hidden' : 'split');
  const driverMode = layoutMode === 'drivers' ? 'maximized' : (layoutMode === 'geo' || layoutMode === 'collapsed' ? 'hidden' : 'split');

  return (
    <div className={`flex flex-col space-y-4 ${layoutMode === 'split' ? 'h-[calc(100vh-8rem)]' : 'min-h-[calc(100vh-8rem)]'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vue Globale</h1>
          <p className="text-muted-foreground text-sm">Exploration : Arborescence géographique &rarr; Détails logistiques</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex bg-card border border-border rounded-lg p-1 shadow-sm">
              <button onClick={resetSelections} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                <RotateCcw size={14} /> <span className="hidden sm:inline">Réinitialiser</span>
              </button>
           </div>
           <div className="bg-card p-1 rounded-lg border border-border flex items-center gap-2 shadow-sm">
              <div className="px-2 text-muted-foreground"><Filter size={14} /></div>
              <form className="filter border-none p-0 bg-transparent shadow-none">
                <input className="btn btn-square h-8 w-8 min-h-0" type="reset" value="×" onClick={() => setSelectedProject('all')} />
                {projects.map(p => (
                  <input key={p.id} className="btn h-8 min-h-0 px-3 text-xs" type="radio" name="global-view-phase" aria-label={`Phase ${p.numero_phase}`} checked={selectedProject === p.id} onChange={() => setSelectedProject(p.id)} />
                ))}
              </form>
           </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <Section title="Zones Géographiques" icon={MapPin} mode={geoMode} onToggle={() => toggleLayout('geo')} scrollRef={scrollContainerRef} headerContent={<div className="flex items-baseline gap-2"><span className="text-sm font-bold font-mono text-primary">{totalZoneStats.totalDelivered.toLocaleString()} / {totalZoneStats.totalTarget.toLocaleString()} T</span></div>}>
            <Column title="Régions" stats={totalZoneStats} isScrollable={geoMode === 'split'}>
              {hierarchy.map(region => {
                const rStats = calculateNodeStats(region, 'region');
                return <ListItem key={region.id} label={region.name} icon={MapPin} selected={selectedRegionId === region.id} onClick={() => handleRegionSelect(region.id)} rightInfo={<span className="text-[10px] font-mono text-muted-foreground">{rStats.totalDelivered.toLocaleString()} / {rStats.totalTarget.toLocaleString()} T</span>} progress={{ target: rStats.totalTarget, delivered: rStats.totalDelivered }} />;
              })}
            </Column>
            {selectedRegion && (
              <Column title="Départements" stats={deptColumnStats} isScrollable={geoMode === 'split'}>
                {departments.map(dept => {
                  const dStats = calculateNodeStats(dept, 'dept');
                  return <ListItem key={dept.id} label={dept.name} icon={Folder} selected={selectedDeptId === dept.id} onClick={() => handleDeptSelect(dept.id)} rightInfo={<span className="text-[10px] font-mono text-muted-foreground">{dStats.totalDelivered.toLocaleString()} / {dStats.totalTarget.toLocaleString()} T</span>} progress={{ target: dStats.totalTarget, delivered: dStats.totalDelivered }} />;
                })}
              </Column>
            )}
            {selectedDept && (
              <Column title="Communes" stats={communeColumnStats} isScrollable={geoMode === 'split'}>
                {communes.map(commune => {
                  // Fix: Fixed variable name error where dStats was used instead of cStats in the ListItem below
                  const cStats = calculateNodeStats(commune, 'commune');
                  return <ListItem key={commune.id} label={commune.name} icon={MapPin} selected={selectedCommuneId === commune.id} onClick={() => handleCommuneSelect(commune.id)} rightInfo={<span className="text-[10px] font-mono text-muted-foreground">{cStats.totalDelivered.toLocaleString()} / {cStats.totalTarget.toLocaleString()} T</span>} progress={{ target: cStats.totalTarget, delivered: cStats.totalDelivered }} />;
                })}
              </Column>
            )}
            {selectedCommune && (
              <Column title="Opérateurs" stats={operatorColumnStats} isScrollable={geoMode === 'split'}>
                {operators.map(op => <ListItem key={op.id} label={op.name} subLabel={op.is_coop ? 'Coopérative / GIE' : 'Individuel'} icon={op.is_coop ? Building2 : User} selected={selectedOperatorId === op.id} onClick={() => { setSelectedOperatorId(op.id); setSelectedAllocId(null); }} />)}
              </Column>
            )}
            {selectedOperator && (
              <Column title="Allocations" stats={allocationStats} isScrollable={geoMode === 'split'}>
                {allocations.map(alloc => {
                  const progress = alloc.target > 0 ? (alloc.delivered / alloc.target) * 100 : 0;
                  const color = progress >= 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-amber-500' : 'bg-blue-500';
                  return <ListItem key={alloc.id} label={alloc.allocation_key} subLabel={<div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden mt-0.5"><div className={`h-full ${color}`} style={{ width: `${Math.min(100, progress)}%` }}></div></div>} rightInfo={<span className="text-[10px] font-mono text-muted-foreground">{alloc.delivered}/{alloc.target} T</span>} icon={Box} selected={selectedAllocId === alloc.id} onClick={() => setSelectedAllocId(alloc.id)} statusColor={color} />;
                })}
              </Column>
            )}
            {selectedAllocation && (
              <Column title="Livraisons" stats={{ count: deliveries.length, totalTarget: 0, totalDelivered: deliveries.reduce((acc, curr) => acc + curr.tonnage, 0) }} isScrollable={geoMode === 'split'}>
                {deliveries.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground italic">Aucune livraison</div> : deliveries.map(del => (
                  <div key={del.id} className="p-3 border rounded-lg bg-card mb-2 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><FileText size={16} className="text-primary" /><span className="font-mono font-bold text-sm text-foreground">{del.bl_number}</span></div><span className="text-xs text-muted-foreground">{new Date(del.date).toLocaleDateString()}</span></div>
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground flex items-center gap-1"><Truck size={12} /> {del.truck_plate}</span><span className="font-bold text-foreground bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{del.tonnage} T</span></div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1"><User size={10} /> {del.driver_name}</div>
                  </div>
                ))}
              </Column>
            )}
            <div className="min-w-[50px] shrink-0" />
        </Section>

        <Section title="Performance Chauffeurs" icon={Truck} mode={driverMode} onToggle={() => toggleLayout('drivers')} headerContent={<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded hidden sm:inline">{driverStats.length} Actifs</span></div>}>
           <div className="flex divide-x divide-border min-h-full">
              {/* Left Column: Driver List */}
              <div className={`w-1/3 min-w-[300px] p-2 space-y-1 bg-card ${driverMode === 'split' ? 'overflow-y-auto' : 'overflow-visible'}`}>
                 {driverStats.length === 0 ? <div className="text-center p-8 text-muted-foreground text-sm">Aucune donnée chauffeur.</div> : driverStats.map(driver => (
                    <button key={driver.driverId} onClick={() => setSelectedDriverId(driver.driverId)} className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all border ${selectedDriverId === driver.driverId ? 'bg-primary/10 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-muted'}`}>
                       <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2 rounded-full ${selectedDriverId === driver.driverId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><User size={16} /></div>
                          <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold truncate ${selectedDriverId === driver.driverId ? 'text-primary' : 'text-foreground'}`}>{driver.driverName}</span>
                                {driver.isWague && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100 shrink-0">Wague AB</span>}
                             </div>
                             <span className="text-xs text-muted-foreground truncate flex items-center gap-1"><Truck size={10} /> {driver.truckPlate}</span>
                          </div>
                       </div>
                       <div className="flex flex-col items-end shrink-0"><span className="text-sm font-bold font-mono text-foreground">{driver.totalTonnage.toLocaleString()} T</span><span className="text-[10px] text-muted-foreground">{driver.tripCount} Voyage{driver.tripCount > 1 ? 's' : ''}</span></div>
                    </button>
                 ))}
              </div>

              {/* Right Column: Driver Details with Statistics and History in distinct sections */}
              <div className={`flex-1 p-0 bg-muted/5 ${driverMode === 'split' ? 'overflow-y-auto' : 'overflow-visible'}`}>
                 {selectedDriver ? (
                    <div className="flex flex-col h-full">
                       {/* Header */}
                       <div className="p-4 border-b border-border bg-card shrink-0 sticky top-0 z-10">
                          <div className="flex justify-between items-start">
                             <div>
                                <div className="flex items-center gap-3">
                                   <h4 className="text-lg font-bold text-foreground">{selectedDriver.driverName}</h4>
                                   {selectedDriver.isWague && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">Wague AB</span>}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2"><Truck size={14} /> {selectedDriver.truckPlate}</p>
                             </div>
                             <div className="text-right">
                                <div className="text-2xl font-bold text-primary font-mono">{selectedDriver.totalTonnage.toLocaleString()} T</div>
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tonnage Total Livré</div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-6 space-y-12">
                          {/* SECTION 1: STATISTICS */}
                          <div>
                             <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2 border-l-2 border-primary pl-3">
                                <LayoutDashboard size={14} className="text-primary" /> Statistiques de Performance
                             </h5>
                             <DriverStatsDashboard driver={selectedDriver} />
                          </div>

                          <div className="h-px bg-border w-full" />

                          {/* SECTION 2: HISTORY */}
                          <div>
                             <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2 border-l-2 border-blue-500 pl-3">
                                <History size={14} className="text-blue-500" /> Historique des Livraisons ({selectedDriver.deliveries.length})
                             </h5>
                             <div className="space-y-3">
                                {selectedDriver.deliveries.sort((a,b) => new Date(b.delivery_date).getTime() - new Date(a.date).getTime()).map((del) => (
                                   <div key={del.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                                      <div className="flex items-center gap-4">
                                         <div className="p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                            <FileText size={18} />
                                         </div>
                                         <div>
                                            <div className="flex items-center gap-3">
                                               <span className="font-bold text-sm text-foreground">{del.bl_number}</span>
                                               <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium uppercase">{del.project_phase}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                                               <span className="flex items-center gap-1"><Calendar size={12} /> {del.delivery_date ? new Date(del.delivery_date).toLocaleDateString('fr-FR') : '-'}</span>
                                               <span className="flex items-center gap-1"><MapPin size={12} /> {del.commune_name || 'Inconnue'}</span>
                                            </div>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-6">
                                         <div className="text-right">
                                            <span className="block font-bold text-sm text-foreground">{del.operator_name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Destinataire</span>
                                         </div>
                                         <div className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg text-sm font-bold font-mono min-w-[4rem] text-center border border-primary/10">
                                            {del.tonnage_loaded} T
                                         </div>
                                      </div>
                                   </div>
                                ))}
                             </div>
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
