
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { BonLivraisonView, FinDeCessionView } from '../types';
import { FileText, Gift } from 'lucide-react';

export const Views = () => {
  const [activeTab, setActiveTab] = useState<'bon_livraison' | 'fin_cession'>('bon_livraison');
  const [blData, setBlData] = useState<BonLivraisonView[]>([]);
  const [fcData, setFcData] = useState<FinDeCessionView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'bon_livraison') {
        const data = await db.getBonLivraisonViews();
        setBlData(data);
      } else if (activeTab === 'fin_cession') {
        const data = await db.getFinDeCessionViews();
        setFcData(data);
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vues & Rapports</h1>
          <p className="text-muted-foreground text-sm">Consulter les données consolidées des projets.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('bon_livraison')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'bon_livraison' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <FileText size={18} /> Bon de Livraison
          </button>
          <button 
            onClick={() => setActiveTab('fin_cession')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'fin_cession' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Gift size={18} /> Bon de Fin de Cession
          </button>
        </div>

        <div className="p-0">
          {activeTab === 'bon_livraison' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">N° BL</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Opérateur</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Localisation</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Projet / Phase</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-right">Tonnage Chargé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement des données...</td></tr>
                  ) : blData.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucune donnée disponible.</td></tr>
                  ) : (
                    blData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-foreground">{item.bl_number}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{item.operator_name}</span>
                            {item.operator_coop_name && (
                              <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {item.commune}, {item.department}, {item.region}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="text-sm text-foreground">Phase {item.numero_phase}</span>
                             <span className="text-xs text-muted-foreground font-mono">Bon: {item.project_num_bon}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-primary">
                          {item.tonnage_loaded} T
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'fin_cession' && (
             <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Opérateur</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Localisation</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Phase Projet</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-center">Nbr Livraisons</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-right">Tonnage Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement des données...</td></tr>
                  ) : fcData.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucune donnée disponible.</td></tr>
                  ) : (
                    fcData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{item.operator_name}</span>
                            {item.operator_coop_name && (
                              <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {item.commune}, {item.department}, {item.region}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                           Phase {item.project_phase}
                        </td>
                         <td className="px-6 py-4 text-center font-mono text-sm text-foreground">
                           {item.deliveries_count}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-primary">
                          {item.total_tonnage} T
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
