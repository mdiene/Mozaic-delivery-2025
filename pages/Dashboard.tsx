
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { TrendingUp, Truck, AlertTriangle, CheckCircle, Users, BarChart3, LineChart as LineChartIcon, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[150px] rounded-lg border border-border bg-popover/95 backdrop-blur-md px-3 py-2 text-sm text-popover-foreground shadow-soft-md">
        <div className="mb-2 font-semibold text-foreground">{label}</div>
        <div className="grid gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: entry.stroke || entry.fill }}
                />
                <span className="capitalize text-muted-foreground">
                  {entry.name === 'Planned' ? 'Prévu' : 'Livré'}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {entry.value}
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
  const [stats, setStats] = useState({ totalDelivered: 0, totalTarget: 0, activeTrucks: 0, alerts: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI Controls
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Load initial data (stats, projects)
  useEffect(() => {
    const loadInit = async () => {
       try {
         const [s, p] = await Promise.all([db.getStats(), db.getProjects()]);
         setStats(s);
         setProjects(p);
       } catch (e: any) {
         console.error('Error loading dashboard:', e.message || e);
       }
    };
    loadInit();
  }, []);

  // Load chart data whenever filter changes
  useEffect(() => {
    const loadChart = async () => {
      try {
        setLoading(true);
        const c = await db.getChartData(selectedProject);
        setChartData(c);
      } catch (e: any) {
        console.error('Error loading chart:', e.message || e);
      } finally {
        setLoading(false);
      }
    };
    loadChart();
  }, [selectedProject]);

  const completionRate = stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0;

  if (loading && projects.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Chargement du tableau de bord...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tableau de Bord Campagne</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-soft-xs border border-emerald-100 dark:border-emerald-800">
            Mise à jour en direct
          </span>
          <span className="text-sm text-muted-foreground">Dernière maj: À l'instant</span>
        </div>
      </div>

      {/* KPI Cards (Soft UI Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Livré" 
          value={`${stats.totalDelivered.toLocaleString()} T`} 
          subValue={`Cible: ${stats.totalTarget.toLocaleString()} T`}
          icon={CheckCircle} 
          variant="primary" 
        />
        <KpiCard 
          title="Taux de Réalisation" 
          value={`${completionRate.toFixed(1)}%`} 
          subValue="Progression"
          icon={TrendingUp} 
          variant="info" 
        />
        <KpiCard 
          title="Camions Actifs" 
          value={stats.activeTrucks} 
          subValue="En cours d'expédition"
          icon={Truck} 
          variant="warning" 
        />
        <KpiCard 
          title="Alertes" 
          value={stats.alerts} 
          subValue="Nécessite Attention"
          icon={AlertTriangle} 
          variant="danger" 
        />
      </div>

      {/* Main Chart Section (Soft UI Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Soft UI Chart Card */}
        <div className="lg:col-span-2 rounded-2xl bg-card text-card-foreground shadow-soft-xl border border-border/50 min-w-0 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 pb-2 gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground tracking-tight">Performance Régionale</h3>
              <p className="text-sm text-muted-foreground font-medium">Tonnage Prévu vs Livré</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Project Filter */}
              <div className="relative">
                <select 
                  className="h-9 rounded-lg border-0 bg-muted/50 px-3 py-1 text-sm text-foreground shadow-soft-xs focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer font-medium"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">Tous les Projets</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart Toggle */}
              <div className="flex items-center rounded-lg bg-muted/50 p-1 shadow-soft-xs">
                <button 
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-card text-foreground shadow-soft-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Graphique en Barres"
                >
                  <BarChart3 size={16} />
                </button>
                <button 
                  onClick={() => setChartType('line')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-card text-foreground shadow-soft-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Graphique en Aire"
                >
                  <LineChartIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 flex-1">
            <div className="h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    {/* Chart 2 (Secondary/Planned - Muted color) */}
                    <Bar dataKey="planned" name="Planned" fill="var(--muted)" radius={[6, 6, 0, 0]} barSize={20} />
                    {/* Chart 1 (Primary/Delivered - Primary color) */}
                    <Bar dataKey="delivered" name="Delivered" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                ) : (
                  <AreaChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--muted)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--muted)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    {/* Render Planned first so it's in the background if larger */}
                    <Area
                      type="monotone"
                      dataKey="planned"
                      name="Planned"
                      fill="url(#fillPlanned)"
                      stroke="var(--muted-foreground)"
                      strokeWidth={3}
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      name="Delivered"
                      fill="url(#fillDelivered)"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                 +5.2% <TrendingUp className="h-4 w-4" />
              </span>
              <span>augmentation de l'efficacité ce mois-ci</span>
            </div>
          </div>
        </div>

        {/* Quick Activity / Recent Feed (Soft UI Style) */}
        <div className="flex flex-col gap-6">
           {/* Shortcuts Card */}
          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border/50">
             <h2 className="text-lg font-bold text-foreground mb-4">Actions Rapides</h2>
             <Link 
               to="/settings" 
               className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all group border border-transparent"
             >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-tl from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-soft-md group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                   <h3 className="font-bold text-foreground">Gérer les Opérateurs</h3>
                   <p className="text-xs text-muted-foreground font-medium">Ajouter GIE ou opérateurs individuels</p>
                </div>
             </Link>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-soft-xl border border-border/50 flex-1">
            <h2 className="text-lg font-bold text-foreground mb-4">Activité Récente</h2>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                     <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-card shadow-soft-xs z-10">
                        <Truck size={14} />
                     </div>
                     {i !== 3 && <div className="w-0.5 h-full bg-muted my-1"></div>}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-bold text-foreground">Camion expédié</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">BL25000{i} • il y a 2h</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full py-2.5 text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
              Voir tout l'historique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, variant }: any) => {
  // Soft UI Gradients based on variant
  const gradients: any = {
    primary: "from-emerald-500 to-teal-400",
    info: "from-blue-500 to-violet-500",
    warning: "from-orange-500 to-yellow-400",
    danger: "from-red-600 to-rose-400",
  };

  const gradientClass = gradients[variant] || gradients.primary;

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-card shadow-soft-xl rounded-2xl bg-clip-border border border-border/50">
      <div className="flex-auto p-4">
        <div className="flex flex-row -mx-3">
          <div className="flex-none w-2/3 max-w-full px-3">
            <div>
              <p className="mb-0 font-sans font-semibold leading-normal text-sm text-muted-foreground">{title}</p>
              <h5 className="mb-0 font-bold text-xl text-foreground mt-1">
                {value}
              </h5>
              <p className="mb-0 leading-normal text-xs font-bold text-emerald-500 mt-1">{subValue}</p>
            </div>
          </div>
          <div className="px-3 text-right basis-1/3">
            <div className={`inline-block w-12 h-12 text-center rounded-lg bg-gradient-to-tl ${gradientClass} shadow-soft-md flex items-center justify-center`}>
               <Icon size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
