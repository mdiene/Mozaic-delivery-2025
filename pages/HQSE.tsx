
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
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
  Save,
  CheckCircle,
  AlertCircle,
  History
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
  AdminPersonnel,
  HQSESignalement
} from '../types';
import { useAuth } from '../contexts/AuthContext';

const RangeSlider = ({ min, max, value, onChange }: { min: number, max: number, value: [number, number], onChange: (val: [number, number]) => void }) => {
  const getDayLabel = (day: number) => {
    const date = new Date(new Date().getFullYear(), 0, day);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative h-1.5 rounded-full bg-neutral/10 mt-8 mb-12 mx-2">
      <div 
        className="absolute h-full bg-primary rounded-full" 
        style={{ 
          left: `${((value[0] - min) / (max - min)) * 100}%`, 
          right: `${100 - ((value[1] - min) / (max - min)) * 100}%` 
        }}
      />
      <div className="absolute w-full h-full flex items-center pointer-events-none">
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value[0]} 
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val <= value[1]) onChange([val, value[1]]);
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-auto z-20 cursor-pointer range-thumb-primary"
          style={{ WebkitAppearance: 'none' }}
        />
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value[1]} 
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val >= value[0]) onChange([value[0], val]);
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-auto z-20 cursor-pointer range-thumb-primary"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>
      
      {/* Tooltips */}
      <div 
        className="absolute bottom-full mb-2 px-2 py-1 bg-neutral text-white text-[10px] font-bold rounded -translate-x-1/2 pointer-events-none whitespace-nowrap"
        style={{ left: `${((value[0] - min) / (max - min)) * 100}%` }}
      >
        {getDayLabel(value[0])}
      </div>
      <div 
        className="absolute bottom-full mb-2 px-2 py-1 bg-neutral text-white text-[10px] font-bold rounded -translate-x-1/2 pointer-events-none whitespace-nowrap"
        style={{ left: `${((value[1] - min) / (max - min)) * 100}%` }}
      >
        {getDayLabel(value[1])}
      </div>

      {/* Month Labels */}
      <div className="absolute top-full w-full flex justify-between mt-3 text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
        {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
};

export const HQSEPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inspections' | 'equipments' | 'tickets'>('dashboard');
  const [loading, setLoading] = useState(true);

  const formatDateLong = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  // Data State
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [inspectionPlans, setInspectionPlans] = useState<HQSEInspectionPlan[]>([]);
  const [inspections, setInspections] = useState<HQSEInspection[]>([]);
  const [nonConformities, setNonConformities] = useState<HQSENonConformity[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<HQSECorrectiveAction[]>([]);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [signalements, setSignalements] = useState<HQSESignalement[]>([]);

  // Modal States
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // New States for Inspection Modal
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<HQSEInspectionPlan | null>(null);
  const [newPlanData, setNewPlanData] = useState<Partial<HQSEInspectionPlan>>({
    equipment_id: '',
    inspection_type: '',
    frequency_days: 30,
    last_inspection_date: ''
  });
  const [inspectionData, setInspectionData] = useState<Partial<HQSEInspection>>({
    equipment_id: '',
    inspector_name: user?.email || '',
    inspection_date: new Date().toISOString().split('T')[0],
    verdict: 'OK',
    report: '',
    comments: '',
    id_employe: ''
  });

  // New States for Inspection Filters
  const [inspectionSearchTerm, setInspectionSearchTerm] = useState('');
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState<string | null>(null);
  const [inspectionDateRange, setInspectionDateRange] = useState({ start: '', end: '' });

  // State for editing signalement
  const [editingSignalementId, setEditingSignalementId] = useState<string | null>(null);

  // State for status change popup
  const [statusPopupId, setStatusPopupId] = useState<string | null>(null);

  // Ticket Filters
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string | null>(null);
  const [ticketDateRange, setTicketDateRange] = useState({ start: '', end: '' });

  const [ticketData, setTicketData] = useState<Partial<HQSESignalement>>({
    register: 'sante',
    origin: 'humain',
    equipment_id: '',
    employee_concerned_id: '',
    severity: 'Mineure',
    reason_description: '',
    measures_to_take: '',
    event_date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0].substring(0, 5)
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
      const [eq, plans, insp, nc, ca, pers, types, sigs] = await Promise.all([
        db.getEquipments(),
        db.getHQSEInspectionPlans(),
        db.getHQSEInspections(),
        db.getHQSENonConformities(),
        db.getHQSECorrectiveActions(),
        db.getAdminPersonnel(),
        db.getEquipmentTypes(),
        db.getHQSESignalements()
      ]);
      setEquipments(eq);
      setInspectionPlans(plans);
      setInspections(insp);
      setNonConformities(nc);
      setCorrectiveActions(ca);
      setPersonnel(pers);
      setEquipmentTypes(types);
      setSignalements(sigs);
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
    if (!ticketData.reason_description) return;

    try {
      setFormLoading(true);
      
      if (!user?.id) {
        throw new Error('Utilisateur non identifié. Veuillez vous reconnecter.');
      }
      
      if (editingSignalementId) {
        await db.updateItem('hqse_tickets_signalements', editingSignalementId, {
          ...ticketData
        });
      } else {
        await db.createHQSESignalement({
          ...ticketData,
          status: 'Nouveau',
          reported_by: user.id
        });
      }
      
      setTicketData({
        register: 'sante',
        origin: 'humain',
        equipment_id: '',
        employee_concerned_id: '',
        severity: 'Mineure',
        reason_description: '',
        measures_to_take: '',
        event_date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0].substring(0, 5)
      });
      setEditingSignalementId(null);
      
      await loadHQSEData();
      setIsTicketModalOpen(false);
      alert(editingSignalementId ? 'Signalement mis à jour avec succès.' : 'Signalement enregistré avec succès.');
    } catch (e: any) {
      console.error('Error saving ticket:', e);
      alert(`Erreur lors de l'enregistrement du signalement: ${e.message || 'Erreur inconnue'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanData.equipment_id || !newPlanData.inspection_type || !newPlanData.frequency_days) return;

    try {
      setFormLoading(true);
      await db.createItem('hqse_inspection_plans', newPlanData);
      await loadHQSEData();
      setIsAddPlanModalOpen(false);
      setNewPlanData({
        equipment_id: '',
        inspection_type: '',
        frequency_days: 30,
        last_inspection_date: ''
      });
      alert('Plan d\'inspection enregistré avec succès.');
    } catch (e: any) {
      console.error('Error saving plan:', e);
      alert(`Erreur lors de l'enregistrement du plan: ${e.message || 'Erreur inconnue'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionData.equipment_id || !inspectionData.inspection_date) return;

    try {
      setFormLoading(true);
      await db.createHQSEInspection(inspectionData);
      
      setInspectionData({
        equipment_id: '',
        inspector_name: user?.email || '',
        inspection_date: new Date().toISOString().split('T')[0],
        verdict: 'OK',
        report: '',
        comments: '',
        id_employe: ''
      });
      
      await loadHQSEData();
      setIsInspectionModalOpen(false);
      alert('Contrôle enregistré avec succès.');
    } catch (e: any) {
      console.error('Error saving inspection:', e);
      alert(`Erreur lors de l'enregistrement du contrôle: ${e.message || 'Erreur inconnue'}`);
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
  // FlyonUI Palette
const COLORS = [
  '#8c57ff', // Primary Purple
  '#28c76f', // Success Green
  '#ff9f43', // Warning Orange
  '#ff4c51', // Destructive Red
  '#00bad1', // Info Cyan
  '#7367f0', // Indigo
  '#25293c', // Dark
  '#444050'  // Gray
];

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

    // New KPIs
    const totalOpenTickets = signalements.filter(s => s.status === 'Nouveau').length;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const criticalRiskAlerts = signalements.filter(s => 
      s.severity === 'Critique' && 
      new Date(s.event_date) >= sevenDaysAgo
    ).length;

    const totalEquipments = equipments.length;
    const okInspections = inspections.filter(i => i.verdict === 'OK').length;
    const equipmentCompliance = totalEquipments > 0 ? (okInspections / totalEquipments) * 100 : 0;

    // Safety Trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const trendData: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendData[d.toISOString().split('T')[0]] = 0;
    }
    signalements.forEach(s => {
      const date = s.event_date.split('T')[0];
      if (trendData[date] !== undefined) {
        trendData[date]++;
      }
    });
    const safetyTrend = Object.entries(trendData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Origin Breakdown
    const originCounts: Record<string, number> = {
      materiel: 0,
      humain: 0,
      organisationnel: 0,
      externe: 0
    };
    signalements.forEach(s => {
      if (originCounts[s.origin] !== undefined) {
        originCounts[s.origin]++;
      }
    });
    const originBreakdown = Object.entries(originCounts).map(([name, value]) => ({ name, value }));

    // Heatmap Data (Event density by day)
    const heatmapData = signalements.map(s => {
      const d = new Date(s.event_date);
      return {
        day: d.getDay(),
        hour: d.getHours(),
        value: 1
      };
    });

    return {
      complianceRate,
      overdueCount,
      criticalNC,
      totalOpenTickets,
      criticalRiskAlerts,
      equipmentCompliance,
      safetyTrend,
      originBreakdown,
      heatmapData
    };
  }, [inspectionPlans, nonConformities, signalements, equipments, inspections]);

  const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
    try {
      await db.updateItem('hqse_tickets_signalements', id, { status: newStatus });
      await loadHQSEData();
    } catch (e) {
      console.error('Error updating ticket status:', e);
    }
  };

  // Filtered and Grouped Signalements
  const filteredSignalements = useMemo(() => {
    return signalements.filter(sig => {
      const matchesSearch = !ticketSearchTerm || 
        sig.reason_description.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        sig.equipment_name?.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        sig.employee_name?.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        sig.register.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        sig.origin.toLowerCase().includes(ticketSearchTerm.toLowerCase());

      const matchesStatus = !ticketStatusFilter || sig.status === ticketStatusFilter;

      const eventDate = new Date(sig.event_date);
      const matchesDate = (!ticketDateRange.start || eventDate >= new Date(ticketDateRange.start)) &&
                          (!ticketDateRange.end || eventDate <= new Date(ticketDateRange.end));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [signalements, ticketSearchTerm, ticketStatusFilter, ticketDateRange]);

  const groupedSignalements = useMemo(() => {
    const groups: Record<string, HQSESignalement[]> = {};
    filteredSignalements.forEach(sig => {
      const date = new Date(sig.event_date);
      const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(sig);
    });
    // Sort groups by date descending
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].event_date);
      const dateB = new Date(b[1][0].event_date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredSignalements]);

  // Filtered and Grouped Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      const matchesSearch = !inspectionSearchTerm || 
        insp.comments?.toLowerCase().includes(inspectionSearchTerm.toLowerCase()) ||
        insp.equipment_name?.toLowerCase().includes(inspectionSearchTerm.toLowerCase()) ||
        insp.inspector_name?.toLowerCase().includes(inspectionSearchTerm.toLowerCase()) ||
        insp.employee_name?.toLowerCase().includes(inspectionSearchTerm.toLowerCase());

      const matchesStatus = !inspectionStatusFilter || insp.verdict === inspectionStatusFilter;

      const inspDate = new Date(insp.inspection_date);
      const matchesDate = (!inspectionDateRange.start || inspDate >= new Date(inspectionDateRange.start)) &&
                          (!inspectionDateRange.end || inspDate <= new Date(inspectionDateRange.end));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [inspections, inspectionSearchTerm, inspectionStatusFilter, inspectionDateRange]);

  const groupedInspections = useMemo(() => {
    const groups: Record<string, HQSEInspection[]> = {};
    filteredInspections.forEach(insp => {
      const date = new Date(insp.inspection_date);
      const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(insp);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].inspection_date);
      const dateB = new Date(b[1][0].inspection_date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredInspections]);

  const getRegisterIcon = (register: string) => {
    switch (register) {
      case 'accident': return <UserCheck size={14} className="text-destructive" />;
      case 'sante': return <Stethoscope size={14} className="text-info" />;
      case 'danger': return <Flame size={14} className="text-warning" />;
      case 'qualite': return <ClipboardCheck size={14} className="text-primary" />;
      case 'environnement': return <Droplets size={14} className="text-success" />;
      default: return <Info size={14} />;
    }
  };

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
            {/* High-Level KPI Widgets (Top Bar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Open Tickets</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.totalOpenTickets}</h3>
                    <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                      <Clock size={12} /> Status: Nouveau
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
                    <FileWarning size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Critical Risk Alert</p>
                    <h3 className="text-3xl font-black text-destructive">{stats.criticalRiskAlerts}</h3>
                    <p className="text-[10px] font-bold text-destructive flex items-center gap-1">
                      <AlertCircle size={12} /> Last 7 Days
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-lg shadow-destructive/10">
                    <Flame size={24} className={stats.criticalRiskAlerts > 0 ? "animate-pulse" : ""} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Equipment Compliance</p>
                    <div className="flex items-end gap-2">
                      <h3 className="text-3xl font-black text-foreground">{stats.equipmentCompliance.toFixed(0)}%</h3>
                      <div className="mb-1 h-12 w-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { value: stats.equipmentCompliance },
                                { value: 100 - stats.equipmentCompliance }
                              ]}
                              innerRadius={15}
                              outerRadius={20}
                              startAngle={90}
                              endAngle={-270}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="var(--success)" />
                              <Cell fill="var(--muted)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-success flex items-center gap-1">
                      <CheckCircle size={12} /> OK vs Total
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shadow-lg shadow-success/10">
                    <ClipboardCheck size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2 w-full">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Safety Trend</p>
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.safetyTrend}>
                          <Area type="monotone" dataKey="count" stroke="var(--info)" fill="var(--info)" fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] font-bold text-info flex items-center gap-1 mt-1">
                      <History size={12} /> Last 30 Days
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-info/10 text-info flex items-center justify-center shadow-lg shadow-info/10">
                    <Activity size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* The "Incident Command" List (Main View) */}
              <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                      <Zap size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Incident Command Center</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('tickets')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All Tickets <ArrowRight size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Involved</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Urgency</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {signalements.slice(0, 8).map((sig) => (
                        <tr 
                          key={sig.id} 
                          className={`hover:bg-muted/20 transition-colors group ${
                            sig.severity === 'Critique' ? 'bg-destructive/5' : 
                            sig.severity === 'Majeure' ? 'bg-warning/5' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-background border border-border shadow-sm">
                                {getRegisterIcon(sig.register)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground line-clamp-1">{sig.reason_description}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">{sig.register}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Cpu size={12} className="text-primary" />
                                {sig.equipment_ref || 'N/A'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <User size={10} />
                                {sig.employee_name || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${
                                sig.severity === 'Critique' ? 'bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                sig.severity === 'Majeure' ? 'bg-warning' :
                                'bg-info'
                              }`} />
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${
                                sig.severity === 'Critique' ? 'text-destructive' :
                                sig.severity === 'Majeure' ? 'text-warning' :
                                'text-info'
                              }`}>
                                {sig.severity}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleUpdateTicketStatus(sig.id, 'En cours')}
                                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                title="Assign Corrective Action"
                              >
                                <ClipboardCheck size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateTicketStatus(sig.id, 'Fermé')}
                                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-success hover:bg-success/10 transition-all"
                                title="Close Ticket"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analytics & Distribution Charts */}
              <div className="space-y-6">
                {/* Origin Breakdown */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm">
                  <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-muted-foreground">Origin Breakdown</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.originBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.originBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Heatmap of Events (Simplified Hour/Day Heatmap) */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm">
                  <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-muted-foreground">Event Density Heatmap</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <XAxis 
                          type="number" 
                          dataKey="hour" 
                          name="Hour" 
                          domain={[0, 23]} 
                          tick={{ fontSize: 10 }} 
                          label={{ value: 'Hour of Day', position: 'bottom', fontSize: 10 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="day" 
                          name="Day" 
                          domain={[0, 6]} 
                          tickFormatter={(val) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][val]}
                          tick={{ fontSize: 10 }}
                        />
                        <ZAxis type="number" dataKey="value" range={[50, 400]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Events" data={stats.heatmapData} fill="var(--primary)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Prochains Contrôles Table (Existing) */}
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
                            <span className="text-xs text-muted-foreground font-medium">{plan.last_inspection_date ? formatDateLong(plan.last_inspection_date) : 'Jamais'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-foreground">{plan.next_due_date ? formatDateLong(plan.next_due_date) : '-'}</span>
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
            className="space-y-8"
          >
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {['Nouveau', 'En cours', 'Fermé'].map(status => (
                  <button
                    key={status}
                    onClick={() => setTicketStatusFilter(ticketStatusFilter === status ? null : status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      ticketStatusFilter === status 
                        ? 'bg-primary text-white border-primary shadow-md' 
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {status}
                  </button>
                ))}
                {ticketStatusFilter && (
                  <button 
                    onClick={() => setTicketStatusFilter(null)}
                    className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsTicketModalOpen(true)}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Déclarer le Signalement
              </button>
            </div>

            {/* Tickets List */}
            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Activity className="text-primary" size={20} />
                  Liste des Signalements & Tickets
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-64 px-2">
                    <RangeSlider 
                      min={1} 
                      max={365} 
                      value={[
                        ticketDateRange.start ? Math.floor((new Date(ticketDateRange.start).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1,
                        ticketDateRange.end ? Math.floor((new Date(ticketDateRange.end).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 365
                      ]}
                      onChange={([s, e]) => {
                        const start = new Date(new Date().getFullYear(), 0, s).toISOString().split('T')[0];
                        const end = new Date(new Date().getFullYear(), 0, e).toISOString().split('T')[0];
                        setTicketDateRange({ start, end });
                      }}
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input 
                      type="text" 
                      placeholder="Filtrer tous les champs..." 
                      className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none w-64 focus:ring-2 focus:ring-primary/20" 
                      value={ticketSearchTerm}
                      onChange={e => setTicketSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Event</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registre / Origine</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personnel concerné</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gravité</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groupedSignalements.map(([month, sigs]) => (
                      <React.Fragment key={month}>
                        <tr className="bg-muted/50">
                          <td colSpan={7} className="px-6 py-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{month}</span>
                          </td>
                        </tr>
                        {sigs.map((sig) => (
                          <tr key={sig.id} className={`hover:bg-muted/20 transition-colors ${
                            sig.severity === 'Critique' ? 'bg-destructive/5' :
                            sig.severity === 'Majeure' ? 'bg-warning/5' :
                            'bg-success/5'
                          }`}>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-foreground">{formatDateLong(sig.event_date)}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(sig.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary">{sig.register}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{sig.origin}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {sig.equipment_name ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <Wrench size={12} className="text-primary" />
                                  {sig.equipment_name}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {sig.employee_name ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <User size={12} className="text-primary" />
                                  {sig.employee_name}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                sig.severity === 'Critique' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                sig.severity === 'Majeure' ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-info/10 text-info border-info/20'
                              }`}>
                                {sig.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-muted-foreground max-w-xs truncate" title={sig.reason_description}>
                                {sig.reason_description}
                              </p>
                            </td>
                            <td className="px-6 py-4 relative">
                              <button 
                                onClick={() => setStatusPopupId(statusPopupId === sig.id ? null : sig.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all hover:ring-2 ring-primary/20 ${
                                sig.status === 'Nouveau' ? 'bg-primary/10 text-primary' :
                                sig.status === 'En cours' ? 'bg-warning/10 text-warning' :
                                'bg-success/10 text-success'
                              }`}>
                                {sig.status}
                              </button>
                              
                              {statusPopupId === sig.id && (
                                <div className="absolute z-50 mt-1 w-32 bg-card border border-border rounded-xl shadow-xl p-1">
                                  {['Nouveau', 'En cours', 'Fermé'].map(st => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        handleUpdateTicketStatus(sig.id, st);
                                        setStatusPopupId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-muted rounded-lg transition-colors"
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  setTicketData({...sig});
                                  setEditingSignalementId(sig.id);
                                  setIsTicketModalOpen(true);
                                }}
                                className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {groupedSignalements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                          Aucun signalement trouvé avec ces filtres.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {['OK', 'NON-CONFORME'].map(status => (
                  <button
                    key={status}
                    onClick={() => setInspectionStatusFilter(inspectionStatusFilter === status ? null : status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      inspectionStatusFilter === status 
                        ? 'bg-primary text-white border-primary shadow-md' 
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {status}
                  </button>
                ))}
                {inspectionStatusFilter && (
                  <button 
                    onClick={() => setInspectionStatusFilter(null)}
                    className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsInspectionModalOpen(true)}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Enregistrer un Contrôle
              </button>
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ClipboardCheck className="text-primary" size={20} />
                  Historique des Contrôles & Vérifications
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-64 px-2">
                    <RangeSlider 
                      min={1} 
                      max={365} 
                      value={[
                        inspectionDateRange.start ? Math.floor((new Date(inspectionDateRange.start).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1,
                        inspectionDateRange.end ? Math.floor((new Date(inspectionDateRange.end).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 365
                      ]}
                      onChange={([s, e]) => {
                        const start = new Date(new Date().getFullYear(), 0, s).toISOString().split('T')[0];
                        const end = new Date(new Date().getFullYear(), 0, e).toISOString().split('T')[0];
                        setInspectionDateRange({ start, end });
                      }}
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input 
                      type="text" 
                      placeholder="Rechercher un contrôle..." 
                      className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none w-64 focus:ring-2 focus:ring-primary/20" 
                      value={inspectionSearchTerm}
                      onChange={e => setInspectionSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setNewPlanData({ ...newPlanData, equipment_id: '' });
                      setIsAddPlanModalOpen(true);
                    }}
                    className="bg-primary/10 text-primary px-4 py-1.5 rounded-xl font-bold text-xs hover:bg-primary/20 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Ajouter Plan
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
                    {groupedInspections.map(([month, insps]) => (
                      <React.Fragment key={month}>
                        <tr className="bg-muted/50">
                          <td colSpan={6} className="px-6 py-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{month}</span>
                          </td>
                        </tr>
                        {insps.map((insp) => (
                          <tr key={insp.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 text-xs font-medium">{formatDateLong(insp.inspection_date)}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{insp.equipment_name}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{insp.equipment_ref}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              <div className="flex flex-col">
                                <span>{insp.inspector_name}</span>
                                {insp.employee_name && <span className="text-[9px] italic">({insp.employee_name})</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                insp.verdict === 'OK' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                              }`}>
                                {insp.verdict === 'OK' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                {insp.verdict === 'OK' ? 'CONFORME' : insp.verdict}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{insp.comments || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all" 
                                  title="Voir le plan"
                                  onClick={() => {
                                    const plan = inspectionPlans.find(p => p.equipment_id === insp.equipment_id);
                                    if (plan) {
                                      setSelectedPlan(plan);
                                      setIsPlanModalOpen(true);
                                    } else {
                                      // If no plan exists, maybe show a message or create a dummy one for display
                                      setSelectedPlan({
                                        id: 'new',
                                        equipment_id: insp.equipment_id,
                                        inspection_type: 'Générale',
                                        frequency_days: 30,
                                        equipment_name: insp.equipment_name,
                                        equipment_ref: insp.equipment_ref
                                      } as HQSEInspectionPlan);
                                      setIsPlanModalOpen(true);
                                    }
                                  }}
                                >
                                  <Search size={14} />
                                </button>
                                <button 
                                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" 
                                  title="Ajouter un plan spécifique"
                                  onClick={() => {
                                    setNewPlanData({ 
                                      equipment_id: insp.equipment_id,
                                      inspection_type: 'VGP',
                                      frequency_days: 180,
                                      last_inspection_date: insp.inspection_date
                                    });
                                    setIsAddPlanModalOpen(true);
                                  }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {groupedInspections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                          Aucun contrôle trouvé avec ces filtres.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equipment Add/Edit Modal */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <FileWarning className="text-primary" size={24} />
                  Déclarer un Signalement HQSE
                </h3>
                <button 
                  onClick={() => setIsTicketModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
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
                        onClick={() => setTicketData({...ticketData, register: item.id as any})}
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

                {/* Origin Selection */}
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
                        onClick={() => setTicketData({...ticketData, origin: item.id as any})}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${ticketData.origin === item.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${ticketData.origin === item.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground group-hover:text-primary'}`}>
                          <item.icon size={20} />
                        </div>
                        <span className={`text-xs font-bold ${ticketData.origin === item.id ? 'text-primary' : 'text-foreground'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSaveTicket} id="ticket-form" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement concerné</label>
                    <AdvancedSelect 
                      options={equipments.map(e => ({ value: e.id, label: e.name, subLabel: e.ref_code }))}
                      value={ticketData.equipment_id || ''}
                      onChange={val => setTicketData({...ticketData, equipment_id: val})}
                      placeholder="Sélectionner un équipement..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Personnel concerné</label>
                    <AdvancedSelect 
                      options={personnelOptions}
                      value={ticketData.employee_concerned_id || ''}
                      onChange={val => setTicketData({...ticketData, employee_concerned_id: val})}
                      placeholder="Sélectionner un employé..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date & Heure de l'événement</label>
                    <input 
                      type="datetime-local"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={ticketData.event_date || ''}
                      onChange={e => setTicketData({...ticketData, event_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gravité</label>
                    <div className="flex gap-2">
                      {['Mineure', 'Majeure', 'Critique'].map(s => (
                        <button 
                          key={s} 
                          type="button"
                          onClick={() => setTicketData({...ticketData, severity: s as any})}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${ticketData.severity === s ? 'bg-primary text-white border-primary shadow-md' : 'border-border hover:bg-secondary'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description de la cause / raison</label>
                    <textarea 
                      rows={3}
                      required
                      placeholder="Décrivez précisément ce qui s'est passé..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      value={ticketData.reason_description || ''}
                      onChange={e => setTicketData({...ticketData, reason_description: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mesures à prendre / Actions immédiates</label>
                    <textarea 
                      rows={2}
                      placeholder="Quelles actions ont été ou doivent être entreprises ?"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      value={ticketData.measures_to_take || ''}
                      onChange={e => setTicketData({...ticketData, measures_to_take: e.target.value})}
                    ></textarea>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-border flex justify-end gap-3 bg-muted/20">
                <button 
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  form="ticket-form"
                  disabled={formLoading}
                  className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingSignalementId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspection Modal */}
      <AnimatePresence>
        {isInspectionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInspectionModalOpen(false)}
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
                  <ClipboardCheck className="text-primary" size={24} />
                  Enregistrer un Contrôle
                </h3>
                <button 
                  onClick={() => setIsInspectionModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveInspection}>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement <span className="text-destructive">*</span></label>
                      <AdvancedSelect 
                        options={equipments.map(e => ({ value: e.id, label: e.name, subLabel: e.ref_code }))}
                        value={inspectionData.equipment_id || ''}
                        onChange={val => setInspectionData({...inspectionData, equipment_id: val})}
                        placeholder="Sélectionner..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date du contrôle <span className="text-destructive">*</span></label>
                      <input 
                        type="date"
                        required
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={inspectionData.inspection_date || ''}
                        onChange={e => setInspectionData({...inspectionData, inspection_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contrôleur (Nom)</label>
                      <input 
                        type="text"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={inspectionData.inspector_name || ''}
                        onChange={e => setInspectionData({...inspectionData, inspector_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Personnel concerné</label>
                      <AdvancedSelect 
                        options={personnelOptions}
                        value={inspectionData.id_employe || ''}
                        onChange={val => setInspectionData({...inspectionData, id_employe: val})}
                        placeholder="Sélectionner..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verdict</label>
                      <div className="flex gap-2">
                        {['OK', 'NON-CONFORME'].map(v => (
                          <button 
                            key={v} 
                            type="button"
                            onClick={() => setInspectionData({...inspectionData, verdict: v as any})}
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${inspectionData.verdict === v ? (v === 'OK' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-destructive text-white border-destructive shadow-md') : 'border-border hover:bg-secondary'}`}
                          >
                            {v === 'OK' ? 'CONFORME' : v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Commentaires</label>
                      <textarea 
                        rows={3}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                        value={inspectionData.comments || ''}
                        onChange={e => setInspectionData({...inspectionData, comments: e.target.value})}
                      ></textarea>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rapport (Texte)</label>
                      <textarea 
                        rows={2}
                        placeholder="Résumé du rapport..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                        value={inspectionData.report || ''}
                        onChange={e => setInspectionData({...inspectionData, report: e.target.value})}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-border flex justify-end gap-3 bg-muted/20">
                  <button 
                    type="button"
                    onClick={() => setIsInspectionModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer le Contrôle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspection Plan Modal */}
      <AnimatePresence>
        {isPlanModalOpen && selectedPlan && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <History className="text-primary" size={24} />
                  Plan d'Inspection
                </h3>
                <button 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Équipement</div>
                    <div className="text-sm font-bold">{selectedPlan.equipment_name}</div>
                    <div className="text-[10px] text-muted-foreground">{selectedPlan.equipment_ref}</div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Type d'inspection</div>
                    <div className="text-sm font-bold">{selectedPlan.inspection_type}</div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Fréquence</div>
                    <div className="text-sm font-bold">{selectedPlan.frequency_days} jours</div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Dernière inspection</div>
                    <div className="text-sm font-bold">{selectedPlan.last_inspection_date ? formatDateLong(selectedPlan.last_inspection_date) : '-'}</div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Prochaine échéance</div>
                    <div className="text-sm font-black text-primary">{selectedPlan.next_due_date ? formatDateLong(selectedPlan.next_due_date) : '-'}</div>
                  </div>
                </div>

                {selectedPlan.id === 'new' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Aucun plan d'inspection spécifique n'a été défini pour cet équipement. Les valeurs affichées sont des paramètres par défaut.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-border flex justify-end bg-muted/20">
                <button 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Inspection Plan Modal */}
      <AnimatePresence>
        {isAddPlanModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPlanModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <Plus className="text-primary" size={24} />
                  Nouveau Plan d'Inspection
                </h3>
                <button 
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePlan}>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement <span className="text-destructive">*</span></label>
                    <AdvancedSelect 
                      options={equipments.map(e => ({ value: e.id, label: e.name, subLabel: e.ref_code }))}
                      value={newPlanData.equipment_id || ''}
                      onChange={val => setNewPlanData({...newPlanData, equipment_id: val})}
                      placeholder="Sélectionner..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type d'inspection <span className="text-destructive">*</span></label>
                      <input 
                        type="text"
                        required
                        placeholder="ex: VGP, Semestriel..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newPlanData.inspection_type || ''}
                        onChange={e => setNewPlanData({...newPlanData, inspection_type: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fréquence (jours) <span className="text-destructive">*</span></label>
                      <input 
                        type="number"
                        required
                        min={1}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newPlanData.frequency_days || 30}
                        onChange={e => setNewPlanData({...newPlanData, frequency_days: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dernière inspection</label>
                    <input 
                      type="date"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={newPlanData.last_inspection_date || ''}
                      onChange={e => setNewPlanData({...newPlanData, last_inspection_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-8 border-t border-border flex justify-end gap-3 bg-muted/20">
                  <button 
                    type="button"
                    onClick={() => setIsAddPlanModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer le Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
                            <p className="text-xs font-bold">{formatDateLong(insp.inspection_date)}</p>
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
