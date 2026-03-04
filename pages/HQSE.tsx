
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ClipboardCheck, 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Filter,
  HardHat,
  RefreshCw,
  FileWarning,
  Stethoscope,
  Flame,
  Droplets,
  Zap,
  UserCheck,
  Cpu,
  Truck,
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  Globe,
  X,
  Info,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import { db } from '../services/db';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';
import { 
  Equipment, 
  EquipmentType, 
  HQSEInspection, 
  HQSEInspectionPlan, 
  HQSENonConformity, 
  HQSECorrectiveAction,
  AdminPersonnel
} from '../types';
import { useAuth } from '../contexts/AuthContext';

export const HQSEPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inspections' | 'equipments' | 'tickets'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [inspectionPlans, setInspectionPlans] = useState<HQSEInspectionPlan[]>([]);
  const [inspections, setInspections] = useState<HQSEInspection[]>([]);
  const [nonConformities, setNonConformities] = useState<HQSENonConformity[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<HQSECorrectiveAction[]>([]);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);

  // Modal States
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [ticketData, setTicketData] = useState<any>({
    register: 'sante',
    category: 'humain',
    equipment_id: '',
    severity: 'Majeure',
    description: ''
  });

  // Form State
  const [formData, setFormData] = useState<Partial<Equipment>>({
    ref_code: '',
    name: '',
    category: '',
    serial_number: '',
    location: '',
    commissioning_date: '',
    status: 'Actif',
    responsible_user_id: '',
    type_id: ''
  });

  const isVisitor = user?.role === 'VISITOR';

  const loadHQSEData = async () => {
    try {
      setLoading(true);
      const [eq, plans, insp, nc, ca, pers, types] = await Promise.all([
        db.getEquipments(),
        db.getHQSEInspectionPlans(),
        db.getHQSEInspections(),
        db.getHQSENonConformities(),
        db.getHQSECorrectiveActions(),
        db.getAdminPersonnel(),
        db.getEquipmentTypes()
      ]);
      setEquipments(eq);
      setInspectionPlans(plans);
      setInspections(insp);
      setNonConformities(nc);
      setCorrectiveActions(ca);
      setPersonnel(pers);
      setEquipmentTypes(types);
    } catch (e) {
      console.error('Error loading HQSE data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHQSEData();
  }, []);

  const handleOpenAddModal = () => {
    // Generate automatic reference code
    const prefix = 'EQ-';
    const existingCodes = equipments
      .map(e => e.ref_code)
      .filter(code => code.startsWith(prefix));
    
    let nextNum = 1;
    if (existingCodes.length > 0) {
      const nums = existingCodes
        .map(code => parseInt(code.replace(prefix, ''), 10))
        .filter(num => !isNaN(num));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }
    const generatedRef = `${prefix}${nextNum.toString().padStart(3, '0')}`;

    setModalMode('add');
    setFormData({
      ref_code: generatedRef,
      name: '',
      category: '',
      serial_number: '',
      location: '',
      commissioning_date: '',
      status: 'Actif',
      responsible_user_id: '',
      type_id: ''
    });
    setIsEquipmentModalOpen(true);
  };

  const handleOpenEditModal = (eq: Equipment) => {
    setModalMode('edit');
    setSelectedEquipment(eq);
    setFormData({
      ref_code: eq.ref_code,
      name: eq.name,
      category: eq.category,
      serial_number: eq.serial_number,
      location: eq.location,
      commissioning_date: eq.commissioning_date,
      status: eq.status,
      responsible_user_id: eq.responsible_user_id,
      type_id: eq.type_id
    });
    setIsEquipmentModalOpen(true);
  };

  const handleOpenDetailModal = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setIsDetailModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ref_code || !formData.name) return;

    try {
      setFormLoading(true);
      if (modalMode === 'add') {
        await db.createItem('equipments', formData);
      } else if (selectedEquipment) {
        await db.updateItem('equipments', selectedEquipment.id, formData);
      }
      setIsEquipmentModalOpen(false);
      await loadHQSEData();
    } catch (err) {
      console.error('Error saving equipment:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData.description) return;

    try {
      setFormLoading(true);
      await db.createItem('hqse_tickets', {
        ...ticketData,
        title: `Signalement ${ticketData.register} - ${new Date().toLocaleDateString()}`,
        status: 'Ouvert',
        declared_at: new Date().toISOString()
      });
      
      setTicketData({
        register: 'sante',
        category: 'humain',
        equipment_id: '',
        severity: 'Majeure',
        description: ''
      });
      
      alert('Signalement enregistré avec succès.');
    } catch (e) {
      console.error('Error saving ticket:', e);
      alert('Erreur lors de l\'enregistrement du signalement.');
    } finally {
      setFormLoading(false);
    }
  };

  const typeOptions: Option[] = equipmentTypes.map(t => ({
    value: t.id,
    label: t.label,
    subLabel: t.code
  }));

  const personnelOptions: Option[] = personnel.map(p => ({
    value: p.id_personnel,
    label: `${p.prenom} ${p.nom}`,
    subLabel: p.poste_titre
  }));

  // Helper: Calculate days overdue
  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalPlans = inspectionPlans.length;
    const overdueCount = inspectionPlans.filter(p => p.next_due_date && getDaysOverdue(p.next_due_date) < 0).length;
    const complianceRate = totalPlans > 0 ? ((totalPlans - overdueCount) / totalPlans) * 100 : 100;
    const criticalNC = nonConformities.filter(nc => nc.severity === 'Critique' && nc.status !== 'Résolu').length;

    return {
      complianceRate,
      overdueCount,
      criticalNC
    };
  }, [inspectionPlans, nonConformities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Chargement du module HQSE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary" size={28} />
            Gestion HQSE & Conformité
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Pilotage de la sécurité, maintenance et conformité réglementaire</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border shadow-sm">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('inspections')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inspections' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Contrôles
          </button>
          <button 
            onClick={() => setActiveTab('equipments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'equipments' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Équipements
          </button>
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'tickets' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Signalement
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taux de Conformité VGP</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.complianceRate.toFixed(1)}%</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${stats.complianceRate}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-success">Objectif 100%</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shadow-lg shadow-success/10">
                    <ClipboardCheck size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-destructive/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contrôles en Retard</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.overdueCount}</h3>
                    <p className="text-[10px] font-bold text-destructive flex items-center gap-1">
                      <Clock size={12} /> Action requise immédiate
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-lg shadow-destructive/10">
                    <Clock size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Anomalies Critiques</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.criticalNC}</h3>
                    <p className="text-[10px] font-bold text-warning flex items-center gap-1">
                      <AlertTriangle size={12} /> Non-conformités ouvertes
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shadow-lg shadow-warning/10">
                    <FileWarning size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Prochains Contrôles Table */}
            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Prochains Contrôles & VGP</h3>
                </div>
                <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Voir tout l'échéancier <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Réf</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Objet lié</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dernier Contrôle</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Échéance</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Retard</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inspectionPlans.map((plan) => {
                      const overdue = plan.next_due_date ? getDaysOverdue(plan.next_due_date) : 0;
                      return (
                        <tr key={plan.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                              {plan.equipment_ref || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{plan.equipment_name}</span>
                              <span className="text-[10px] text-muted-foreground font-medium">S/N: {equipments.find(e => e.id === plan.equipment_id)?.serial_number || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-muted-foreground">{plan.inspection_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-muted-foreground font-medium">{plan.last_inspection_date || 'Jamais'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-foreground">{plan.next_due_date || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            {overdue < 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-tighter border border-destructive/20">
                                <AlertTriangle size={10} /> {overdue} Jours
                              </span>
                            ) : overdue < 15 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-[10px] font-black uppercase tracking-tighter border border-warning/20">
                                <Clock size={10} /> {overdue} Jours
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-tighter border border-success/20">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground group-hover:text-primary">
                              <MoreHorizontal size={18} />
                            </button>
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

        {activeTab === 'tickets' && (
          <motion.div 
            key="tickets"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="p-8 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <FileWarning className="text-primary" size={24} />
                  Créer un Ticket / Signalement HQSE
                </h3>
                <p className="text-muted-foreground text-sm mt-1">Enregistrement d'un incident, danger ou non-conformité</p>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Register Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Registre de l'événement</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {[
                      { id: 'accident', label: 'Accident', icon: UserCheck, color: 'text-destructive', bg: 'bg-destructive/10' },
                      { id: 'sante', label: 'Santé', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10' },
                      { id: 'danger', label: 'Danger', icon: Flame, color: 'text-warning', bg: 'bg-warning/10' },
                      { id: 'qualite', label: 'Qualité', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-primary/10' },
                      { id: 'environnement', label: 'Environnement', icon: Droplets, color: 'text-success', bg: 'bg-success/10' },
                    ].map((item) => (
                      <button 
                        key={item.id}
                        type="button"
                        onClick={() => setTicketData({...ticketData, register: item.id})}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all group ${ticketData.register === item.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                      >
                        <div className={`h-12 w-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform ${ticketData.register === item.id ? 'scale-110 shadow-lg' : ''}`}>
                          <item.icon size={24} />
                        </div>
                        <span className={`text-xs font-bold ${ticketData.register === item.id ? 'text-primary' : 'text-foreground'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pertinence Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pertinence / Origine</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { id: 'materiel', label: 'Matériel', icon: Wrench },
                      { id: 'humain', label: 'Humain', icon: User },
                      { id: 'organisationnel', label: 'Organisation', icon: Activity },
                      { id: 'externe', label: 'Externe', icon: Globe },
                    ].map((item) => (
                      <button 
                        key={item.id}
                        type="button"
                        onClick={() => setTicketData({...ticketData, category: item.id})}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${ticketData.category === item.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${ticketData.category === item.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground group-hover:text-primary'}`}>
                          <item.icon size={20} />
                        </div>
                        <span className={`text-xs font-bold ${ticketData.category === item.id ? 'text-primary' : 'text-foreground'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSaveTicket} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement concerné</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={ticketData.equipment_id || ''}
                      onChange={e => setTicketData({...ticketData, equipment_id: e.target.value})}
                    >
                      <option value="">Sélectionner un équipement...</option>
                      {equipments.map(e => <option key={e.id} value={e.id}>{e.ref_code} - {e.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gravité</label>
                    <div className="flex gap-2">
                      {['Mineure', 'Majeure', 'Critique'].map(s => (
                        <button 
                          key={s} 
                          type="button"
                          onClick={() => setTicketData({...ticketData, severity: s})}
                          className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${ticketData.severity === s ? 'bg-primary text-white border-primary shadow-md' : 'border-border hover:bg-secondary'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description détaillée</label>
                    <textarea 
                      rows={4}
                      required
                      placeholder="Décrivez l'incident ou l'anomalie constatée..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      value={ticketData.description || ''}
                      onChange={e => setTicketData({...ticketData, description: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-4">
                    <button 
                      type="submit"
                      disabled={formLoading}
                      className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {formLoading ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                      Déclarer le Signalement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'equipments' && (
          <motion.div 
            key="equipments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipments.map((eq) => (
                <div key={eq.id} className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden group hover:shadow-soft-md transition-all">
                  <div className="p-6 border-b border-border flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{eq.ref_code}</span>
                      <h4 className="font-bold text-foreground">{eq.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{eq.type_label}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      eq.status === 'Actif' ? 'bg-success/10 text-success' : 
                      eq.status === 'Maintenance' ? 'bg-warning/10 text-warning' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {eq.status}
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <MapPin size={14} className="text-primary" />
                      <span>{eq.location || 'Localisation non définie'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <User size={14} className="text-primary" />
                      <span>Resp: {eq.responsible_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Activity size={14} className="text-primary" />
                      <span>S/N: {eq.serial_number || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-muted/30 flex justify-between items-center">
                    <button 
                      onClick={() => handleOpenDetailModal(eq)}
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                    >
                      Détails Fiche
                    </button>
                    <div className="flex items-center gap-1">
                      {!isVisitor && (
                        <button 
                          onClick={() => handleOpenEditModal(eq)}
                          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                        <Wrench size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Equipment Placeholder */}
              {!isVisitor && (
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-background border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary hover:text-primary transition-all group"
                >
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Ajouter un Équipement</p>
                    <p className="text-xs">Enregistrer une nouvelle fiche machine ou EPI</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'inspections' && (
          <motion.div 
            key="inspections"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ClipboardCheck className="text-primary" size={20} />
                  Historique des Contrôles & Vérifications
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input type="text" placeholder="Rechercher un contrôle..." className="pl-9 pr-4 py-1.5 bg-secondary/50 border-none rounded-lg text-xs outline-none w-64" />
                  </div>
                  <button className="p-2 rounded-lg bg-primary text-white shadow-md shadow-primary/20">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contrôleur</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verdict</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Commentaires</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rapport</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium">{insp.inspection_date}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{insp.equipment_name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{insp.equipment_ref}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{insp.inspector_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                            insp.verdict === 'OK' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {insp.verdict === 'OK' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {insp.verdict}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{insp.comments || '-'}</td>
                        <td className="px-6 py-4">
                          <button className="text-primary hover:underline text-xs font-bold">PDF</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equipment Add/Edit Modal */}
      <AnimatePresence>
        {isEquipmentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEquipmentModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  {modalMode === 'add' ? <Plus className="text-primary" size={24} /> : <Edit2 className="text-primary" size={24} />}
                  {modalMode === 'add' ? 'Ajouter un Équipement' : 'Modifier l\'Équipement'}
                </h3>
                <button 
                  onClick={() => setIsEquipmentModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEquipment}>
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                  {/* Mandatory Caption */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/20 rounded-xl">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Les champs marqués d'un <span className="text-destructive">*</span> sont obligatoires</span>
                  </div>

                  {/* Section 1: Identification */}
                  <div className="space-y-4 p-6 bg-muted/20 rounded-2xl border border-border/50">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Identification de l'équipement
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            Référence <span className="text-destructive">*</span>
                          </label>
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-tighter">Auto</span>
                        </div>
                        <input 
                          required
                          type="text" 
                          value={formData.ref_code}
                          onChange={e => setFormData({...formData, ref_code: e.target.value})}
                          placeholder="Ex: EQ-001" 
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          Nom de l'équipement <span className="text-destructive">*</span>
                        </label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="Ex: Groupe Électrogène" 
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          Type d'équipement <span className="text-destructive">*</span>
                        </label>
                        <AdvancedSelect 
                          options={typeOptions}
                          value={formData.type_id || ''}
                          onChange={val => setFormData({...formData, type_id: val})}
                          placeholder="Sélectionner un type..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          Responsable <span className="text-destructive">*</span>
                        </label>
                        <AdvancedSelect 
                          options={personnelOptions}
                          value={formData.responsible_user_id || ''}
                          onChange={val => setFormData({...formData, responsible_user_id: val})}
                          placeholder="Sélectionner un responsable..."
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Détails Techniques */}
                  <div className="space-y-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Détails Techniques & Localisation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">N° de Série</label>
                        <input 
                          type="text" 
                          value={formData.serial_number || ''}
                          onChange={e => setFormData({...formData, serial_number: e.target.value})}
                          placeholder="Ex: SN-123456" 
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Localisation</label>
                        <input 
                          type="text" 
                          value={formData.location || ''}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                          placeholder="Ex: Zone A - Entrepôt" 
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date de mise en service</label>
                        <input 
                          type="date" 
                          value={formData.commissioning_date || ''}
                          onChange={e => setFormData({...formData, commissioning_date: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Statut</label>
                        <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          <option value="Actif">Actif</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Inactif">Inactif</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-border flex justify-end gap-3 bg-muted/20">
                  <button 
                    type="button"
                    onClick={() => setIsEquipmentModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
                    {modalMode === 'add' ? 'Enregistrer' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Equipment Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedEquipment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Info size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{selectedEquipment.name}</h3>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedEquipment.ref_code}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                {/* Section 1: Infos Générales */}
                <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-6">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    Informations Générales
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</p>
                      <p className="text-sm font-bold text-foreground">{selectedEquipment.type_label || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Statut</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedEquipment.status === 'Actif' ? 'bg-success/10 text-success' : 
                        selectedEquipment.status === 'Maintenance' ? 'bg-warning/10 text-warning' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {selectedEquipment.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">N° de Série</p>
                      <p className="text-sm font-medium text-foreground">{selectedEquipment.serial_number || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mise en service</p>
                      <p className="text-sm font-medium text-foreground">{selectedEquipment.commissioning_date || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Localisation & Responsabilité */}
                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    Localisation & Responsabilité
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Localisation</p>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin size={14} className="text-primary" />
                        {selectedEquipment.location || 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Responsable</p>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User size={14} className="text-primary" />
                        {selectedEquipment.responsible_name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Historique */}
                <div className="p-6 bg-secondary/20 rounded-2xl border border-border/50 space-y-6">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    Derniers Contrôles
                  </h4>
                  <div className="space-y-2">
                    {inspections.filter(i => i.equipment_id === selectedEquipment.id).slice(0, 3).map(insp => (
                      <div key={insp.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${insp.verdict === 'OK' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {insp.verdict === 'OK' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{insp.inspection_date}</p>
                            <p className="text-[10px] text-muted-foreground">{insp.inspector_name}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold ${insp.verdict === 'OK' ? 'text-success' : 'text-destructive'}`}>{insp.verdict}</span>
                      </div>
                    ))}
                    {inspections.filter(i => i.equipment_id === selectedEquipment.id).length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Aucun historique de contrôle</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border bg-muted/20 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Tooltip for Industrial Look */}
      <style>{`
        .shadow-soft-sm {
          box-shadow: 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
        }
        .shadow-soft-md {
          box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
