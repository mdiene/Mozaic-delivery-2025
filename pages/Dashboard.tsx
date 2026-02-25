
import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { db } from '../services/db';
import { 
  TrendingUp, Truck, CheckCircle, Users, 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Activity, ChevronDown, ChevronUp, MoreHorizontal, Maximize2, Minimize2,
  Coins, Factory, Package, CalendarDays, ArrowLeftRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../components/Layout';
import { ProductionView, DeliveryView } from '../types';
import { getPhaseColor } from '../lib/colors';

// Aquiry Palette
const COLORS = [
  '#6f42c1', // Purple
  '#00d25b', // Green
  '#ffab00', // Amber
  '#ff5b5c', // Red
  '#0090e7', // Blue
  '#8f5fe8', // Lighter Purple
  '#00e396', // Teal
  '#feb019'  // Orange
];

const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (active && payload && payload.length) {
    if (chartType === 'pie') {
      const data = payload[0];
      return (
        <div className="min-w-[150px] rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="font-bold text-foreground">{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-mono font-bold text-primary">{data.value.toLocaleString()} T</span>
          </div>
        </div>
      );
    }
    return (
      <div className="min-w-[150px] rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl animate-in fade-in zoom-in-95">
        <div className="mb-2 font-bold text-foreground text-xs uppercase tracking-wider">{label}</div>
        <div className="grid gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: entry.stroke || entry.fill }}
                />
                <span className="capitalize text-muted-foreground font-medium text-[10px]">
                  {entry.name === 'tonnage' ? 'Prod. Tonnage' : 
                   entry.name === 'deliveryTonnage' ? 'Livré Tonnage' : 
                   entry.name === 'Planned' ? 'Prévu' : 'Réalisé'}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {Number(entry.value).toLocaleString()} T
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
  const [loading, setLoading] = useState(true);
  
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [prodChartType, setProdChartType] = useState<'area' | 'bar' | 'pie'>('area');
  const [prodRange, setProdRange] = useState<'15d' | 'all'>('15d');
  
  const [isMounted, setIsMounted] = useState(false);
  const [isProdGraphOpen, setIsProdGraphOpen] = useState(true);
  const [isCorrGraphOpen, setIsCorrGraphOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [s, c, p, d] = await Promise.all([
          db.getStats(selectedProject),
          db.getChartData(selectedProject),
          db.getProductions(),
          db.getDeliveriesView()
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
    const map: Record<string, number> = {};
    productionHistory.forEach(p => {
      const date = new Date(p.production_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      map[date] = (map[date] || 0) + Number(p.tonnage || 0);
    });

    const sorted = Object.entries(map)
      .map(([date, tonnage]) => ({ date, tonnage }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      });

    return prodRange === '15d' ? sorted.slice(-15) : sorted;
  }, [productionHistory, prodRange]);

  const correlationChartData = useMemo(() => {
    const combined: Record<string, { production: number; delivery: number }> = {};

    // Group Production
    productionHistory.forEach(p => {
      const date = new Date(p.production_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!combined[date]) combined[date] = { production: 0, delivery: 0 };
      combined[date].production += Number(p.tonnage || 0);
    });

    // Group Deliveries
    deliveriesHistory.forEach(d => {
      if (!d.delivery_date) return;
      const date = new Date(d.delivery_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!combined[date]) combined[date] = { production: 0, delivery: 0 };
      combined[date].delivery += Number(d.tonnage_loaded || 0);
    });

    return Object.entries(combined)
      .map(([date, vals]) => ({ 
        date, 
        tonnage: vals.production, 
        deliveryTonnage: vals.delivery 
      }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      })
      .slice(-20); // Show last 20 active days for correlation
  }, [productionHistory, deliveriesHistory]);

  const productionByPhaseData = useMemo(() => {
    const map: Record<string, number> = {};
    productionHistory.forEach(p => {
      const phase = p.project_phase || 'Autres';
      map[phase] = (map[phase] || 0) + Number(p.tonnage || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [productionHistory]);

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
    <div className="space-y-6">
      
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
        <KpiCard title="Total Livré" value={`${stats.totalDelivered.toLocaleString()} T`} subValue={`Cible: ${stats.totalTarget.toLocaleString()} T`} icon={CheckCircle} color="purple" />
        <KpiCard title="Réalisation" value={`${completionRate.toFixed(1)}%`} subValue="Progression globale" icon={Activity} color="green" />
        <KpiCard title="Stock Produit" value={`${stats.totalProduced.toLocaleString()} T`} subValue="Prêt pour livraison" icon={Factory} color="cyan" />
        <KpiCard title="Camions Actifs" value={stats.activeTrucks} subValue="Disponibles" icon={Truck} color="amber" />
        <KpiCard title="Frais & Charges" value={`${stats.totalFees.toLocaleString()} F`} subValue={feeLabel} icon={Coins} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="lg:col-span-2 rounded-2xl bg-card shadow-soft-xl border border-border min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div>
              <h3 className="font-bold text-lg text-foreground">Performance Régionale</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                 {selectedProject === 'all' ? 'Tous Projets' : 'Projet Sélectionné'}
              </p>
            </div>
            
            <div className="flex bg-muted p-1 rounded-lg">
                <button onClick={() => setChartType('bar')} className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><BarChart3 size={18} /></button>
                <button onClick={() => setChartType('line')} className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><LineChartIcon size={18} /></button>
                <button onClick={() => setChartType('pie')} className={`p-2 rounded-md transition-all ${chartType === 'pie' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}><PieChartIcon size={18} /></button>
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
                      <Bar dataKey="delivered" name="Delivered" fill="url(#colorGradient)" radius={[4, 4, 4, 4]} barSize={12} />
                      <defs><linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={1} /><stop offset="100%" stopColor="#8f5fe8" stopOpacity={1} /></linearGradient></defs>
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
          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
             <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-glow mb-4"><Factory size={22} /></div>
                <h3 className="font-bold text-lg text-foreground">Saisie Production</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Enregistrer les charges ensachées prêtes au chargement.</p>
                <Link to="/production" className="inline-flex items-center text-sm font-bold text-primary hover:text-purple-700 transition-colors">Accéder <ChevronDown className="rotate-[-90deg] ml-1" size={16} /></Link>
             </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-foreground">Activité Récente</h3>
              <MoreHorizontal size={20} className="text-muted-foreground cursor-pointer" />
            </div>
            <div className="space-y-6 relative">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border/50"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="h-5 w-5 rounded-full bg-card border-2 border-primary z-10 shrink-0 mt-0.5 shadow-sm"></div>
                  <div className="pb-1">
                    <p className="text-sm font-bold text-foreground">Camion expédié</p>
                    <p className="text-xs text-muted-foreground mt-1">BL25000{i} • Dakar &rarr; Thiès</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">il y a 2h</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Production Graph Section */}
      <div className={`pt-2 transition-all duration-300`}>
        <div onClick={() => setIsProdGraphOpen(!isProdGraphOpen)} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group cursor-pointer ${isProdGraphOpen ? 'bg-card border-border shadow-soft-xl' : 'bg-card/50 border-transparent hover:bg-card'}`}>
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${isProdGraphOpen ? 'bg-cyan-500/10 text-cyan-600' : 'bg-muted text-muted-foreground'}`}><Package size={24} /></div>
              <div className="text-left">
                 <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Performance de Production</h3>
                 <p className="text-sm text-muted-foreground">Tonnage ensaché {prodChartType === 'pie' ? 'par phase' : 'par jour'}</p>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex bg-muted p-1 rounded-lg shrink-0">
                  <button onClick={(e) => {e.stopPropagation(); setProdChartType('area')}} className={`p-2 rounded-md transition-all ${prodChartType === 'area' ? 'bg-white dark:bg-card shadow-sm text-cyan-600' : 'text-muted-foreground hover:text-foreground'}`}><LineChartIcon size={18} /></button>
                  <button onClick={(e) => {e.stopPropagation(); setProdChartType('bar')}} className={`p-2 rounded-md transition-all ${prodChartType === 'bar' ? 'bg-white dark:bg-card shadow-sm text-cyan-600' : 'text-muted-foreground hover:text-foreground'}`}><BarChart3 size={18} /></button>
                  <button onClick={(e) => {e.stopPropagation(); setProdChartType('pie')}} className={`p-2 rounded-md transition-all ${prodChartType === 'pie' ? 'bg-white dark:bg-card shadow-sm text-cyan-600' : 'text-muted-foreground hover:text-foreground'}`}><PieChartIcon size={18} /></button>
              </div>
              <div className="flex bg-muted p-1 rounded-lg shrink-0">
                  <button onClick={(e) => {e.stopPropagation(); setProdRange('15d')}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${prodRange === '15d' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>15 Jours</button>
                  <button onClick={(e) => {e.stopPropagation(); setProdRange('all')}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${prodRange === 'all' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Tout</button>
              </div>
              {isProdGraphOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
           </div>
        </div>
        {isProdGraphOpen && (
          <div className="mt-6 animate-in slide-in-from-top-4 duration-300 bg-card p-6 rounded-2xl border border-border shadow-soft-xl h-[400px]">
             {formattedProductionChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  {prodChartType === 'pie' ? (
                    <PieChart>
                      <Pie data={productionByPhaseData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name" stroke="none" cornerRadius={4}>
                        {productionByPhaseData.map((entry, index) => {
                          const phaseNum = entry.name.replace('Phase ', '');
                          const phaseColor = getPhaseColor(phaseNum);
                          return <Cell key={`cell-${index}`} fill={phaseColor.hex} />;
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip chartType="pie" />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  ) : prodChartType === 'bar' ? (
                    <BarChart data={formattedProductionChartData}>
                       <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                       <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }} />
                       <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                       <Tooltip content={<CustomTooltip chartType="bar" />} />
                       <Bar dataKey="tonnage" name="tonnage" fill="#00cccd" radius={[4, 4, 0, 0]} barSize={prodRange === 'all' ? undefined : 32} />
                    </BarChart>
                  ) : (
                    <AreaChart data={formattedProductionChartData}>
                      <defs><linearGradient id="fillProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00cccd" stopOpacity={0.3} /><stop offset="95%" stopColor="#00cccd" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={15} tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip chartType="area" />} />
                      <Area type="monotone" dataKey="tonnage" name="tonnage" stroke="#00cccd" strokeWidth={3} fill="url(#fillProd)" />
                    </AreaChart>
                  )}
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-muted-foreground italic">Aucune donnée.</div>}
          </div>
        )}
      </div>

      {/* Correlation Section: Production vs Deliveries */}
      <div className="pt-2">
         <div onClick={() => setIsCorrGraphOpen(!isCorrGraphOpen)} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group cursor-pointer ${isCorrGraphOpen ? 'bg-card border-border shadow-soft-xl' : 'bg-card/50 border-transparent hover:bg-card'}`}>
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl transition-colors ${isCorrGraphOpen ? 'bg-purple-500/10 text-purple-600' : 'bg-muted text-muted-foreground'}`}><ArrowLeftRight size={24} /></div>
               <div className="text-left">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Flux Logistique & Stock</h3>
                  <p className="text-sm text-muted-foreground">Corrélation entre Production ensachée et Livraisons expédiées</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
               {isCorrGraphOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
            </div>
         </div>
         {isCorrGraphOpen && (
            <div className="mt-6 animate-in slide-in-from-top-4 duration-300 bg-card p-6 rounded-2xl border border-border shadow-soft-xl h-[400px]">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-6 items-center">
                     <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-500"></div><span className="text-[10px] font-bold uppercase text-muted-foreground">Production</span></div>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-[10px] font-bold uppercase text-muted-foreground">Expédition</span></div>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground italic">Données des 20 derniers jours actifs</div>
               </div>
               <ResponsiveContainer width="100%" height="90%">
                  <ComposedChart data={correlationChartData}>
                     <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                     <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} />
                     <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} label={{ value: 'Tonnes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 'bold' } }} />
                     <Tooltip content={<CustomTooltip />} />
                     <Bar dataKey="tonnage" name="tonnage" fill="#00cccd" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8} />
                     <Line type="monotone" dataKey="deliveryTonnage" name="deliveryTonnage" stroke="#6f42c1" strokeWidth={3} dot={{ r: 4, fill: '#6f42c1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </ComposedChart>
               </ResponsiveContainer>
            </div>
         )}
      </div>

    </div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, color }: any) => {
  const colorMap: any = {
    purple: { bg: "from-purple-500 to-indigo-600", text: "text-purple-600" },
    green: { bg: "from-emerald-400 to-teal-500", text: "text-emerald-600" },
    amber: { bg: "from-amber-400 to-orange-500", text: "text-amber-600" },
    red: { bg: "from-rose-500 to-red-600", text: "text-rose-600" },
    cyan: { bg: "from-cyan-500 to-blue-600", text: "text-cyan-600" },
  };
  const theme = colorMap[color] || colorMap.purple;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft-xl border border-border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${theme.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mt-2 mb-1">{value}</h3>
          <p className={`text-xs font-bold ${theme.text} flex items-center gap-1`}><TrendingUp size={12} /> {subValue}</p>
        </div>
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${theme.bg} flex items-center justify-center text-white shadow-lg`}><Icon size={20} /></div>
      </div>
    </div>
  );
};
