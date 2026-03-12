
import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/db';
import { 
  TrendingUp, Truck, CheckCircle, Users, 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Activity, ChevronDown, ChevronUp, MoreHorizontal, Maximize2, Minimize2,
  Coins, Factory, Package, CalendarDays, ArrowLeftRight,
  ArrowUpRight, ArrowDownRight, Search, ShieldCheck, AlertTriangle, ClipboardCheck, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../components/Layout';
import { ProductionView, DeliveryView, HQSEInspection, HQSENonConformity, HQSECorrectiveAction, HQSESignalement, AdminPersonnel } from '../types';
import { getPhaseColor } from '../lib/colors';

// FlyonUI Palette
const COLORS = [
  '#8c57ff', // Primary Purple
  '#28c76f', // Success Green
  '#ff9f43', // Warning Orange
  '#ff4c51', // Destructive Red
  '#00bad1', // Info Cyan
  '#7367f0', // Indigo
  '#25293c', // Dark
  '#444050'  // Gray
];

const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (active && payload && payload.length) {
    if (chartType === 'pie') {
      const data = payload[0];
      return (
        <div className="min-w-[180px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md px-4 py-3 text-sm shadow-soft-xl animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/30">
            <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: data.fill }} />
            <span className="font-bold text-foreground truncate">{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground font-medium">Volume:</span>
            <span className="font-mono font-bold text-primary text-base">
              {Number(data.value).toLocaleString()} <span className="text-[10px] font-sans text-muted-foreground">T</span>
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="min-w-[180px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md px-4 py-3 text-sm shadow-soft-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="mb-3 font-bold text-foreground text-[10px] uppercase tracking-[0.15em] opacity-60 border-b border-border/30 pb-2">{label}</div>
        <div className="grid gap-2.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2.5">
                <span 
                  className="h-2.5 w-2.5 rounded-full shadow-sm" 
                  style={{ backgroundColor: entry.stroke || entry.fill }}
                />
                <span className="capitalize text-muted-foreground font-semibold text-[11px] tracking-tight">
                  {entry.name.toLowerCase() === 'tonnage' ? 'Production' : 
                   entry.name.toLowerCase() === 'deliverytonnage' ? 'Livraison' : 
                   entry.name.toLowerCase() === 'planned' ? 'Objectif' : 
                   entry.name.toLowerCase() === 'delivered' ? 'Réalisé' : entry.name}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {Number(entry.value).toLocaleString()} <span className="text-[9px] font-sans text-muted-foreground">T</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const { selectedProject, projects } = useProject();
  const [stats, setStats] = useState({ totalDelivered: 0, totalTarget: 0, activeTrucks: 0, totalFees: 0, totalProduced: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionView[]>([]);
  const [deliveriesHistory, setDeliveriesHistory] = useState<DeliveryView[]>([]);
  const [hqseActivities, setHqseActivities] = useState<any[]>([]);
  const [hqseSummaryData, setHqseSummaryData] = useState<any>({ severity: [], register: [], totalOpen: 0, criticalCount: 0, originBreakdown: [], safetyTrend: [] });
  const [hqseSignalements, setHqseSignalements] = useState<HQSESignalement[]>([]);
  const [adminStats, setAdminStats] = useState({ totalEmployees: 0, totalPostes: 0 });
  const [adminCharts, setAdminCharts] = useState({ personnelByPoste: [], personnelByCategorie: [] });
  const [adminPersonnel, setAdminPersonnel] = useState<AdminPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [prodChartType, setProdChartType] = useState<'area' | 'bar' | 'pie'>('area');
  const [prodRange, setProdRange] = useState<'15d' | '30d' | 'all'>('15d');
  const [prodSearch, setProdSearch] = useState('');
  const [corrChartType, setCorrChartType] = useState<'composed' | 'bar' | 'area' | 'pie'>('composed');
  const [corrRange, setCorrRange] = useState<'15d' | '30d' | 'all'>('15d');

  const [isMounted, setIsMounted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [s, c, p, d, insp, nc, ca, sig, adminPers, adminPostes] = await Promise.all([
          db.getStats(selectedProject),
          db.getChartData(selectedProject),
          db.getProductions(),
          db.getDeliveriesView(),
          db.getHQSEInspections(),
          db.getHQSENonConformities(),
          db.getHQSECorrectiveActions(),
          db.getHQSESignalements(),
          db.getAdminPersonnel(),
          db.getAdminPostes()
        ]);
        setStats(s as any); 
        setChartData(c);
        
        // Filter production by project if needed
        const filteredProd = selectedProject === 'all' 
          ? p 
          : p.filter(item => item.project_id === selectedProject);
        
        setProductionHistory(filteredProd);

        // Filter deliveries by project if needed
        const filteredDels = selectedProject === 'all'
          ? d
          : d.filter(item => item.project_id === selectedProject);
        
        setDeliveriesHistory(filteredDels);

        // Combine HQSE activities
        const combinedHqse = [
          ...insp.map(i => ({ ...i, type: 'inspection', date: i.inspection_date })),
          ...nc.map(n => ({ ...n, type: 'nc', date: n.declared_at })),
          ...ca.map(a => ({ ...a, type: 'ca', date: a.target_date || a.created_at }))
        ];
        setHqseActivities(combinedHqse);
        setHqseSignalements(sig);

        // Process Admin Data
        setAdminPersonnel(adminPers);
        setAdminStats({
          totalEmployees: adminPers.length,
          totalPostes: adminPostes.length
        });

        const personnelByPoste = adminPostes.map(poste => ({
          name: poste.titre_poste,
          count: adminPers.filter(p => p.id_poste === poste.id_poste).length
        })).sort((a, b) => b.count - a.count).slice(0, 6);

        const personnelByCategorie = Array.from(new Set(adminPostes.map(p => p.categorie_poste))).map(cat => ({
          name: cat,
          value: adminPers.filter(p => {
            const poste = adminPostes.find(pos => pos.id_poste === p.id_poste);
            return poste?.categorie_poste === cat;
          }).length
        }));

        setAdminCharts({
          personnelByPoste: personnelByPoste as any,
          personnelByCategorie: personnelByCategorie as any
        });

      } catch (e: any) {
        console.error('Error loading dashboard data:', e.message || e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [selectedProject]);

  const completionRate = stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0;

  const formattedProductionChartData = useMemo(() => {
    const map: Record<string, { tonnage: number, timestamp: number }> = {};
    const filtered = productionHistory.filter(p => {
      if (prodSearch) {
        const lower = prodSearch.toLowerCase();
        return p.notes?.toLowerCase().includes(lower) || 
               p.project_phase.toLowerCase().includes(lower);
      }
      return true;
    });

    filtered.forEach(p => {
      if (!p.production_date) return;
      const d = new Date(p.production_date);
      if (isNaN(d.getTime())) return;
      
      const dateKey = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      
      if (!map[dateKey]) {
        map[dateKey] = { tonnage: 0, timestamp: midnight };
      }
      map[dateKey].tonnage += Number(p.tonnage || 0);
    });

    const sorted = Object.entries(map)
      .map(([date, data]) => ({ date, tonnage: data.tonnage, timestamp: data.timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (prodRange === '15d') return sorted.slice(-15);
    if (prodRange === '30d') return sorted.slice(-30);
    return sorted;
  }, [productionHistory, prodRange, prodSearch]);

  const correlationChartData = useMemo(() => {
    const combined: Record<string, { production: number; delivery: number; timestamp: number }> = {};

    // Group Production
    productionHistory.forEach(p => {
      if (!p.production_date) return;
      const d = new Date(p.production_date);
      if (isNaN(d.getTime())) return;
      
      const dateKey = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      
      if (!combined[dateKey]) combined[dateKey] = { production: 0, delivery: 0, timestamp: midnight };
      combined[dateKey].production += Number(p.tonnage || 0);
    });

    // Group Deliveries
    deliveriesHistory.forEach(d => {
      if (!d.delivery_date) return;
      const dt = new Date(d.delivery_date);
      if (isNaN(dt.getTime())) return;
      
      const dateKey = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const midnight = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
      
      if (!combined[dateKey]) combined[dateKey] = { production: 0, delivery: 0, timestamp: midnight };
      combined[dateKey].delivery += Number(d.tonnage_loaded || 0);
    });

    const sorted = Object.entries(combined)
      .map(([date, vals]) => ({ 
        date, 
        tonnage: vals.production, 
        deliveryTonnage: vals.delivery,
        timestamp: vals.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (corrRange === '15d') return sorted.slice(-15);
    if (corrRange === '30d') return sorted.slice(-30);
    return sorted;
  }, [productionHistory, deliveriesHistory, corrRange]);

  const productionByPhaseData = useMemo(() => {
    const map: Record<string, number> = {};
    productionHistory.forEach(p => {
      const phase = p.project_phase || 'Autres';
      map[phase] = (map[phase] || 0) + Number(p.tonnage || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [productionHistory]);

  const deliveryByPhaseData = useMemo(() => {
    const map: Record<string, number> = {};
    deliveriesHistory.forEach(d => {
      const phase = d.project_phase || 'Autres';
      map[phase] = (map[phase] || 0) + Number(d.tonnage_loaded || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [deliveriesHistory]);

  useEffect(() => {
    const severityMap: Record<string, number> = { 'Critique': 0, 'Majeure': 0, 'Mineure': 0, 'Observation': 0 };
    const registerMap: Record<string, number> = {};
    const originMap: Record<string, number> = { 'materiel': 0, 'humain': 0, 'organisationnel': 0, 'externe': 0 };
    const trendData: Record<string, number> = {};

    // Initialize trend data for last 15 days
    for (let i = 0; i < 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendData[d.toISOString().split('T')[0]] = 0;
    }

    hqseSignalements.forEach(s => {
      severityMap[s.severity] = (severityMap[s.severity] || 0) + 1;
      registerMap[s.register] = (registerMap[s.register] || 0) + 1;
      if (originMap[s.origin] !== undefined) originMap[s.origin]++;
      
      const date = s.event_date.split('T')[0];
      if (trendData[date] !== undefined) trendData[date]++;
    });

    setHqseSummaryData({
      severity: Object.entries(severityMap).map(([name, value]) => ({ name, value })),
      register: Object.entries(registerMap).map(([name, value]) => ({ name, value })),
      originBreakdown: Object.entries(originMap).map(([name, value]) => ({ name, value })),
      safetyTrend: Object.entries(trendData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      totalOpen: hqseSignalements.filter(s => s.status === 'Nouveau').length,
      criticalCount: hqseSignalements.filter(s => s.severity === 'Critique').length
    });
  }, [hqseSignalements]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];

    // Add Deliveries only, max 4
    deliveriesHistory
      .sort((a, b) => new Date(b.delivery_date || b.created_at).getTime() - new Date(a.delivery_date || a.created_at).getTime())
      .slice(0, 4)
      .forEach(d => {
        activities.push({
          id: `del-${d.id}`,
          title: 'Camion expédié',
          description: `${d.bl_number} • ${d.region_name} → ${d.commune_name}`,
          date: d.delivery_date || d.created_at,
          icon: Truck,
          color: 'text-primary',
          borderColor: 'border-primary'
        });
      });

    return activities;
  }, [deliveriesHistory]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground font-medium">Chargement du tableau de bord...</span>
        </div>
      </div>
    );
  }

  const feeLabel = selectedProject === 'all' 
    ? 'Total Dépensé (Global)' 
    : `Total Dépensé (Phase ${projects.find(p => p.id === selectedProject)?.numero_phase || '-'})`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
         <div>
            <h1 className="text-2xl font-bold text-foreground">Tableau de Bord</h1>
            <p className="text-muted-foreground">Bienvenue sur le suivi de la campagne MASAE.</p>
         </div>
         <div className="text-sm text-right hidden md:block">
            <p className="font-medium text-foreground">Dernière mise à jour</p>
            <p className="text-muted-foreground text-xs">À l'instant</p>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <KpiCard title="Total Livré" value={`${stats.totalDelivered.toLocaleString()} T`} subValue={`Cible: ${stats.totalTarget.toLocaleString()} T`} icon={CheckCircle} color="purple" trend="up" delay={0.1} />
        <KpiCard title="Réalisation" value={`${completionRate.toFixed(1)}%`} subValue="Progression globale" icon={Activity} color="green" trend="up" delay={0.2} />
        <KpiCard title="Stock Produit" value={`${stats.totalProduced.toLocaleString()} T`} subValue="Prêt pour livraison" icon={Factory} color="cyan" trend="neutral" delay={0.3} />
        <KpiCard title="Camions Actifs" value={stats.activeTrucks} subValue="Disponibles" icon={Truck} color="amber" trend="neutral" delay={0.4} />
        <KpiCard title="Frais & Charges" value={`${stats.totalFees.toLocaleString()} F`} subValue={feeLabel} icon={Coins} color="red" trend="down" delay={0.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="lg:col-span-2 rounded-2xl bg-card shadow-sm border border-border min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div>
              <h3 className="font-bold text-lg text-foreground">Performance Régionale</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                 {selectedProject === 'all' ? 'Tous Projets' : 'Projet Sélectionné'}
              </p>
            </div>
            
            <div className="flex bg-secondary/50 p-1 rounded-lg">
                <button onClick={() => setChartType('bar')} className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><BarChart3 size={18} /></button>
                <button onClick={() => setChartType('line')} className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><LineChartIcon size={18} /></button>
                <button onClick={() => setChartType('pie')} className={`p-2 rounded-md transition-all ${chartType === 'pie' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><PieChartIcon size={18} /></button>
            </div>
          </div>

          <div className="p-6 flex-1 min-h-[380px]">
            {isMounted && (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="delivered" nameKey="name" stroke="none" cornerRadius={4}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip chartType="pie" />} cursor={{fill: 'transparent'}} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-sm font-semibold text-foreground ml-2">{value}</span>} />
                    </PieChart>
                  ) : chartType === 'bar' ? (
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={6}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip chartType="bar" />} cursor={{fill: 'var(--muted)', opacity: 0.3}} />
                      <Bar dataKey="planned" name="Planned" fill="var(--muted-foreground)" opacity={0.3} radius={[4, 4, 4, 4]} barSize={12} />
                      <Bar dataKey="delivered" name="Delivered" fill="var(--primary)" radius={[4, 4, 4, 4]} barSize={12} />
                    </BarChart>
                  ) : (
                    <AreaChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs><linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip chartType="area" />} cursor={false} />
                      <Area type="monotone" dataKey="planned" stroke="var(--muted-foreground)" strokeDasharray="5 5" strokeWidth={2} fill="none" />
                      <Area type="monotone" dataKey="delivered" stroke="var(--primary)" strokeWidth={3} fill="url(#fillDelivered)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
             <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4"><Factory size={22} /></div>
                <h3 className="font-bold text-lg text-foreground">Saisie Production</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Enregistrer les charges ensachées prêtes au chargement.</p>
                <Link to="/production" className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors">Accéder <ChevronDown className="rotate-[-90deg] ml-1" size={16} /></Link>
             </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-foreground">Activité Récente</h3>
              <MoreHorizontal size={20} className="text-muted-foreground cursor-pointer" />
            </div>
            <div className="space-y-6 relative">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border/50"></div>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    <div className={`h-5 w-5 rounded-full bg-card border-2 ${activity.borderColor} z-10 shrink-0 mt-0.5 shadow-sm flex items-center justify-center`}>
                      <activity.icon size={10} className={activity.color} />
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-bold text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                        {new Date(activity.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground italic">Aucune activité récente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Graph Section */}
      <div className="pt-2 space-y-4">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border bg-card border-border shadow-soft-sm gap-4">
           <div className="flex items-center gap-5">
              <div className="p-3.5 rounded-2xl bg-info/15 text-info shadow-glow">
                <Package size={26} />
              </div>
              <div className="text-left">
                 <h3 className="font-bold text-xl text-foreground">Performance de Production</h3>
                 <p className="text-sm text-muted-foreground font-medium">Analyse du tonnage ensaché {prodChartType === 'pie' ? 'par phase' : 'temporelle'}</p>
              </div>
           </div>
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-secondary/40 p-1 rounded-xl backdrop-blur-sm">
                  <button onClick={() => setProdChartType('area')} className={`p-2 rounded-lg transition-all ${prodChartType === 'area' ? 'bg-card shadow-soft-xs text-info' : 'text-muted-foreground hover:text-foreground'}`}><LineChartIcon size={18} /></button>
                  <button onClick={() => setProdChartType('bar')} className={`p-2 rounded-lg transition-all ${prodChartType === 'bar' ? 'bg-card shadow-soft-xs text-info' : 'text-muted-foreground hover:text-foreground'}`}><BarChart3 size={18} /></button>
                  <button onClick={() => setProdChartType('pie')} className={`p-2 rounded-lg transition-all ${prodChartType === 'pie' ? 'bg-card shadow-soft-xs text-info' : 'text-muted-foreground hover:text-foreground'}`}><PieChartIcon size={18} /></button>
              </div>
              <div className="flex bg-secondary/40 p-1 rounded-xl backdrop-blur-sm">
                  <button onClick={() => setProdRange('15d')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${prodRange === '15d' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>15 Jours</button>
                  <button onClick={() => setProdRange('30d')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${prodRange === '30d' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>30 Jours</button>
                  <button onClick={() => setProdRange('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${prodRange === 'all' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Tout</button>
              </div>
           </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Filtrer par note ou date..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="bg-card p-8 rounded-2xl border border-border/50 h-[450px] overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-info/50 via-info to-info/50 opacity-20"></div>
             {formattedProductionChartData.length > 0 || (prodChartType === 'pie' && productionByPhaseData.length > 0) ? (
               <ResponsiveContainer width="100%" height="100%">
                    {prodChartType === 'pie' ? (
                      <PieChart>
                        <Pie 
                          data={productionByPhaseData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={90} 
                          outerRadius={130} 
                          paddingAngle={8} 
                          dataKey="value" 
                          nameKey="name" 
                          stroke="none" 
                          cornerRadius={8}
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {productionByPhaseData.map((entry, index) => {
                            const phaseNum = entry.name.replace('Phase ', '');
                            const phaseColor = getPhaseColor(phaseNum);
                            return <Cell key={`cell-${index}`} fill={phaseColor.hex} />;
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip chartType="pie" />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={40} 
                          iconType="circle" 
                          formatter={(value) => <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">{value}</span>}
                        />
                      </PieChart>
                    ) : prodChartType === 'bar' ? (
                      <BarChart data={formattedProductionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                         <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--info)" stopOpacity={1} />
                              <stop offset="100%" stopColor="var(--info)" stopOpacity={0.6} />
                            </linearGradient>
                         </defs>
                         <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.4} />
                         <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            tickMargin={20} 
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }} 
                         />
                         <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tickMargin={10}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }} 
                         />
                         <Tooltip content={<CustomTooltip chartType="bar" />} cursor={{ fill: 'var(--muted)', opacity: 0.2 }} />
                         <Bar 
                            dataKey="tonnage" 
                            name="tonnage" 
                            fill="url(#barGradient)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={prodRange === 'all' ? undefined : 40} 
                            animationDuration={2000}
                         />
                      </BarChart>
                    ) : (
                      <AreaChart data={formattedProductionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillProd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--info)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                          </linearGradient>
                          <filter id="shadow" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                            <feOffset dx="0" dy="4" result="offsetblur" />
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.2" />
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.4} />
                        <XAxis 
                          dataKey="date" 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={20} 
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }} 
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={10}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }} 
                        />
                        <Tooltip content={<CustomTooltip chartType="area" />} cursor={false} />
                        <Area 
                          type="monotone" 
                          dataKey="tonnage" 
                          name="tonnage" 
                          stroke="var(--info)" 
                          strokeWidth={4} 
                          fill="url(#fillProd)" 
                          animationDuration={2000}
                          filter="url(#shadow)"
                        />
                      </AreaChart>
                    )}
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <div className="p-4 rounded-full bg-secondary/30">
                      <Activity size={32} className="opacity-20" />
                    </div>
                    <p className="italic font-medium">Aucune donnée de production disponible pour cette période.</p>
                 </div>
               )}
          </div>
        </div>
      </div>

      {/* Correlation Section: Production vs Deliveries */}
      <div className="pt-2 space-y-4">
         <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border bg-card border-border shadow-soft-sm gap-4">
            <div className="flex items-center gap-5">
               <div className="p-3.5 rounded-2xl bg-primary/15 text-primary shadow-glow">
                <ArrowLeftRight size={26} />
               </div>
               <div className="text-left">
                  <h3 className="font-bold text-xl text-foreground">Flux Logistique & Stock</h3>
                  <p className="text-sm text-muted-foreground font-medium">Corrélation entre Production ensachée et Livraisons expédiées</p>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-secondary/40 p-1 rounded-xl backdrop-blur-sm">
                  <button onClick={() => setCorrChartType('composed')} className={`p-2 rounded-lg transition-all ${corrChartType === 'composed' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}><LineChartIcon size={18} /></button>
                  <button onClick={() => setCorrChartType('bar')} className={`p-2 rounded-lg transition-all ${corrChartType === 'bar' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}><BarChart3 size={18} /></button>
                  <button onClick={() => setCorrChartType('area')} className={`p-2 rounded-lg transition-all ${corrChartType === 'area' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Activity size={18} /></button>
                  <button onClick={() => setCorrChartType('pie')} className={`p-2 rounded-lg transition-all ${corrChartType === 'pie' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}><PieChartIcon size={18} /></button>
              </div>
              <div className="flex bg-secondary/40 p-1 rounded-xl backdrop-blur-sm">
                  <button onClick={() => setCorrRange('15d')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${corrRange === '15d' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>15 Jours</button>
                  <button onClick={() => setCorrRange('30d')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${corrRange === '30d' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>30 Jours</button>
                  <button onClick={() => setCorrRange('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${corrRange === 'all' ? 'bg-card shadow-soft-xs text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Tout</button>
              </div>
           </div>
         </div>

         <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm space-y-4">
            <div className="bg-card p-8 rounded-2xl border border-border/50 h-[450px] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-20"></div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div className="flex gap-8 items-center bg-secondary/30 px-5 py-2.5 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-info shadow-[0_0_8px_rgba(0,186,209,0.4)]"></div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Production</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_8px_rgba(140,87,255,0.4)]"></div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Expédition</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter bg-muted/50 px-3 py-1 rounded-md">
                    Données des {corrRange === '15d' ? '15' : corrRange === '30d' ? '30' : '20'} derniers jours actifs
                  </div>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    {corrChartType === 'pie' ? (
                      <PieChart>
                        <Pie 
                          data={deliveryByPhaseData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={90} 
                          outerRadius={130} 
                          paddingAngle={8} 
                          dataKey="value" 
                          nameKey="name" 
                          stroke="none" 
                          cornerRadius={8}
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {deliveryByPhaseData.map((entry, index) => {
                            const phaseNum = entry.name.replace('Phase ', '');
                            const phaseColor = getPhaseColor(phaseNum);
                            return <Cell key={`cell-${index}`} fill={phaseColor.hex} />;
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip chartType="pie" />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={40} 
                          iconType="circle" 
                          formatter={(value) => <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">{value}</span>}
                        />
                      </PieChart>
                    ) : corrChartType === 'composed' ? (
                      <ComposedChart data={correlationChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.4} />
                        <XAxis 
                          dataKey="date" 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={15} 
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} 
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={10}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.15 }} />
                        <Bar 
                          dataKey="tonnage" 
                          name="tonnage" 
                          fill="var(--info)" 
                          radius={[4, 4, 0, 0]} 
                          barSize={24} 
                          opacity={0.7} 
                          animationDuration={2000}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="deliveryTonnage" 
                          name="deliveryTonnage" 
                          stroke="var(--primary)" 
                          strokeWidth={4} 
                          dot={{ r: 5, fill: 'var(--primary)', strokeWidth: 3, stroke: 'var(--card)' }} 
                          activeDot={{ r: 8, strokeWidth: 0, fill: 'var(--primary)' }} 
                          animationDuration={2500}
                        />
                      </ComposedChart>
                    ) : corrChartType === 'bar' ? (
                      <BarChart data={correlationChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.4} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.15 }} />
                        <Bar dataKey="tonnage" name="tonnage" fill="var(--info)" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar dataKey="deliveryTonnage" name="deliveryTonnage" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    ) : (
                      <AreaChart data={correlationChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillProdCorr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--info)" stopOpacity={0} /></linearGradient>
                          <linearGradient id="fillDelivCorr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.4} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="tonnage" name="tonnage" stroke="var(--info)" fill="url(#fillProdCorr)" strokeWidth={3} />
                        <Area type="monotone" dataKey="deliveryTonnage" name="deliveryTonnage" stroke="var(--primary)" fill="url(#fillDelivCorr)" strokeWidth={3} />
                      </AreaChart>
                    )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      {/* Administration & RH Section */}
      <div className="pt-2 space-y-4">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border bg-card border-border shadow-soft-sm gap-4">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-primary/15 text-primary shadow-glow">
              <Users size={26} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-xl text-foreground">Administration & Ressources Humaines</h3>
              <p className="text-sm text-muted-foreground font-medium">Effectifs, organisation et structure de l'entreprise</p>
            </div>
          </div>
          <Link to="/admin/personnel" className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2">
            Gestion Personnel <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Répartition par Poste</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminCharts.personnelByPoste} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'currentColor' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-soft-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Derniers Mouvements Personnel
              </h4>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="table w-full text-left">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employé</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Poste</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adminPersonnel.slice(0, 5).map((p, i) => (
                    <tr key={i} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {p.prenom.charAt(0)}{p.nom.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-foreground">{p.prenom} {p.nom}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{p.poste_titre}</td>
                      <td className="px-6 py-3">
                        <span className="badge badge-soft badge-success text-[9px]">Actif</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* HQSE Overview Section */}
      <div className="pt-2 space-y-4">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border bg-card border-border shadow-soft-sm gap-4">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-destructive/15 text-destructive shadow-glow">
              <ShieldCheck size={26} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-xl text-foreground">Sécurité & Conformité (HQSE)</h3>
              <p className="text-sm text-muted-foreground font-medium">Aperçu des signalements et risques opérationnels</p>
            </div>
          </div>
          <Link to="/hqse" className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2">
            Tableau de Bord HQSE <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tickets Ouverts</h4>
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold">TEMPS RÉEL</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-foreground">{hqseSummaryData.totalOpen}</span>
                <span className="text-xs text-muted-foreground mb-1.5 font-medium">Signalements nouveaux</span>
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground font-medium">Risques Critiques</span>
                  <span className="font-bold text-destructive">{hqseSummaryData.criticalCount}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive" 
                    style={{ width: `${Math.min(100, (hqseSummaryData.criticalCount / (hqseSummaryData.totalOpen || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tendance Sécurité (15j)</p>
                <div className="h-12 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hqseSummaryData.safetyTrend}>
                      <Area type="monotone" dataKey="count" stroke="var(--info)" fill="var(--info)" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                "La sécurité n'est pas un gadget, c'est un état d'esprit." - Veillez à la clôture rapide des tickets critiques.
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Répartition par Registre</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hqseSummaryData.register}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {hqseSummaryData.register.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-sm">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Origine des Signalements</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hqseSummaryData.originBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {hqseSummaryData.originBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Incident Command Center Table */}
        <div className="bg-card rounded-2xl border border-border shadow-soft-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-destructive" />
              Incident Command Center (Derniers Signalements)
            </h4>
            <Link to="/hqse" className="text-[10px] font-bold text-primary hover:underline">Voir tout</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead className="bg-muted/10">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registre</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gravité</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hqseSignalements.slice(0, 5).map((s, i) => (
                  <tr key={i} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-3 text-xs text-muted-foreground font-mono">
                      {new Date(s.event_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-bold text-foreground capitalize">{s.register}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-foreground line-clamp-1 max-w-[200px]">
                      {s.reason_description}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge badge-soft text-[9px] ${
                        s.severity === 'Critique' ? 'badge-error' :
                        s.severity === 'Majeure' ? 'badge-warning' :
                        'badge-info'
                      }`}>{s.severity}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge badge-outline text-[9px] ${
                        s.status === 'Résolu' ? 'badge-success' : 'badge-primary'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </motion.div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, color, trend, delay = 0 }: any) => {
  const colorMap: any = {
    purple: { bg: "bg-primary/10", text: "text-primary", icon: "bg-primary text-white", glow: "shadow-[0_0_20px_rgba(140,87,255,0.2)]" },
    green: { bg: "bg-success/10", text: "text-success", icon: "bg-success text-white", glow: "shadow-[0_0_20px_rgba(40,199,111,0.2)]" },
    amber: { bg: "bg-warning/10", text: "text-warning", icon: "bg-warning text-white", glow: "shadow-[0_0_20px_rgba(255,159,67,0.2)]" },
    red: { bg: "bg-destructive/10", text: "text-destructive", icon: "bg-destructive text-white", glow: "shadow-[0_0_20px_rgba(255,76,81,0.2)]" },
    cyan: { bg: "bg-info/10", text: "text-info", icon: "bg-info text-white", glow: "shadow-[0_0_20px_rgba(0,186,209,0.2)]" },
  };
  const theme = colorMap[color] || colorMap.purple;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="bg-card rounded-3xl p-6 shadow-soft-sm border border-border/60 relative overflow-hidden group hover:shadow-soft-md hover:border-primary/30 transition-all duration-500"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700" style={{ color: `var(--${color === 'purple' ? 'primary' : color})` }}></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
          <h3 className="text-2xl font-black text-foreground tracking-tight tabular-nums">{value}</h3>
          <div className="flex items-center gap-1.5 bg-secondary/30 w-fit px-2 py-0.5 rounded-full border border-border/20">
            {trend === 'up' && <ArrowUpRight size={12} className="text-success" />}
            {trend === 'down' && <ArrowDownRight size={12} className="text-destructive" />}
            {trend === 'neutral' && <ArrowLeftRight size={12} className="text-muted-foreground" />}
            <p className="text-[10px] font-bold text-muted-foreground/80">{subValue}</p>
          </div>
        </div>
        <div className={`h-12 w-12 rounded-2xl ${theme.icon} ${theme.glow} flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
};
