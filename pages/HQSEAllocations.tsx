
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AdminPersonnel, EquipmentType, HQSEEmployeeAllocation, Equipment } from '../types';
import { 
  Plus, Search, Filter, HardHat, Users, Package, Save, X, 
  RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Gift,
  Calendar, Trash2, RotateCcw, Info, MapPin, UserCheck,
  AlertTriangle, ShieldCheck, History, ChevronRight, Briefcase,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedSelect } from '../components/AdvancedSelect';

export const HQSEAllocations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [allocations, setAllocations] = useState<HQSEEmployeeAllocation[]>([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState<AdminPersonnel | null>(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    quantity_allocated: 1,
    condition_at_allocation: 'Neuf',
    allocation_date: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isVisitor = user?.role === 'VISITOR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pers, types, equs, allocs] = await Promise.all([
        db.getAdminPersonnel(),
        db.getEquipmentTypes(),
        db.getEquipments(),
        db.getHQSEEmployeeAllocations()
      ]);
      setPersonnel(pers);
      setEquipmentTypes(types);
      setEquipments(equs);
      setAllocations(allocs);
    } catch (e) {
      console.error('Error loading allocations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAllocation = async (e: React.FormEvent) => {
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
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Gift className="text-primary" size={28} />
            Dotation Personnel
          </h2>
          <p className="text-sm text-muted-foreground font-medium">Gestion des équipements individuels et renouvellements</p>
        </div>
        {!isVisitor && (
          <button 
            onClick={() => openAllocationModal()}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Nouvelle Dotation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
      </div>

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
            
            <form onSubmit={handleCreateAllocation} className="p-8 space-y-6">
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
