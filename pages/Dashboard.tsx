
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { TrendingUp, Truck, AlertTriangle, CheckCircle, Users, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[150px] rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
        <div className="mb-2 font-semibold text-foreground">{label}</div>
        <div className="grid gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-[2px]" 
                  style={{ backgroundColor: entry.stroke || entry.fill }}
                />
                <span className="capitalize text-muted-foreground">
                  {entry.name}
                </span>
              </div>
              <span className="font-mono font-medium text-foreground">
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
    return <div className="p-8 text-center text-muted-foreground">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Campaign Dashboard</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            Live Updates
          </span>
          <span className="text-sm text-muted-foreground">Last updated: Just now</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Delivered" 
          value={`${stats.totalDelivered.toLocaleString()} T`} 
          subValue={`Target: ${stats.totalTarget.toLocaleString()} T`}
          icon={CheckCircle} 
          variant="success" 
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
          variant="primary" 
        />
        <KpiCard 
          title="Alerts" 
          value={stats.alerts} 
          subValue="Requires Attention"
          icon={AlertTriangle} 
          variant="warning" 
        />
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Shadcn Style Chart Card */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card text-card-foreground shadow-sm min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
            <div className="space-y-1.5">
              <h3 className="font-semibold leading-none tracking-tight">Regional Performance</h3>
              <p className="text-sm text-muted-foreground">Planned vs Actual Delivery Tonnage</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Project Filter */}
              <div className="relative">
                <select 
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <div className="flex items-center rounded-md border border-input bg-background p-1 shadow-sm">
                <button 
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-sm transition-all ${chartType === 'bar' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                  title="Bar Chart"
                >
                  <BarChart3 size={16} />
                </button>
                <button 
                  onClick={() => setChartType('line')}
                  className={`p-1.5 rounded-sm transition-all ${chartType === 'line' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                  title="Area Chart"
                >
                  <LineChartIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0">
            <div className="h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    {/* Chart 2 (Secondary/Planned - Indigo) */}
                    <Bar dataKey="planned" name="Planned" fill="var(--chart-2)" radius={4} />
                    {/* Chart 1 (Primary/Delivered - Emerald) */}
                    <Bar dataKey="delivered" name="Delivered" fill="var(--chart-1)" radius={4} />
                  </BarChart>
                ) : (
                  <AreaChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    {/* Render Planned first so it's in the background if larger */}
                    <Area
                      type="natural"
                      dataKey="planned"
                      name="Planned"
                      fill="url(#fillPlanned)"
                      stroke="var(--chart-2)"
                      fillOpacity={0.4}
                    />
                    <Area
                      type="natural"
                      dataKey="delivered"
                      name="Delivered"
                      fill="url(#fillDelivered)"
                      stroke="var(--chart-1)"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex items-center p-6 pt-0 border-t border-border mt-4">
            <div className="flex w-full gap-2 text-sm pt-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 font-medium leading-none">
                  Campaign trending up by 5.2% <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 leading-none text-muted-foreground">
                  Showing delivery performance across selected regions and phase
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Activity / Recent Feed */}
        <div className="flex flex-col gap-6">
           {/* Shortcuts Card */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
             <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
             <Link 
               to="/settings" 
               className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors group"
             >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Users size={20} />
                </div>
                <div>
                   <h3 className="font-medium text-foreground">Manage Operators</h3>
                   <p className="text-xs text-muted-foreground">Add new GIE or individual operators</p>
                </div>
             </Link>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Truck size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Truck dispatched</p>
                    <p className="text-xs text-muted-foreground">BL25000{i} • 2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium">
              View All Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, variant }: any) => {
  // Mapping variants to semantic classes
  const colors: any = {
    success: "bg-primary/10 text-primary",
    info: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/10 text-primary",
    warning: "bg-orange-100 text-orange-600", // Hardcoded fallback for now or need semantic warning
  };

  // Override warning if we want strictly semantic
  const iconClass = variant === 'warning' 
    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
    : colors[variant] || "bg-muted text-muted-foreground";

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        </div>
        <div className="p-3 rounded-lg flex items-center justify-center">
           <div className={`p-2 rounded-md ${iconClass}`}>
              <Icon size={20} />
           </div>
        </div>
      </div>
    </div>
  );
};
