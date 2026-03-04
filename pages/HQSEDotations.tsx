
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { 
  AdminPersonnel, EquipmentType, Equipment, EmployeeEndowment, HQSESafetyAudit 
} from '../types';
import { 
  Plus, Search, Filter, HardHat, Users, ClipboardCheck, AlertTriangle, 
  TrendingUp, Package, UserCheck, ShieldAlert, Camera, Save, X, 
  RefreshCw, CheckCircle2, AlertCircle, History, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export const HQSEDotations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'endowments' | 'audits'>('inventory');
  
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [endowments, setEndowments] = useState<EmployeeEndowment[]>([]);
  const [audits, setAudits] = useState<HQSESafetyAudit[]>([]);

  const [isEndowmentModalOpen, setIsEndowmentModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  
  const [selectedType, setSelectedType] = useState<EquipmentType | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pers, types, eqs, ends, auds] = await Promise.all([
        db.getAdminPersonnel(),
        db.getEquipmentTypes(),
        db.getEquipments(),
        db.getEmployeeEndowments(),
        db.getHQSESafetyAudits()
      ]);
      setPersonnel(pers);
      setEquipmentTypes(types);
      setEquipments(eqs);
      setEndowments(ends);
      setAudits(auds);
    } catch (e) {
      console.error('Error loading dotations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIncrementStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !formData.quantity) return;
    setSaving(true);
    try {
      const newTotal = (selectedType.total_stock_quantity || 0) + parseInt(formData.quantity);
      const newAvailable = (selectedType.available_stock_quantity || 0) + parseInt(formData.quantity);
      
      await db.updateItem('equipment_types', selectedType.id, {
        total_stock_quantity: newTotal,
        available_stock_quantity: newAvailable
      });
      
      setIsStockModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEndowment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.equipment_type_id) return;
    setSaving(true);
    try {
      const type = equipmentTypes.find(t => t.id === formData.equipment_type_id);
      if (!type || type.available_stock_quantity <= 0) {
        alert('Stock insuffisant pour cet équipement.');
        return;
      }

      // Calculate expected renewal date
      const assignedDate = new Date(formData.assigned_date || new Date());
      const renewalDate = new Date(assignedDate);
      renewalDate.setDate(renewalDate.getDate() + (type.renewal_cycle_days || 365));

      const payload = {
        ...formData,
        assigned_date: assignedDate.toISOString(),
        expected_renewal_date: renewalDate.toISOString(),
        status: 'Actif'
      };

      await db.createItem('employee_endowments', payload);
      
      // Decrement stock (Trigger simulation)
      await db.updateItem('equipment_types', type.id, {
        available_stock_quantity: type.available_stock_quantity - 1
      });

      setIsEndowmentModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        auditor_id: user?.id, // Assuming user.id is the auditor
        audit_date: new Date().toISOString()
      };

      await db.createItem('hqse_safety_compliance_audits', payload);

      // Workflow de Sanction: Si une sanction est saisie, générer un ticket
      if (formData.sanction_level && formData.sanction_level !== 'RAS') {
        await db.createItem('hqse_tickets', {
          register: 'sante',
          category: 'humain',
          title: `Sanction de sécurité - ${personnel.find(p => p.id_personnel === formData.employee_id)?.prenom} ${personnel.find(p => p.id_personnel === formData.employee_id)?.nom}`,
          description: `Sanction de niveau ${formData.sanction_level} appliquée lors d'un audit de sécurité. Motif: ${formData.observation_notes || 'Non respect des consignes de sécurité.'}`,
          status: 'Ouvert',
          severity: formData.sanction_level === 'Sanction lourde' ? 'Critique' : 'Majeure',
          declared_at: new Date().toISOString()
        });
      }

      setIsAuditModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw size={48} className="animate-spin text-primary" />
        <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Chargement des dotations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Dotations & Discipline</h1>
          <p className="text-muted-foreground text-sm">Suivi des équipements individuels et audits de sécurité terrain.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Inventaire
          </button>
          <button 
            onClick={() => setActiveTab('endowments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'endowments' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Affectations
          </button>
          <button 
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'audits' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Audits Terrain
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'inventory' && (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipmentTypes.map((type) => {
                const stockPercent = (type.available_stock_quantity / (type.total_stock_quantity || 1)) * 100;
                const isLowStock = type.available_stock_quantity < (type.total_stock_quantity * 0.1);
                
                return (
                  <div key={type.id} className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden group hover:shadow-soft-md transition-all">
                    <div className="p-6 border-b border-border flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{type.code}</span>
                        <h4 className="font-bold text-foreground">{type.label}</h4>
                      </div>
                      <div className={`p-2 rounded-xl ${isLowStock ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        <Package size={20} />
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-foreground">{type.available_stock_quantity}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Disponible</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-muted-foreground">/ {type.total_stock_quantity}</span>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Stock</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-muted-foreground">Niveau de stock</span>
                          <span className={isLowStock ? 'text-destructive' : 'text-success'}>{Math.round(stockPercent)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isLowStock ? 'bg-destructive' : 'bg-success'}`}
                            style={{ width: `${stockPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {isLowStock && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/10 rounded-xl animate-pulse">
                          <AlertTriangle size={14} className="text-destructive" />
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Alerte: Stock Critique (&lt;10%)</span>
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-4 bg-muted/30 flex justify-end">
                      {!isVisitor && (
                        <button 
                          onClick={() => {
                            setSelectedType(type);
                            setFormData({ quantity: '' });
                            setIsStockModalOpen(true);
                          }}
                          className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus size={14} /> Réapprovisionner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'endowments' && (
          <motion.div 
            key="endowments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <UserCheck className="text-primary" size={24} />
                Registre des Affectations Individuelles
              </h3>
              {!isVisitor && (
                <button 
                  onClick={() => {
                    setFormData({ assigned_date: new Date().toISOString().split('T')[0] });
                    setIsEndowmentModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Nouvelle Affectation
                </button>
              )}
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employé</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Affectation</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Renouvellement Prévu</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {endowments.map((end) => {
                      const isOverdue = new Date(end.expected_renewal_date) < new Date();
                      return (
                        <tr key={end.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {end.employee_name?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm font-bold text-foreground">{end.employee_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-foreground">{end.equipment_type_label}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                            {new Date(end.assigned_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                {new Date(end.expected_renewal_date).toLocaleDateString()}
                              </span>
                              {isOverdue && <AlertCircle size={14} className="text-destructive" />}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`badge badge-soft text-[10px] ${
                              end.status === 'Actif' ? 'badge-success' : 
                              end.status === 'Perdu' ? 'badge-error' : 
                              'badge-warning'
                            }`}>
                              {end.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'audits' && (
          <motion.div 
            key="audits"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <ShieldAlert className="text-primary" size={24} />
                Contrôles de Conformité & Discipline
              </h3>
              {!isVisitor && (
                <button 
                  onClick={() => {
                    setFormData({ is_usage_respected: true, has_loss_occurred: false, number_of_items: 1 });
                    setIsAuditModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Nouvel Audit Terrain
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {audits.map((audit) => (
                <div key={audit.id} className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden group">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {audit.employee_name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{audit.employee_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{new Date(audit.audit_date).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`badge text-[10px] font-black uppercase ${
                      audit.sanction_level === 'RAS' ? 'bg-success/10 text-success border-success/20' : 
                      audit.sanction_level === 'Avertissement' ? 'bg-warning/10 text-warning border-warning/20' : 
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {audit.sanction_level || 'RAS'}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold tracking-widest">Usage respecté</span>
                      {audit.is_usage_respected ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : (
                        <X size={18} className="text-destructive" />
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold tracking-widest">Matériel perdu</span>
                      <span className={`font-bold ${audit.has_loss_occurred ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {audit.has_loss_occurred ? 'OUI' : 'NON'}
                      </span>
                    </div>
                    {audit.observation_notes && (
                      <div className="p-3 bg-muted/30 rounded-xl text-[11px] text-muted-foreground italic">
                        "{audit.observation_notes}"
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-4 bg-muted/30 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Auditeur: {audit.auditor_name}</span>
                    <button className="text-primary hover:underline text-[10px] font-bold uppercase tracking-widest">Voir Rapport</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {/* Stock Modal */}
        {isStockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsStockModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-primary/5">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <Package className="text-primary" size={24} />
                  Réapprovisionnement
                </h3>
                <button onClick={() => setIsStockModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleIncrementStock} className="p-8 space-y-6">
                <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Équipement</p>
                  <p className="text-sm font-bold text-foreground">{selectedType?.label}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantité à ajouter</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.quantity || ''} 
                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                    placeholder="Ex: 50" 
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Mettre à jour le stock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Endowment Modal */}
        {isEndowmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEndowmentModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-primary/5">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <UserCheck className="text-primary" size={24} />
                  Nouvelle Affectation
                </h3>
                <button onClick={() => setIsEndowmentModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveEndowment} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employé bénéficiaire</label>
                  <select 
                    required 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.employee_id || ''} 
                    onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  >
                    <option value="">Sélectionner un employé...</option>
                    {personnel.map(p => <option key={p.id_personnel} value={p.id_personnel}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type d'équipement</label>
                  <select 
                    required 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.equipment_type_id || ''} 
                    onChange={e => setFormData({...formData, equipment_type_id: e.target.value})}
                  >
                    <option value="">Sélectionner l'équipement...</option>
                    {equipmentTypes.map(t => (
                      <option key={t.id} value={t.id} disabled={t.available_stock_quantity <= 0}>
                        {t.label} ({t.available_stock_quantity} dispo)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date d'affectation</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.assigned_date || ''} 
                    onChange={e => setFormData({...formData, assigned_date: e.target.value})} 
                  />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <History size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Renouvellement Automatique</span>
                    <span className="text-xs text-muted-foreground">La date de renouvellement sera calculée selon la durée de vie de l'équipement.</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsEndowmentModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Confirmer l'affectation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Audit Modal */}
        {isAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAuditModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <ShieldAlert className="text-primary" size={24} />
                  Audit de Sécurité Terrain
                </h3>
                <button onClick={() => setIsAuditModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveAudit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employé contrôlé</label>
                  <select 
                    required 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.employee_id || ''} 
                    onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  >
                    <option value="">Sélectionner un employé...</option>
                    {personnel.map(p => <option key={p.id_personnel} value={p.id_personnel}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Usage respecté ?</label>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, is_usage_respected: true})}
                        className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${formData.is_usage_respected ? 'bg-success/10 border-success text-success shadow-sm' : 'border-border text-muted-foreground'}`}
                      >
                        OUI
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, is_usage_respected: false})}
                        className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${!formData.is_usage_respected ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' : 'border-border text-muted-foreground'}`}
                      >
                        NON
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Matériel perdu ?</label>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, has_loss_occurred: !formData.has_loss_occurred})}
                      className={`w-full py-3 rounded-xl border font-bold text-xs transition-all ${formData.has_loss_occurred ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' : 'border-border text-muted-foreground'}`}
                    >
                      {formData.has_loss_occurred ? 'OUI (PERDU)' : 'NON'}
                    </button>
                  </div>
                </div>

                {/* Sanction Logic */}
                {(!formData.is_usage_respected || formData.has_loss_occurred) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-destructive uppercase tracking-widest">Niveau de Sanction</label>
                      <select 
                        required 
                        className="w-full bg-background border border-destructive/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-destructive/20 outline-none" 
                        value={formData.sanction_level || ''} 
                        onChange={e => setFormData({...formData, sanction_level: e.target.value})}
                      >
                        <option value="">Sélectionner une sanction...</option>
                        <option value="RAS">RAS (Simple rappel)</option>
                        <option value="Avertissement">Avertissement</option>
                        <option value="Sanction lourde">Sanction lourde</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-destructive uppercase tracking-widest">Photo du rapport / Preuve</label>
                      <div className="border-2 border-dashed border-destructive/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-destructive/60 hover:bg-destructive/5 transition-all cursor-pointer">
                        <Camera size={32} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Prendre une photo</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Observations / Notes</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
                    value={formData.observation_notes || ''} 
                    onChange={e => setFormData({...formData, observation_notes: e.target.value})} 
                    placeholder="Détails du contrôle..." 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsAuditModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer l'Audit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
