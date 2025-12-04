import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { TrendingUp, Truck, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const [stats, setStats] = useState({ totalDelivered: 0, totalTarget: 0, activeTrucks: 0, alerts: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const s = await db.getStats();
        const c = await db.getChartData();
        setStats(s);
        setChartData(c);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const completionRate = stats.totalTarget > 0 ? (stats.totalDelivered / stats.totalTarget) * 100 : 0;

  if (loading) {
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
        <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm min-w-0">
          <h2 className="text-lg font-semibold text-foreground mb-6">Regional Performance</h2>
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    backgroundColor: 'var(--card)',
                    color: 'var(--foreground)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                />
                <Bar dataKey="planned" name="Planned Quota" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.3} />
                <Bar dataKey="delivered" name="Actual Delivered" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
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
        <div className={`p-3 rounded-lg ${iconClass}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};
