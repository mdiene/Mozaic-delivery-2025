
import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { db } from '../services/db';
import { 
  TrendingUp, Truck, AlertTriangle, CheckCircle, Users, 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Activity, ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../components/Layout';

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
            <span className="text-muted-foreground">Livré:</span>
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
                <span className="capitalize text-muted-foreground font-medium">
                  {entry.name === 'Planned' ? 'Prévu' : entry.name === 'Delivered' ? 'Livré' : 'Volume'}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {entry.value} T
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
  const [stats, setStats] = useState({ totalDelivered: 0, totalTarget: 0, activeTrucks: 0, alerts: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [truckData, setTruckData] = useState<{name: string, value: number}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [isMounted, setIsMounted] = useState(false);
  const [isTruckChartOpen, setIsTruckChartOpen] = useState(true); // Default open
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [s, c, t] = await Promise.all([
          db.getStats(selectedProject),
          db.getChartData(selectedProject),
          db.getTruckStats(selectedProject)
        ]);
        setStats(s);
        setChartData(c);
        setTruckData(t);
      } catch (e: any) {
        console.error('Error loading dashboard data:', e.message || e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [selectedProject]);

  const completionRate = stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0;

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

      {/* KPI Cards (Aquiry Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Livré" 
          value={`${stats.totalDelivered.toLocaleString()} T`} 
          subValue={`Cible: ${stats.totalTarget.toLocaleString()} T`}
          icon={CheckCircle} 
          color="purple" 
        />
        <KpiCard 
          title="Réalisation" 
          value={`${completionRate.toFixed(1)}%`} 
          subValue="Progression globale"
          icon={Activity} 
          color="green" 
        />
        <KpiCard 
          title="Camions Actifs" 
          value={stats.activeTrucks} 
          subValue="Sur la route"
          icon={Truck} 
          color="amber" 
        />
        <KpiCard 
          title="Alertes" 
          value={stats.alerts} 
          subValue="Nécessite Attention"
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      {/* Main Chart Section */}
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
                <button 
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <BarChart3 size={18} />
                </button>
                <button 
                  onClick={() => setChartType('line')}
                  className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LineChartIcon size={18} />
                </button>
                <button 
                  onClick={() => setChartType('pie')}
                  className={`p-2 rounded-md transition-all ${chartType === 'pie' ? 'bg-white dark:bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <PieChartIcon size={18} />
                </button>
            </div>
          </div>

          <div className="p-6 flex-1 min-h-[380px]">
            {isMounted && (
              <div className="h-[350px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="delivered"
                        nameKey="name"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip chartType="pie" />} cursor={{fill: 'transparent'}} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-sm font-semibold text-foreground ml-2">{value}</span>}
                      />
                    </PieChart>
                  ) : chartType === 'bar' ? (
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={6}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={15}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
                      />
                      <Tooltip content={<CustomTooltip chartType="bar" />} cursor={{fill: 'var(--muted)', opacity: 0.3}} />
                      <Bar dataKey="planned" name="Planned" fill="var(--muted-foreground)" opacity={0.3} radius={[4, 4, 4, 4]} barSize={12} />
                      <Bar dataKey="delivered" name="Delivered" fill="url(#colorGradient)" radius={[4, 4, 4, 4]} barSize={12} />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                          <stop offset="100%" stopColor="#8f5fe8" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  ) : (
                    <AreaChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={15}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
                      />
                      <Tooltip content={<CustomTooltip chartType="area" />} cursor={false} />
                      <Area
                        type="monotone"
                        dataKey="planned"
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        fill="url(#fillDelivered)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
           {/* Action Card */}
          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
             
             <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-glow mb-4">
                  <Users size={22} />
                </div>
                <h3 className="font-bold text-lg text-foreground">Gérer les Opérateurs</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Ajouter des GIE ou opérateurs individuels.</p>
                
                <Link 
                  to="/settings" 
                  className="inline-flex items-center text-sm font-bold text-primary hover:text-purple-700 transition-colors"
                >
                  Accéder <ChevronDown className="rotate-[-90deg] ml-1" size={16} />
                </Link>
             </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-foreground">Activité Récente</h3>
              <Activity size={20} className="text-muted-foreground" />
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

      {/* Collapsible Truck Performance Chart with Fullscreen Mode */}
      <div className={`pt-2 transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-hidden' : ''}`}>
        
        {/* Toggle/Header Bar */}
        <div 
           onClick={() => !isFullScreen && setIsTruckChartOpen(!isTruckChartOpen)}
           className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group cursor-pointer
             ${isTruckChartOpen || isFullScreen 
               ? 'bg-card border-border shadow-soft-xl' 
               : 'bg-card/50 border-transparent hover:bg-card hover:shadow-soft-sm'
             }`}
        >
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${isTruckChartOpen || isFullScreen ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                 <Truck size={24} />
              </div>
              <div className="text-left">
                 <h3 className="font-bold text-lg text-foreground group-hover:text-amber-600 transition-colors">Performance Flotte & Transporteurs</h3>
                 <p className="text-sm text-muted-foreground">Volume total livré par camion ({selectedProject === 'all' ? 'Global' : 'Par Phase'})</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              {/* Fullscreen Button - Only visible if open */}
              {(isTruckChartOpen || isFullScreen) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullScreen(!isFullScreen);
                    // Ensure chart stays open if we exit fullscreen
                    if (!isFullScreen) setIsTruckChartOpen(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-muted rounded-lg transition-colors"
                  title={isFullScreen ? "Réduire" : "Plein écran"}
                >
                   {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              )}
              
              {!isFullScreen && (
                 isTruckChartOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />
              )}
           </div>
        </div>

        {/* Chart Content */}
        {(isTruckChartOpen || isFullScreen) && (
          <div className={`mt-6 bg-card rounded-2xl border border-border p-6 shadow-sm animate-in slide-in-from-top-4 fade-in duration-300 ${isFullScreen ? 'h-[calc(100vh-140px)]' : 'h-[500px]'}`}>
             {truckData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart 
                    data={truckData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // Increased bottom for labels
                 >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      unit=" T"
                    />
                    <Tooltip 
                      cursor={{ fill: 'var(--muted)', opacity: 0.3 }} 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
                              <p className="mb-1 text-sm font-bold text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">Volume Livré: <span className="font-mono font-bold text-amber-600">{payload[0].value} T</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="var(--chart-3)" // Amber
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="w-full h-full flex items-center justify-center text-muted-foreground shadow-inner bg-muted/5 rounded-xl">
                 {loading ? 'Chargement...' : 'Aucune donnée de livraison disponible pour cette sélection.'}
               </div>
             )}
          </div>
        )}
      </div>

    </div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, color }: any) => {
  // Aquiry style gradients for icon backgrounds
  const colorMap: any = {
    purple: { bg: "from-purple-500 to-indigo-600", text: "text-purple-600" },
    green: { bg: "from-emerald-400 to-teal-500", text: "text-emerald-600" },
    amber: { bg: "from-amber-400 to-orange-500", text: "text-amber-600" },
    red: { bg: "from-rose-500 to-red-600", text: "text-rose-600" },
  };
  const theme = colorMap[color] || colorMap.purple;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft-xl border border-border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      {/* Background decoration */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${theme.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
      
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mt-2 mb-1">{value}</h3>
          <p className={`text-xs font-bold ${theme.text} flex items-center gap-1`}>
             <TrendingUp size={12} /> {subValue}
          </p>
        </div>
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${theme.bg} flex items-center justify-center text-white shadow-lg`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};
