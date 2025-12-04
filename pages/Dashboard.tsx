import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { TrendingUp, Truck, AlertTriangle, CheckCircle } from 'lucide-react';

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
    return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Campaign Dashboard</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-200">
            Live Updates
          </span>
          <span className="text-sm text-slate-500">Last updated: Just now</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Delivered" 
          value={`${stats.totalDelivered.toLocaleString()} T`} 
          subValue={`Target: ${stats.totalTarget.toLocaleString()} T`}
          icon={CheckCircle} 
          color="emerald" 
        />
        <KpiCard 
          title="Completion Rate" 
          value={`${completionRate.toFixed(1)}%`} 
          subValue="Campaign Progress"
          icon={TrendingUp} 
          color="blue" 
        />
        <KpiCard 
          title="Active Trucks" 
          value={stats.activeTrucks} 
          subValue="Currently Dispatched"
          icon={Truck} 
          color="indigo" 
        />
        <KpiCard 
          title="Alerts" 
          value={stats.alerts} 
          subValue="Requires Attention"
          icon={AlertTriangle} 
          color="amber" 
        />
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Regional Performance</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="planned" name="Planned Quota" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="delivered" name="Actual Delivered" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Activity / Recent Feed */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Truck size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Truck dispatched</p>
                  <p className="text-xs text-slate-400">BL25000{i} • 2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium">
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, subValue, icon: Icon, color }: any) => {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          <p className="text-xs text-slate-400 mt-1">{subValue}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};