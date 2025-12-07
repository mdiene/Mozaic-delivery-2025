import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { BonLivraisonView, FinDeCessionView } from '../types';
import { FileText, Gift, Download, Printer } from 'lucide-react';

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

  const handlePrintFinDeCession = (item: FinDeCessionView) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PV Réception - ${item.operator_name}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700|Prata" rel="stylesheet">
          <style>
            @page { size: A4; margin: 2cm; }
            body { 
              font-family: 'Lato', sans-serif; 
              color: #111; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px;
              background: white;
            }
            h1, h2, h3, h4, .title-text { font-family: 'Prata', serif; }
            
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              border-bottom: 2px solid #eab308; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .logo-section { display: flex; align-items: center; gap: 15px; }
            .logo-text { font-size: 42px; font-weight: bold; letter-spacing: -1px; }
            .logo-text span { color: #d97706; } /* SOMA colors */
            
            .company-info { 
              text-align: right; 
              font-size: 11px; 
              line-height: 1.5; 
              color: #444;
            }
            .company-info strong { font-size: 12px; color: #000; text-transform: uppercase; }

            .date-line { margin-bottom: 30px; font-weight: bold; }

            .doc-title {
              text-align: center;
              background: #fffbeb;
              border: 1px solid #eab308;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 40px;
            }
            .doc-title h2 { 
              margin: 0; 
              font-size: 20px; 
              text-transform: uppercase; 
              color: #92400e; 
              letter-spacing: 1px;
            }
            .doc-title p { margin: 8px 0 0; font-weight: bold; font-size: 14px; }

            .content-block { margin-bottom: 25px; line-height: 1.6; text-align: justify; font-size: 14px; }
            
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { 
              background: #fef3c7; 
              color: #92400e; 
              padding: 12px; 
              border: 1px solid #d1d5db; 
              font-size: 12px; 
              text-transform: uppercase; 
            }
            td { 
              border: 1px solid #d1d5db; 
              padding: 12px; 
              text-align: center; 
              font-weight: bold; 
              font-size: 14px;
            }

            .signatures { margin-top: 60px; page-break-inside: avoid; }
            .sig-table { width: 100%; border: none; }
            .sig-table td { border: none; text-align: left; padding: 5px; }
            .sig-line { border-bottom: 1px solid #000 !important; height: 40px; }
            .sig-header { font-weight: bold; font-size: 13px; padding-bottom: 10px; }

            /* Watermark effect */
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(234, 179, 8, 0.05);
              font-weight: bold;
              z-index: -1;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <div class="watermark">SOMA</div>
          
          <div class="header">
            <div class="logo-section">
               <!-- Placeholder for Logo Image, using CSS text for now as per instructions -->
               <div class="logo-text"><span>S</span>OMA</div>
            </div>
            <div class="company-info">
              <strong>Société Minière Africaine</strong><br/>
              SARL au capital de 10 000 000 F CFA<br/>
              11 rue Alfred goux Apt N1 1er Etage<br/>
              Tel: +221 77 247 25 00<br/>
              mdiene@gmail.com
            </div>
          </div>

          <div class="date-line">
            Date : ${new Date().toLocaleDateString('fr-FR')}
          </div>

          <div class="doc-title">
            <h2>Procès Verbal de Réception des Intrants Agricoles</h2>
            <p>CAMPAGNE AGRICOLE 2025-2026</p>
          </div>

          <div class="content-block">
            <strong>COMMUNE DE : <span style="text-transform: uppercase; border-bottom: 1px dotted #000;">${item.commune}</span></strong>
          </div>

          <div class="content-block">
            Suite à la notification de mise à disposition d’engrais N° 394/MASAE/DA faite à la société minière africaine 
            et selon le planning de la lettre N° 0971/DA/BRAFS de mise en place phosphate naturel.
          </div>

          <table>
            <thead>
              <tr>
                <th>Nom de l'opérateur</th>
                <th>Représentant</th>
                <th>Produit</th>
                <th>Quantité / Tonnes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${item.operator_name}</td>
                <td>${item.operator_coop_name || item.operator_name}</td>
                <td>Phosphate naturel</td>
                <td>${item.total_tonnage}</td>
              </tr>
            </tbody>
          </table>

          <div class="content-block">
            La commission de réception des engrais du point de réception de la commune de <strong>${item.commune}</strong> 
            du Département de <strong>${item.department}</strong> de la région de <strong>${item.region}</strong>.
            <br/><br/>
            Composée des personnes dont les noms sont ci-dessus indiqués, certifie que La SOMA a effectivement livré 
            <strong>${item.total_tonnage}</strong> tonnes à l’opérateur.
          </div>

          <div class="signatures">
            <p><strong>Ont signé :</strong></p>
            <table class="sig-table">
              <tr>
                <td width="40%" class="sig-header">Prénom et nom</td>
                <td width="30%" class="sig-header">Fonction</td>
                <td width="30%" class="sig-header">Signature</td>
              </tr>
              <tr>
                <td class="sig-line" style="vertical-align: bottom;">${item.operator_coop_name || item.operator_name}</td>
                <td class="sig-line"></td>
                <td class="sig-line"></td>
              </tr>
            </table>
          </div>

          <script>
             window.onload = () => { setTimeout(() => window.print(), 500); }
          </script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
    }
  };

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
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement des données...</td></tr>
                  ) : fcData.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucune donnée disponible.</td></tr>
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
                        <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => handlePrintFinDeCession(item)}
                             className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                             title="Imprimer PV"
                           >
                              <Printer size={16} /> Imprimer
                           </button>
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