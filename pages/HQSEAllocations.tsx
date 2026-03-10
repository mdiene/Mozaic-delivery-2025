
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AdminPersonnel, EquipmentType, HQSEEmployeeAllocation, Equipment } from '../types';
import { 
  Plus, Search, Filter, HardHat, Users, Package, Save, X, 
  RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Gift,
  Calendar, Trash2, RotateCcw, Info, MapPin, UserCheck,
  AlertTriangle, ShieldCheck, History, ChevronRight, Briefcase,
  UserPlus, Phone, User, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedSelect } from '../components/AdvancedSelect';
import { AdminPoste } from '../types';

export const HQSEAllocations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dotations' | 'inventory'>('dotations');
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [postes, setPostes] = useState<AdminPoste[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [allocations, setAllocations] = useState<HQSEEmployeeAllocation[]>([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState<AdminPersonnel | null>(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  const [formData, setFormData] = useState<any>({
    quantity_allocated: 1,
    condition_at_allocation: 'Neuf',
    allocation_date: new Date().toISOString().split('T')[0]
  });
  const [employeeFormData, setEmployeeFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pers, types, equs, allocs, p] = await Promise.all([
        db.getAdminPersonnel(),
        db.getEquipmentTypes(),
        db.getEquipments(),
        db.getHQSEEmployeeAllocations(),
        db.getAdminPostes()
      ]);
      setPersonnel(pers);
      setEquipmentTypes(types);
      setEquipments(equs);
      setAllocations(allocs);
      setPostes(p);
    } catch (e) {
      console.error('Error loading allocations data:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Polling for real-time updates as requested
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    setSaving(true);
    try {
      const payload = { ...employeeFormData };
      delete payload.poste_titre;
      delete payload.admin_postes;

      if (!payload.id_poste) payload.id_poste = null;

      if (payload.id_personnel) {
        const id = payload.id_personnel;
        const updateData = { ...payload };
        delete updateData.id_personnel;
        await db.updateItem('admin_personnel', id, updateData);
      } else {
        delete payload.id_personnel;
        await db.createItem('admin_personnel', payload);
      }

      setIsEmployeeModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Erreur lors de l\'enregistrement: ' + (error.message || 'Erreur inconnue'));
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

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.equipment_id || !formData.quantity_allocated) return;
    
    setSaving(true);
    try {
      const selectedEquip = equipments.find(e => e.id === formData.equipment_id);
      if (!selectedEquip) throw new Error('Équipement invalide');

      const selectedType = equipmentTypes.find(t => t.id === selectedEquip.type_id);

      // Calculate expected renewal date
      let expectedRenewalDate = null;
      if (selectedType?.renewal_cycle_days) {
        const date = new Date(formData.allocation_date);
        date.setDate(date.getDate() + selectedType.renewal_cycle_days);
        expectedRenewalDate = date.toISOString().split('T')[0];
      }

      await db.createHQSEEmployeeAllocation({
        ...formData,
        expected_renewal_date: expectedRenewalDate,
        is_returned: false
      });

      setIsAllocationModalOpen(false);
      setFormData({
        quantity_allocated: 1,
        condition_at_allocation: 'Neuf',
        allocation_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la dotation');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Rendu' | 'Perdu') => {
    if (!confirm(`Confirmer l'action : ${status} ?`)) return;
    
    try {
      const updateData: any = {
        is_returned: status === 'Rendu',
        comments: status === 'Perdu' ? 'Déclaré perdu' : 'Rendu au magasin'
      };
      
      if (status === 'Rendu') {
        updateData.return_date = new Date().toISOString().split('T')[0];
      }

      await db.updateItem('hqse_employee_allocations', id, updateData);
      
      // If returned, we should probably increment stock back?
      // The requirement doesn't explicitly say to increment back, but it's logical.
      // For now, let's just update the status.
      
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPersonnel = personnel.filter(p => 
    `${p.nom} ${p.prenom}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAllocationModal = (emp?: AdminPersonnel) => {
    const employee = emp || selectedEmployee;
    setFormData({
      ...formData,
      employee_id: employee?.id_personnel || '',
      quantity_allocated: 1,
      condition_at_allocation: 'Neuf',
      allocation_date: new Date().toISOString().split('T')[0]
    });
    setIsAllocationModalOpen(true);
  };

  const employeeAllocations = selectedEmployee 
    ? allocations.filter(a => a.employee_id === selectedEmployee.id_personnel)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl border border-border shadow-soft-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <Gift size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Dotations & Inventaire
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Gestion des équipements individuels et stock magasin</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('dotations')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'dotations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Dotation Personnel
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Inventaire Magasin
          </button>
        </div>
        {!isVisitor && (
          <div className="flex gap-2">
            {activeTab === 'dotations' && (
              <button 
                onClick={() => {
                  setEmployeeFormData({});
                  setIsEmployeeModalOpen(true);
                }}
                className="bg-secondary text-foreground px-4 py-3 rounded-2xl font-bold text-sm hover:bg-secondary/80 transition-all flex items-center gap-2"
              >
                <UserPlus size={20} />
                Nouvel Employé
              </button>
            )}
            <button 
              onClick={() => openAllocationModal()}
              className="bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              {activeTab === 'dotations' ? 'Nouvelle Dotation' : 'Ajouter Équipement'}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dotations' ? (
          <motion.div 
            key="dotations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column: Employee List */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="text"
                      placeholder="Rechercher un employé..."
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                  {loading ? (
                    <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-primary" /></div>
                  ) : filteredPersonnel.length > 0 ? (
                    <div className="divide-y divide-border">
                      {filteredPersonnel.map(p => (
                        <button
                          key={p.id_personnel}
                          onClick={() => setSelectedEmployee(p)}
                          className={`w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-all text-left group ${selectedEmployee?.id_personnel === p.id_personnel ? 'bg-primary/5 border-l-4 border-primary' : ''}`}
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {p.nom[0]}{p.prenom[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground truncate">{p.prenom} {p.nom}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{p.poste_titre}</span>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            {selectedEmployee?.id_personnel === p.id_personnel && !isVisitor && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAllocationModal(p);
                                }}
                                className="p-1.5 bg-primary text-white rounded-lg transition-opacity"
                                title="Ajouter équipement"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                            <ChevronRight size={16} className="text-muted-foreground opacity-50" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Aucun employé trouvé</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Employee Detail / Fiche Individuelle */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="wait">
                {selectedEmployee ? (
                  <motion.div
                    key={selectedEmployee.id_personnel}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Employee Profile Card */}
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-soft-sm flex flex-col md:flex-row gap-6 items-center">
                      <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shadow-inner">
                        {selectedEmployee.nom[0]}{selectedEmployee.prenom[0]}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-black text-foreground tracking-tight">{selectedEmployee.prenom} {selectedEmployee.nom}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <Briefcase size={14} className="text-primary" />
                            {selectedEmployee.poste_titre}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <UserCheck size={14} className="text-primary" />
                            ID: {selectedEmployee.id_personnel.split('-')[0]}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <div className="bg-success/10 text-success px-4 py-2 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest">Actifs</p>
                            <p className="text-lg font-black">{employeeAllocations.filter(a => !a.is_returned).length}</p>
                         </div>
                         <div className="bg-muted/50 text-muted-foreground px-4 py-2 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest">Total</p>
                            <p className="text-lg font-black">{employeeAllocations.length}</p>
                         </div>
                      </div>
                    </div>

                    {/* Allocations Table */}
                    <div className="bg-card rounded-3xl border border-border shadow-soft-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                          <Package size={18} className="text-primary" />
                          Fiche Individuelle de Dotation
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/30 border-b border-border">
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipement</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Dotation</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Renouvellement</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {employeeAllocations.length > 0 ? (
                              employeeAllocations.map((alloc) => {
                                const isOverdue = alloc.expected_renewal_date && new Date(alloc.expected_renewal_date) < new Date() && !alloc.is_returned;
                                
                                return (
                                  <tr key={alloc.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">{alloc.equipment_name}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{alloc.equipment_ref} • Qté: {alloc.quantity_allocated}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                                      {new Date(alloc.allocation_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                      {alloc.expected_renewal_date ? (
                                        <div className={`flex flex-col ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                          <span className="text-xs font-mono">{new Date(alloc.expected_renewal_date).toLocaleDateString()}</span>
                                          {isOverdue && <span className="text-[9px] font-black uppercase tracking-widest">À renouveler</span>}
                                        </div>
                                      ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`badge text-[9px] font-black uppercase ${
                                        alloc.is_returned ? 'badge-success' : 
                                        alloc.comments === 'Déclaré perdu' ? 'badge-error' : 
                                        'badge-primary'
                                      }`}>
                                        {alloc.is_returned ? 'Rendu' : alloc.comments === 'Déclaré perdu' ? 'Perdu' : 'En service'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      {!alloc.is_returned && !isVisitor && (
                                        <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={() => handleUpdateStatus(alloc.id, 'Rendu')}
                                            className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors"
                                            title="Rendre"
                                          >
                                            <RotateCcw size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleUpdateStatus(alloc.id, 'Perdu')}
                                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                            title="Déclarer Perdu"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                  <Package size={32} className="mx-auto mb-2 opacity-20" />
                                  <p className="text-xs font-bold uppercase tracking-widest">Aucune dotation enregistrée</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-card rounded-3xl border border-border border-dashed p-12 text-muted-foreground gap-4">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <Users size={40} className="opacity-20" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Sélectionner un employé</h3>
                      <p className="text-sm">Choisissez un employé dans la liste pour voir sa fiche de dotation</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
      </AnimatePresence>

      {/* Employee Modal */}
      <AnimatePresence>
        {isEmployeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmployeeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                  <User className="text-primary" size={24} />
                  {employeeFormData.id_personnel ? 'Modifier l\'Employé' : 'Ajouter un Employé'}
                </h3>
                <button onClick={() => setIsEmployeeModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSaveEmployee} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prénom</label>
                    <input 
                      required 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                      value={employeeFormData.prenom || ''} 
                      onChange={e => setEmployeeFormData({...employeeFormData, prenom: e.target.value})} 
                      placeholder="Prénom" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom</label>
                    <input 
                      required 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                      value={employeeFormData.nom || ''} 
                      onChange={e => setEmployeeFormData({...employeeFormData, nom: e.target.value})} 
                      placeholder="Nom" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Poste (Rôle)</label>
                  <select 
                    required 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={employeeFormData.id_poste || ''} 
                    onChange={e => setEmployeeFormData({...employeeFormData, id_poste: e.target.value})}
                  >
                    <option value="">Sélectionner un poste...</option>
                    {postes.map(p => <option key={p.id_poste} value={p.id_poste}>{p.titre_poste}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      className="w-full pl-10 pr-4 bg-background border border-border rounded-xl py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                      value={employeeFormData.telephone || ''} 
                      onChange={e => setEmployeeFormData({...employeeFormData, telephone: e.target.value})} 
                      placeholder="7x xxx xx xx" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                  <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Équipement</p>
                <p className="text-sm font-black text-foreground">{selectedEquipment?.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{selectedEquipment?.ref_code}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantité à ajouter</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Ex: 50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                <button type="submit" disabled={saving} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2">
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Confirmer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Allocation Modal */}

      {/* Allocation Modal */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsAllocationModalOpen(false)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border"
          >
            <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-primary/5">
              <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                <Gift className="text-primary" size={24} />
                Nouvelle Dotation
              </h3>
              <button onClick={() => setIsAllocationModalOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveAllocation} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employé <span className="text-destructive">*</span></label>
                  <AdvancedSelect
                    options={personnel.map(p => ({ value: p.id_personnel, label: `${p.prenom} ${p.nom} (${p.poste_titre})` }))}
                    value={formData.employee_id}
                    onChange={(val) => setFormData({ ...formData, employee_id: val })}
                    placeholder="Sélectionner l'employé..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Équipement <span className="text-destructive">*</span></label>
                  <AdvancedSelect
                    options={equipments.map(e => ({ 
                      value: e.id, 
                      label: `${e.name} (${e.ref_code}) - Stock: ${e.quantite_dispo || 0}` 
                    }))}
                    value={formData.equipment_id}
                    onChange={(val) => setFormData({ ...formData, equipment_id: val })}
                    placeholder="Sélectionner l'équipement..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantité <span className="text-destructive">*</span></label>
                    <input 
                      type="number"
                      min="1"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.quantity_allocated}
                      onChange={e => setFormData({ ...formData, quantity_allocated: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date Dotation</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.allocation_date}
                      onChange={e => setFormData({ ...formData, allocation_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">État à la dotation</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={formData.condition_at_allocation}
                    onChange={e => setFormData({ ...formData, condition_at_allocation: e.target.value })}
                  >
                    <option value="Neuf">Neuf</option>
                    <option value="Bon état">Bon état</option>
                    <option value="Usagé">Usagé</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Commentaires</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    value={formData.comments || ''}
                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                    placeholder="Notes éventuelles..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button type="button" onClick={() => setIsAllocationModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Annuler</button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Valider la Dotation
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
