
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { 
  AdminPersonnel, EquipmentType, Equipment, HQSESafetyAudit, HQSENonConformity, HQSEInspection 
} from '../types';
import { 
  Plus, Search, Filter, HardHat, Users, ClipboardCheck, AlertTriangle, 
  TrendingUp, Package, UserCheck, ShieldAlert, Camera, Save, X, 
  RefreshCw, CheckCircle2, AlertCircle, History, ArrowRight, ShieldCheck,
  FileWarning, Info, MapPin, Wrench, User, XCircle, Eye, FileText,
  Calendar, Check, AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedSelect } from '../components/AdvancedSelect';

export const HQSEDotations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'safety' | 'non_conformities' | 'inspections'>('inventory');
  
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [safetyAudits, setSafetyAudits] = useState<HQSESafetyAudit[]>([]);
  const [nonConformities, setNonConformities] = useState<HQSENonConformity[]>([]);
  const [inspections, setInspections] = useState<HQSEInspection[]>([]);
  const [ncFilters, setNcFilters] = useState({ status: 'Tous', severity: 'Tous' });

  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isNCModalOpen, setIsNCModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pers, types, eqs, auds, ncs, insp] = await Promise.all([
        db.getAdminPersonnel(),
        db.getEquipmentTypes(),
        db.getEquipments(),
        db.getHQSESafetyAudits(),
        db.getHQSENonConformities(),
        db.getHQSEInspections()
      ]);
      setPersonnel(pers);
      setEquipmentTypes(types);
      setEquipments(eqs);
      setSafetyAudits(auds);
      setNonConformities(ncs);
      setInspections(insp);
    } catch (e) {
      console.error('Error loading dotations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSafetyAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.auditor_id) return;
    setSaving(true);
    try {
      // Strip non-database fields
      const { sanction_type, employee_name, auditor_name, equipment_name, equipment_ref, ...dbPayload } = formData;
      
      // Merge sanction into notes if present
      if (sanction_type) {
        dbPayload.observation_notes = `${dbPayload.observation_notes || ''}\n(Sanction: ${sanction_type})`.trim();
      }

      if (formData.id) {
        await db.updateItem('hqse_safety_compliance_audits', formData.id, dbPayload);
      } else {
        await db.createItem('hqse_safety_compliance_audits', {
          ...dbPayload,
          audit_date: new Date().toISOString()
        });
      }
      setIsSafetyModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.severity) return;
    setSaving(true);
    try {
      const { equipment_name, equipment_ref, ...dbPayload } = formData;
      if (formData.id) {
        await db.updateItem('hqse_non_conformities', formData.id, dbPayload);
      } else {
        await db.createItem('hqse_non_conformities', {
          ...dbPayload,
          declared_at: new Date().toISOString(),
          status: 'Ouvert'
        });
      }
      setIsNCModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleIncrementStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !formData.quantity) return;
    setSaving(true);
    try {
      const currentQty = selectedEquipment.quantite_dispo || 0;
      const addQty = parseInt(formData.quantity);
      
      await db.updateItem('equipments', selectedEquipment.id, {
        quantite_dispo: currentQty + addQty
      });
      
      setIsStockModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.verdict) return;
    setSaving(true);
    try {
      const { equipment_name, equipment_ref, ...rest } = formData;
      const inspectionData = {
        ...rest,
        inspection_date: formData.inspection_date || new Date().toISOString().split('T')[0]
      };

      let newInspectionId;
      if (formData.id) {
        await db.updateItem('hqse_inspections', formData.id, inspectionData);
        newInspectionId = formData.id;
      } else {
        const res = await db.createItem('hqse_inspections', inspectionData);
        newInspectionId = (res as any)?.id || (res as any)?.[0]?.id;
      }

      // If NON-CONFORME, open NC modal with linked data
      if (formData.verdict === 'NON-CONFORME') {
        const equipment = equipments.find(e => e.id === formData.equipment_id);
        setFormData({
          equipment_id: formData.equipment_id,
          inspection_id: newInspectionId,
          severity: 'Majeure',
          status: 'Ouvert',
          description: `Non-conformité détectée lors de l'inspection du ${inspectionData.inspection_date} par ${formData.inspector_name || 'Inconnu'}.`
        });
        setIsInspectionModalOpen(false);
        setIsNCModalOpen(true);
      } else {
        setIsInspectionModalOpen(false);
        fetchData();
      }
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
        <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Dotations & Discipline</h1>
          <p className="text-muted-foreground text-sm">Gestion des équipements et suivi de la conformité terrain.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Inventaire
          </button>
          <button 
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'safety' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Audits Terrain
          </button>
          <button 
            onClick={() => setActiveTab('non_conformities')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'non_conformities' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Non-Conformités
          </button>
          <button 
            onClick={() => setActiveTab('inspections')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inspections' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Inspections (VGP)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' && (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {equipmentTypes.map((type) => {
              const typeEquipments = equipments.filter(e => e.type_id === type.id);
              const isLowStock = type.available_stock_quantity < (type.total_stock_quantity * 0.1);
              
              return (
                <div key={type.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{type.label}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{type.code} • {typeEquipments.length} unités enregistrées</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Disponible</p>
                        <p className={`text-xl font-black ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                          {type.available_stock_quantity} <span className="text-xs text-muted-foreground font-bold">/ {type.total_stock_quantity}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {typeEquipments.length > 0 ? (
                      typeEquipments.map((eq) => (
                        <div key={eq.id} className="bg-card p-4 rounded-2xl border border-border shadow-soft-sm hover:shadow-soft-md transition-all group relative overflow-hidden">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{eq.ref_code}</span>
                            <span className={`badge badge-soft text-[9px] ${eq.status === 'Actif' ? 'badge-success' : 'badge-warning'}`}>{eq.status}</span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground mb-1">{eq.name}</h4>
                          <div className="space-y-1 mb-4">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <MapPin size={12} />
                              <span>{eq.location || 'Non localisé'}</span>
                            </div>
                            {eq.serial_number && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Info size={12} />
                                <span>SN: {eq.serial_number}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Dispo.</span>
                              <span className={`text-sm font-black ${eq.quantite_dispo && eq.quantite_dispo < 5 ? 'text-destructive' : 'text-foreground'}`}>
                                {eq.quantite_dispo || 0}
                              </span>
                            </div>
                            {!isVisitor && (
                              <button 
                                onClick={() => {
                                  setSelectedEquipment(eq);
                                  setFormData({ quantity: '' });
                                  setIsStockModalOpen(true);
                                }}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                                title="Réapprovisionner"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Package size={32} className="opacity-20" />
                        <span className="text-xs font-bold uppercase tracking-widest">Aucun équipement de ce type</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'safety' && (
          <motion.div 
            key="safety"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <ShieldCheck className="text-primary" size={24} />
                Registre Sécurité & Conformité
              </h3>
              {!isVisitor && (
                <button 
                  onClick={() => {
                    setFormData({ 
                      is_usage_respected: true, 
                      has_loss_occurred: false, 
                      has_deteriorated_equipment: false,
                      number_of_items: 1,
                      auditor_id: user?.id
                    });
                    setIsSafetyModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Nouvel Audit
                </button>
              )}
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employé</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usage</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">État</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {safetyAudits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                          {new Date(audit.audit_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {audit.employee_name?.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm font-bold text-foreground">{audit.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{audit.equipment_name || 'N/A'}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{audit.equipment_ref}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge badge-soft text-[10px] ${audit.is_usage_respected ? 'badge-success' : 'badge-error'}`}>
                            {audit.is_usage_respected ? 'Respecté' : 'Non respecté'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {audit.has_loss_occurred && <span className="text-[9px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10} /> Perte</span>}
                            {audit.has_deteriorated_equipment && <span className="text-[9px] font-bold text-warning uppercase tracking-widest flex items-center gap-1"><Wrench size={10} /> Détérioré</span>}
                            {!audit.has_loss_occurred && !audit.has_deteriorated_equipment && <span className="text-[9px] font-bold text-success uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setFormData(audit);
                              setIsSafetyModalOpen(true);
                            }}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'non_conformities' && (
          <motion.div 
            key="non_conformities"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <FileWarning className="text-primary" size={24} />
                Registre Sécurité & Conformité
              </h3>
              <div className="flex items-center gap-2">
                <select 
                  className="select select-sm select-bordered rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  value={ncFilters.status}
                  onChange={(e) => setNcFilters({ ...ncFilters, status: e.target.value })}
                >
                  <option value="Tous">Tous les statuts</option>
                  <option value="Ouvert">Ouvert</option>
                  <option value="En cours">En cours</option>
                  <option value="Résolu">Résolu</option>
                </select>
                <select 
                  className="select select-sm select-bordered rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  value={ncFilters.severity}
                  onChange={(e) => setNcFilters({ ...ncFilters, severity: e.target.value })}
                >
                  <option value="Tous">Toutes gravités</option>
                  <option value="Mineure">Mineure</option>
                  <option value="Majeure">Majeure</option>
                  <option value="Critique">Critique</option>
                </select>
                {!isVisitor && (
                  <button 
                    onClick={() => {
                      setFormData({ severity: 'Mineure', status: 'Ouvert' });
                      setIsNCModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                  >
                    <Plus size={16} /> Déclarer NC
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nonConformities
                .filter(nc => (ncFilters.status === 'Tous' || nc.status === ncFilters.status) && (ncFilters.severity === 'Tous' || nc.severity === ncFilters.severity))
                .map((nc) => (
                <div 
                  key={nc.id} 
                  className={`bg-card rounded-3xl border shadow-soft-sm overflow-hidden group cursor-pointer hover:shadow-soft-md transition-all ${
                    nc.severity === 'Critique' ? 'border-destructive/50 animate-pulse-slow' : 'border-border'
                  }`}
                  onClick={() => {
                    setFormData(nc);
                    setIsNCModalOpen(true);
                  }}
                >
                  <div className={`p-6 border-b border-border flex justify-between items-center ${
                    nc.severity === 'Critique' ? 'bg-destructive/5' : 
                    nc.severity === 'Majeure' ? 'bg-warning/5' : 
                    'bg-info/5'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        nc.severity === 'Critique' ? 'bg-destructive/10 text-destructive' :
                        nc.severity === 'Majeure' ? 'bg-warning/10 text-warning' :
                        'bg-info/10 text-info'
                      }`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{nc.severity}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{new Date(nc.declared_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`badge text-[10px] font-black uppercase ${
                      nc.status === 'Ouvert' ? 'badge-error' : 
                      nc.status === 'En cours' ? 'badge-warning' : 
                      'badge-success'
                    }`}>
                      {nc.status}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-foreground font-medium line-clamp-2">{nc.description}</p>
                    {nc.equipment_name && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl">
                        <HardHat size={14} className="text-primary" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-foreground">{nc.equipment_name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{nc.equipment_ref}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2">
                      <select 
                        className="select select-xs select-bordered rounded-lg flex-1 text-[9px] font-bold uppercase tracking-widest"
                        value={nc.status}
                        onChange={async (e) => {
                          try {
                            await db.updateItem('hqse_non_conformities', nc.id, { status: e.target.value });
                            fetchData();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <option value="Ouvert">Ouvert</option>
                        <option value="En cours">En cours</option>
                        <option value="Résolu">Résolu</option>
                      </select>
                      <button 
                        onClick={() => {
                          // Logic to create corrective action - for now just opens modal with prefilled notes
                          setFormData({ ...nc, observation_notes: `Action corrective pour NC: ${nc.id}` });
                          setIsSafetyModalOpen(true);
                        }}
                        className="btn btn-xs btn-primary rounded-lg text-[9px] font-bold uppercase tracking-widest"
                      >
                        Action Corrective
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-muted/30 flex justify-end">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      Détails <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <ClipboardCheck className="text-primary" size={24} />
                Inspection Équipement (VGP)
              </h3>
              {!isVisitor && (
                <button 
                  onClick={() => {
                    setFormData({ verdict: 'OK', inspection_date: new Date().toISOString().split('T')[0] });
                    setIsInspectionModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Nouvelle Inspection
                </button>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4">
                <div className="p-3 bg-success/10 text-success rounded-xl">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taux de Conformité</p>
                  <p className="text-xl font-black text-foreground">
                    {inspections.length > 0 ? Math.round((inspections.filter(i => i.verdict === 'OK').length / inspections.length) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4">
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Non-Conformités</p>
                  <p className="text-xl font-black text-foreground">{inspections.filter(i => i.verdict === 'NON-CONFORME').length}</p>
                </div>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dernière Inspection</p>
                  <p className="text-sm font-black text-foreground">
                    {inspections.length > 0 ? new Date(inspections[0].inspection_date).toLocaleDateString() : 'Aucune'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inspecteur</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verdict</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rapport</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                          {new Date(insp.inspection_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{insp.equipment_name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{insp.equipment_ref}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {insp.inspector_name || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge badge-soft text-[10px] font-black ${insp.verdict === 'OK' ? 'badge-success' : 'badge-error'}`}>
                            {insp.verdict}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {insp.report_url ? (
                            <a href={insp.report_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs font-bold">
                              <FileText size={14} /> Voir
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setFormData(insp);
                              setIsInspectionModalOpen(true);
                            }}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                          >
                            <Eye size={16} />
                          </button>
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

      {/* Modals */}
      <AnimatePresence>
        {/* Safety Audit Modal */}
        {isSafetyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSafetyModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-primary/5">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <ShieldCheck className="text-primary" size={24} />
                  {formData.id ? 'Modifier l\'Audit' : 'Nouvel Audit de Sécurité'}
                </h3>
                <button onClick={() => setIsSafetyModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveSafetyAudit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                {/* Section 1: Identification */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <User size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Identification</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
                        Employé contrôlé <span className="text-destructive">*</span>
                      </label>
                      <AdvancedSelect
                        options={personnel.map(p => ({ value: p.id_personnel, label: `${p.prenom} ${p.nom}` }))}
                        value={formData.employee_id}
                        onChange={(val) => setFormData({ ...formData, employee_id: val })}
                        placeholder="Rechercher un employé..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement concerné</label>
                      <AdvancedSelect
                        options={equipments.map(e => ({ value: e.id, label: `${e.ref_code} - ${e.name}` }))}
                        value={formData.equipment_id}
                        onChange={(val) => setFormData({ ...formData, equipment_id: val })}
                        placeholder="Rechercher un équipement..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contrôle */}
                <div className="space-y-6 p-6 bg-muted/20 rounded-3xl border border-border/50">
                  <div className="flex items-center gap-2 text-primary">
                    <ClipboardCheck size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Points de Contrôle</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Usage Respecté</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, is_usage_respected: true})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.is_usage_respected ? 'bg-success/10 border-success text-success shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <CheckCircle2 size={16} /> OUI
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, is_usage_respected: false})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.is_usage_respected === false ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <XCircle size={16} /> NON
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Perte Déclarée</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, has_loss_occurred: true})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.has_loss_occurred ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <AlertTriangle size={16} /> OUI
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, has_loss_occurred: false})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.has_loss_occurred === false ? 'bg-success/10 border-success text-success shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <CheckCircle2 size={16} /> NON
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Détérioration</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, has_deteriorated_equipment: true})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.has_deteriorated_equipment ? 'bg-warning/10 border-warning text-warning shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <Wrench size={16} /> OUI
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, has_deteriorated_equipment: false})}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex flex-col items-center gap-2 ${formData.has_deteriorated_equipment === false ? 'bg-success/10 border-success text-success shadow-sm' : 'border-border text-muted-foreground'}`}
                        >
                          <CheckCircle2 size={16} /> NON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Notes */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Observations & Actions Correctives</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
                      value={formData.observation_notes || ''} 
                      onChange={e => setFormData({...formData, observation_notes: e.target.value})} 
                      placeholder="Détails du contrôle..." 
                    />
                  </div>
                  {(!formData.is_usage_respected || formData.has_loss_occurred || formData.has_deteriorated_equipment) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-destructive uppercase tracking-widest">Action Corrective Requise</label>
                        <textarea 
                          rows={2}
                          className="w-full bg-background border border-destructive/20 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-destructive/20 outline-none resize-none" 
                          value={formData.corrective_action_required || ''} 
                          onChange={e => setFormData({...formData, corrective_action_required: e.target.value})} 
                          placeholder="Action à entreprendre..." 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-destructive uppercase tracking-widest">Sanction (si applicable)</label>
                        <select 
                          className="w-full bg-background border border-destructive/20 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-destructive/20 outline-none"
                          value={formData.sanction_type || ''}
                          onChange={e => setFormData({...formData, sanction_type: e.target.value})}
                        >
                          <option value="">Aucune sanction</option>
                          <option value="Avertissement Oral">Avertissement Oral</option>
                          <option value="Avertissement Écrit">Avertissement Écrit</option>
                          <option value="Mise à pied">Mise à pied</option>
                          <option value="Facturation Équipement">Facturation Équipement</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsSafetyModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer l'Audit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Non-Conformity Modal */}
        {isNCModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNCModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-destructive/5">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <FileWarning className="text-destructive" size={24} />
                  {formData.id ? 'Modifier la NC' : 'Déclarer une Non-Conformité'}
                </h3>
                <button onClick={() => setIsNCModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveNC} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
                    Équipement concerné <span className="text-destructive">*</span>
                  </label>
                  <AdvancedSelect
                    options={equipments.map(e => ({ value: e.id, label: `${e.ref_code} - ${e.name}` }))}
                    value={formData.equipment_id}
                    onChange={(val) => setFormData({ ...formData, equipment_id: val })}
                    placeholder="Sélectionner l'équipement..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Niveau de Gravité <span className="text-destructive">*</span></label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Mineure', 'Majeure', 'Critique'].map((sev) => (
                      <button 
                        key={sev}
                        type="button"
                        onClick={() => setFormData({...formData, severity: sev})}
                        className={`py-3 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${
                          formData.severity === sev ? 
                          (sev === 'Critique' ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' :
                           sev === 'Majeure' ? 'bg-warning/10 border-warning text-warning shadow-sm' :
                           'bg-info/10 border-info text-info shadow-sm') : 
                          'border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <AlertTriangle size={16} />
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description détaillée <span className="text-destructive">*</span></label>
                  <textarea 
                    required
                    rows={4}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Décrivez la non-conformité constatée..." 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Statut</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.status || 'Ouvert'} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Ouvert">Ouvert</option>
                    <option value="En cours">En cours</option>
                    <option value="Résolu">Résolu</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsNCModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer la NC
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

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
                  <p className="text-sm font-bold text-foreground">{selectedEquipment?.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{selectedEquipment?.ref_code}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Stock Actuel</p>
                    <p className="text-xl font-black text-primary">{selectedEquipment?.quantite_dispo || 0}</p>
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
                      placeholder="Ex: 10" 
                    />
                  </div>
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

        {/* Inspection Modal */}
        {isInspectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInspectionModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-primary/5">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <ClipboardCheck className="text-primary" size={24} />
                  {formData.id ? 'Modifier l\'Inspection' : 'Nouvelle Inspection Terrain'}
                </h3>
                <button onClick={() => setIsInspectionModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveInspection} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement <span className="text-destructive">*</span></label>
                    <AdvancedSelect
                      options={equipments.map(e => ({ value: e.id, label: `${e.ref_code} - ${e.name}` }))}
                      value={formData.equipment_id}
                      onChange={(val) => setFormData({ ...formData, equipment_id: val })}
                      placeholder="Sélectionner..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date d'Inspection <span className="text-destructive">*</span></label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                      value={formData.inspection_date || ''} 
                      onChange={e => setFormData({...formData, inspection_date: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom de l'Inspecteur</label>
                  <input 
                    type="text"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.inspector_name || ''} 
                    onChange={e => setFormData({...formData, inspector_name: e.target.value})} 
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Verdict de l'Inspection <span className="text-destructive">*</span></label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, verdict: 'OK'})}
                      className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all flex flex-col items-center gap-2 ${formData.verdict === 'OK' ? 'bg-success/10 border-success text-success shadow-md' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <CheckCircle2 size={24} />
                      CONFORME (OK)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, verdict: 'NON-CONFORME'})}
                      className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all flex flex-col items-center gap-2 ${formData.verdict === 'NON-CONFORME' ? 'bg-destructive/10 border-destructive text-destructive shadow-md' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <AlertOctagon size={24} />
                      NON-CONFORME
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lien du Rapport (URL)</label>
                  <input 
                    type="url"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={formData.report_url || ''} 
                    onChange={e => setFormData({...formData, report_url: e.target.value})} 
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Commentaires</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
                    value={formData.comments || ''} 
                    onChange={e => setFormData({...formData, comments: e.target.value})} 
                    placeholder="Observations complémentaires..." 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsInspectionModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {formData.verdict === 'NON-CONFORME' ? 'Suivant: Créer NC' : 'Enregistrer'}
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
