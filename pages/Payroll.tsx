
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, Users, FileText, Settings, Plus, 
  Search, Filter, Download, Trash2, Edit2, 
  CheckCircle, AlertCircle, Printer, ChevronRight,
  UserPlus, Briefcase, DollarSign, Calendar
} from 'lucide-react';
import { db } from '../services/db';
import { payrollService } from '../services/payrollService';
import { AdminPersonnel, PaieContrat, PaieBulletin, PaieRubrique, PaieElementFixe, PaieBulletinDetail } from '../types';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState<'bulletins' | 'contrats' | 'elements' | 'rubriques'>('bulletins');
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [contrats, setContrats] = useState<PaieContrat[]>([]);
  const [bulletins, setBulletins] = useState<PaieBulletin[]>([]);
  const [rubriques, setRubriques] = useState<PaieRubrique[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const [showBulletinModal, setShowBulletinModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<PaieBulletin | null>(null);
  const [bulletinDetails, setBulletinDetails] = useState<PaieBulletinDetail[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [persData, rubData] = await Promise.all([
        db.getAdminPersonnel(),
        db.getPaieRubriques()
      ]);
      setPersonnel(persData);
      setRubriques(rubData);

      if (activeTab === 'bulletins') {
        const bullData = await db.getPaieBulletins(selectedMonth, selectedYear);
        setBulletins(bullData);
      } else if (activeTab === 'contrats') {
        const contData = await db.getPaieContrats();
        setContrats(contData);
      }
    } catch (error) {
      console.error("Error fetching payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBulletin = async (idPersonnel: string) => {
    if (!window.confirm("Générer le bulletin pour cet employé ?")) return;
    try {
      await payrollService.generateBulletin(idPersonnel, selectedMonth, selectedYear);
      fetchData();
    } catch (error: any) {
      alert("Erreur lors de la génération : " + error.message);
    }
  };

  const viewBulletin = async (bulletin: PaieBulletin) => {
    setSelectedBulletin(bulletin);
    const details = await db.getPaieBulletinDetails(bulletin.id_bulletin);
    setBulletinDetails(details);
    setShowBulletinModal(true);
  };

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const filteredPersonnel = personnel.filter(p => 
    `${p.prenom} ${p.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-600" />
            Gestion de la Paie
          </h1>
          <p className="text-slate-500 mt-1">Calcul des salaires et gestion des bulletins (Sénégal)</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            onClick={() => fetchData()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau Bulletin
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {[
          { id: 'bulletins', label: 'Bulletins', icon: FileText },
          { id: 'contrats', label: 'Contrats', icon: Briefcase },
          { id: 'elements', label: 'Éléments Fixes', icon: DollarSign },
          { id: 'rubriques', label: 'Rubriques', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-emerald-600 text-emerald-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'bulletins' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employé</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Période</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Brut</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net à Payer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Chargement...</td>
                    </tr>
                  ) : bulletins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun bulletin pour cette période.</td>
                    </tr>
                  ) : bulletins.map((b) => (
                    <tr key={b.id_bulletin} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{b.personnel_prenom} {b.personnel_nom}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {months[b.periode_mois - 1]} {b.periode_annee}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">
                        {b.salaire_brut_total.toLocaleString()} F
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600 font-mono">
                        {b.net_a_payer.toLocaleString()} F
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.statut_paiement === 'PAYE' ? 'bg-emerald-100 text-emerald-700' :
                          b.statut_paiement === 'VALIDE' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {b.statut_paiement}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => viewBulletin(b)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Voir le bulletin"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List of employees without bulletins for quick generation */}
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Génération Rapide
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersonnel
                  .filter(p => !bulletins.some(b => b.id_personnel === p.id_personnel))
                  .map(p => (
                    <div key={p.id_personnel} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between group hover:border-emerald-300 transition-all">
                      <div>
                        <div className="font-medium text-slate-900">{p.prenom} {p.nom}</div>
                        <div className="text-xs text-slate-500">{p.poste_titre || 'Poste non défini'}</div>
                      </div>
                      <button 
                        onClick={() => handleGenerateBulletin(p.id_personnel)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contrats' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Contrats de Travail</h3>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nouveau Contrat
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employé</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Embauche</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Salaire Base</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Parts</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contrats.map(c => (
                    <tr key={c.id_contrat} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{c.personnel_prenom} {c.personnel_nom}</div>
                        {c.is_cadre && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Cadre</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{c.type_contrat}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(c.date_embauche).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{c.salaire_base_mensuel.toLocaleString()} F</td>
                      <td className="px-4 py-4 text-center text-slate-600">{c.nb_parts_fiscales}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-emerald-600"><Edit2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bulletin Modal */}
      <AnimatePresence>
        {showBulletinModal && selectedBulletin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">Bulletin de Paie - {months[selectedBulletin.periode_mois - 1]} {selectedBulletin.periode_annee}</h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowBulletinModal(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 print:p-0">
                <div className="flex justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 uppercase">SOCIETE SA</h3>
                    <p className="text-slate-500">Dakar, Sénégal</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 uppercase font-bold tracking-wider">Bulletin N°</div>
                    <div className="text-xl font-mono font-bold text-slate-900">{selectedBulletin.id_bulletin.slice(0, 8)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Employé</div>
                    <div className="text-lg font-bold text-slate-900">{selectedBulletin.personnel_prenom} {selectedBulletin.personnel_nom}</div>
                    <div className="text-sm text-slate-600">Matricule: {selectedBulletin.id_personnel.slice(0, 6)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Période</div>
                    <div className="text-lg font-bold text-slate-900">{months[selectedBulletin.periode_mois - 1]} {selectedBulletin.periode_annee}</div>
                    <div className="text-sm text-slate-600">Date de calcul: {new Date(selectedBulletin.date_calcul).toLocaleDateString()}</div>
                  </div>
                </div>

                <table className="w-full text-sm mb-8">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-2 text-left">Désignation</th>
                      <th className="py-2 text-right">Base</th>
                      <th className="py-2 text-right">Taux Sal.</th>
                      <th className="py-2 text-right">Retenue Sal.</th>
                      <th className="py-2 text-right">Taux Patr.</th>
                      <th className="py-2 text-right">Part Patr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulletinDetails.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 font-medium">{d.libelle_ligne}</td>
                        <td className="py-2 text-right font-mono">{d.base_calcul.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-400">{(d.taux_salarial * 100).toFixed(2)}%</td>
                        <td className="py-2 text-right font-mono text-slate-900">{d.montant_salarial > 0 ? d.montant_salarial.toLocaleString() : '-'}</td>
                        <td className="py-2 text-right text-slate-400">{(d.taux_patronal * 100).toFixed(2)}%</td>
                        <td className="py-2 text-right font-mono text-slate-600">{d.montant_patronal > 0 ? d.montant_patronal.toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold">
                      <td colSpan={3} className="py-4 text-right uppercase">Totaux</td>
                      <td className="py-4 text-right font-mono">
                        {bulletinDetails.reduce((acc, curr) => acc + curr.montant_salarial, 0).toLocaleString()}
                      </td>
                      <td></td>
                      <td className="py-4 text-right font-mono">
                        {bulletinDetails.reduce((acc, curr) => acc + curr.montant_patronal, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-end">
                  <div className="w-full max-w-xs bg-emerald-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-xs uppercase font-bold opacity-80 mb-1">Net à Payer</div>
                    <div className="text-3xl font-bold font-mono">{selectedBulletin.net_a_payer.toLocaleString()} FCFA</div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-8 text-center">
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-8">Signature Employé</p>
                    <div className="h-16"></div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-8">Signature Employeur</p>
                    <div className="h-16"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payroll;
