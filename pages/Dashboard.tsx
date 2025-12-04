
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { TrendingUp, Truck, AlertTriangle, CheckCircle, Users, BarChart3, LineChart as LineChartIcon, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[150px] rounded-lg border-0 bg-white/90 backdrop-blur-md px-3 py-2 text-sm text-slate-700 shadow-soft-md">
        <div className="mb-2 font-semibold text-slate-800">{label}</div>
        <div className="grid gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: entry.stroke || entry.fill }}
                />
                <span className="capitalize text-slate-500">
                  {entry.name}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-700">
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
    return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-700">Campaign Dashboard</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold shadow-soft-xs">
            Live Updates
          </span>
          <span className="text-sm text-slate-400">Last updated: Just now</span>
        </div>
      </div>

      {/* KPI Cards (Soft UI Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Delivered" 
          value={`${stats.totalDelivered.toLocaleString()} T`} 
          subValue={`Target: ${stats.totalTarget.toLocaleString()} T`}
          icon={CheckCircle} 
          variant="primary" 
        />
        <KpiCard 
          title="Completion Rate" 
          value={`${completionRate.toFixed(1)}%`} 
          subValue="Campaign Progress"
          icon={TrendingUp} 
          variant="info" 
        />
        <KpiCard 
          title="Active Trucks" 
          value={stats.activeTrucks} 
          subValue="Currently Dispatched"
          icon={Truck} 
          variant="warning" 
        />
        <KpiCard 
          title="Alerts" 
          value={stats.alerts} 
          subValue="Requires Attention"
          icon={AlertTriangle} 
          variant="danger" 
        />
      </div>

      {/* Main Chart Section (Soft UI Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Soft UI Chart Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white text-slate-700 shadow-soft-xl border-0 min-w-0 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 pb-2 gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-700 tracking-tight">Regional Performance</h3>
              <p className="text-sm text-slate-400 font-medium">Planned vs Actual Delivery Tonnage</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Project Filter */}
              <div className="relative">
                <select 
                  className="h-9 rounded-lg border-0 bg-slate-50 px-3 py-1 text-sm text-slate-600 shadow-soft-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer font-medium"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart Toggle */}
              <div className="flex items-center rounded-lg bg-slate-50 p-1 shadow-soft-xs">
                <button 
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-slate-700 shadow-soft-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Bar Chart"
                >
                  <BarChart3 size={16} />
                </button>
                <button 
                  onClick={() => setChartType('line')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white text-slate-700 shadow-soft-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Area Chart"
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
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.4)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    {/* Chart 2 (Secondary/Planned - Indigo-ish in shadcn, we use Slate-400 here for soft look) */}
                    <Bar dataKey="planned" name="Planned" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={20} />
                    {/* Chart 1 (Primary/Delivered - Emerald Gradient Simulation) */}
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
                        <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.4)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    {/* Render Planned first so it's in the background if larger */}
                    <Area
                      type="monotone"
                      dataKey="planned"
                      name="Planned"
                      fill="url(#fillPlanned)"
                      stroke="#94a3b8"
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
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                 +5.2% <TrendingUp className="h-4 w-4" />
              </span>
              <span>increase in delivery efficiency this month</span>
            </div>
          </div>
        </div>

        {/* Quick Activity / Recent Feed (Soft UI Style) */}
        <div className="flex flex-col gap-6">
           {/* Shortcuts Card */}
          <div className="bg-white p-6 rounded-2xl shadow-soft-xl border-0">
             <h2 className="text-lg font-bold text-slate-700 mb-4">Quick Actions</h2>
             <Link 
               to="/settings" 
               className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-white hover:shadow-soft-md transition-all group border border-transparent"
             >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-tl from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-soft-md group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                   <h3 className="font-bold text-slate-700">Manage Operators</h3>
                   <p className="text-xs text-slate-400 font-medium">Add new GIE or individual operators</p>
                </div>
             </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-soft-xl border-0 flex-1">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Recent Activity</h2>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                     <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-white shadow-soft-xs z-10">
                        <Truck size={14} />
                     </div>
                     {i !== 3 && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-bold text-slate-700">Truck dispatched</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">BL25000{i} • 2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full py-2.5 text-xs uppercase font-bold tracking-wider text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              View All Logs
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
    <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
        <div className="flex flex-row -mx-3">
          <div className="flex-none w-2/3 max-w-full px-3">
            <div>
              <p className="mb-0 font-sans font-semibold leading-normal text-sm text-slate-400">{title}</p>
              <h5 className="mb-0 font-bold text-xl text-slate-700 mt-1">
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
