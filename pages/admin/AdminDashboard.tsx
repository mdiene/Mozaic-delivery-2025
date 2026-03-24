
import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { AdminPersonnel, AdminPoste } from '../../types';
import { 
  Users, UserCheck, UserPlus, Activity, TrendingUp, Briefcase, ShieldCheck, AlertCircle, RefreshCw, Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { motion } from 'motion/react';

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [postes, setPostes] = useState<AdminPoste[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [p, pers] = await Promise.all([
          db.getAdminPostes(),
          db.getAdminPersonnel()
        ]);
        setPostes(p);
        setPersonnel(pers);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Stats calculation
  const totalEmployees = personnel.length;
  const totalPostes = postes.length;
  
  const personnelByPoste = postes.map(poste => ({
    name: poste.titre_poste,
    count: personnel.filter(p => p.id_poste === poste.id_poste).length
  })).sort((a, b) => b.count - a.count);

  const personnelByCategorie = Array.from(new Set(postes.map(p => p.categorie_poste))).map(cat => ({
    name: cat,
    value: personnel.filter(p => {
      const poste = postes.find(pos => pos.id_poste === p.id_poste);
      return poste?.categorie_poste === cat;
    }).length
  }));

  const COLORS = ['#F27D26', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#eab308'];

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw size={48} className="animate-spin text-primary" />
        <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Chargement du dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Administration & RH</h1>
        <p className="text-muted-foreground text-sm">Vue d'ensemble du personnel et de l'organisation.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Effectif Total', value: totalEmployees, icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Postes Définis', value: totalPostes, icon: Briefcase, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Gestion Paie', value: 'Calculer', icon: Calculator, color: 'bg-emerald-500/10 text-emerald-500', link: '/admin/payroll' },
          { label: 'Taux Présence', value: '98%', icon: Activity, color: 'bg-purple-500/10 text-purple-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card p-6 rounded-3xl border border-border shadow-soft-xl relative group"
          >
            {stat.link && (
              <Link to={stat.link} className="absolute inset-0 z-10" />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-foreground">{stat.value}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribution par Poste */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-8 rounded-[2rem] border border-border shadow-soft-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Répartition par Poste
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personnelByPoste} layout="vertical" margin={{ left: 40 }}>
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
                <Bar dataKey="count" fill="#F27D26" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution par Catégorie */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-8 rounded-[2rem] border border-border shadow-soft-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              Structure de l'Organisation
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={personnelByCategorie}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {personnelByCategorie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity / Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border shadow-soft-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-border bg-muted/20">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-3">
              <Activity size={18} className="text-primary" />
              Derniers Mouvements
            </h3>
          </div>
          <div className="p-0">
            <table className="table w-full text-left">
              <thead className="bg-muted/10">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employé</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {personnel.slice(0, 5).map((p, i) => (
                  <tr key={i} className="hover:bg-muted/5 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {p.prenom.charAt(0)}{p.nom.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-foreground">{p.prenom} {p.nom}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="badge badge-soft badge-success text-[10px]">Recrutement</span>
                    </td>
                    <td className="px-8 py-4 text-xs text-muted-foreground font-mono">
                      04/03/2026
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-soft-xl">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-3 mb-6">
            <AlertCircle size={18} className="text-warning" />
            Alertes RH
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl">
              <p className="text-xs font-bold text-warning uppercase tracking-wider mb-1">Contrats à renouveler</p>
              <p className="text-sm text-foreground font-medium">3 employés arrivent en fin de période d'essai.</p>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Visites Médicales</p>
              <p className="text-sm text-foreground font-medium">8 visites médicales à programmer ce mois-ci.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
