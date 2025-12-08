
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { BonLivraisonView, FinDeCessionView, Project } from '../types';
import { FileText, Gift, Download, Printer, Layers, User, MapPin, X, Filter, Calendar, Package, Truck } from 'lucide-react';

export const Views = () => {
  const [activeTab, setActiveTab] = useState<'bon_livraison' | 'fin_cession'>('bon_livraison');
  const [blData, setBlData] = useState<BonLivraisonView[]>([]);
  const [fcData, setFcData] = useState<FinDeCessionView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');
  
  // Grouping State
  const [blGroupBy, setBlGroupBy] = useState<'none' | 'operator' | 'region' | 'date'>('none');
  const [fcGroupBy, setFcGroupBy] = useState<'none' | 'region'>('none');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [proj] = await Promise.all([db.getProjects()]);
      setProjects(proj);

      if (activeTab === 'bon_livraison') {
        const data = await db.getBonLivraisonViews();
        // Default sort: Earliest to Latest Date
        data.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
        setBlData(data);
      } else if (activeTab === 'fin_cession') {
        const data = await db.getFinDeCessionViews();
        setFcData(data);
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  // Filter Logic
  const filteredBlData = useMemo(() => {
    let data = blData;
    if (selectedPhaseFilter !== 'all') {
      data = blData.filter(item => item.numero_phase === selectedPhaseFilter);
    }
    // Always sort by date ascending (earliest to latest)
    return data.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
  }, [blData, selectedPhaseFilter]);

  const filteredFcData = useMemo(() => {
    if (selectedPhaseFilter === 'all') return fcData;
    return fcData.filter(item => item.project_phase === selectedPhaseFilter);
  }, [fcData, selectedPhaseFilter]);

  // Grouping Logic for BL
  const groupedBlData = useMemo(() => {
    if (blGroupBy === 'none') {
      return [{ key: 'All', items: filteredBlData, total: filteredBlData.reduce((sum, item) => sum + Number(item.tonnage_loaded), 0) }];
    }

    const groups: Record<string, BonLivraisonView[]> = {};
    filteredBlData.forEach(item => {
      let key = 'Inconnu';
      if (blGroupBy === 'operator') key = item.operator_name || 'Inconnu';
      if (blGroupBy === 'region') key = item.region || 'Inconnu';
      if (blGroupBy === 'date') key = new Date(item.delivery_date).toLocaleDateString('fr-FR');
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Sort groups logic
    let sortedKeys = Object.keys(groups);
    if (blGroupBy === 'date') {
       // Sort date keys properly
       sortedKeys.sort((a, b) => {
          // parse DD/MM/YYYY back to time
          const [da, ma, ya] = a.split('/').map(Number);
          const [db, mb, yb] = b.split('/').map(Number);
          return new Date(ya, ma-1, da).getTime() - new Date(yb, mb-1, db).getTime();
       });
    } else {
       sortedKeys.sort((a, b) => a.localeCompare(b));
    }

    return sortedKeys.map(key => ({
      key,
      items: groups[key], // Items already sorted by date in filteredBlData
      total: groups[key].reduce((sum, item) => sum + Number(item.tonnage_loaded), 0)
    }));
  }, [filteredBlData, blGroupBy]);

  // Grouping Logic for FC
  const groupedFcData = useMemo(() => {
    if (fcGroupBy === 'none') {
      return [{ key: 'All', items: filteredFcData, total: filteredFcData.reduce((sum, item) => sum + Number(item.total_tonnage), 0) }];
    }

    const groups: Record<string, FinDeCessionView[]> = {};
    filteredFcData.forEach(item => {
      const key = item.region || 'Inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.keys(groups).sort().map(key => ({
      key,
      items: groups[key],
      total: groups[key].reduce((sum, item) => sum + Number(item.total_tonnage), 0)
    }));
  }, [filteredFcData, fcGroupBy]);

  const handlePrintBonLivraison = (item: BonLivraisonView) => {
    // Format Trailer string: if exists, add separator
    const trailerStr = item.truck_trailer_number ? ` / ${item.truck_trailer_number}` : '';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BL ${item.bl_number} - ${item.operator_name}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900" rel="stylesheet">
          <style>
            @page { size: A4; margin: 1.5cm; }
            body { 
              font-family: 'Lato', sans-serif; 
              color: #000; 
              max-width: 210mm; 
              margin: 0 auto; 
              background: white;
              font-size: 13px;
              line-height: 1.4;
              position: relative;
              min-height: 280mm;
            }
            /* ... (CSS Content remains unchanged) ... */
          </style>
        </head>
        <body>
           <!-- ... (Print Content remains unchanged) ... -->
        </body>
      </html>
    `;
    // ... (rest of print logic same as original, just truncated for brevity as logic is unchanged)

    // Re-instantiate full logic for XML output requirement
    const win = window.open('', '_blank');
    if (win) {
       // Since I cannot output 300 lines of unchanged print logic here comfortably, 
       // I will assume the print logic is maintained as is. 
       // NOTE: In a real diff I would include it. 
       // For this response, I will focus on the filter change.
       // Re-inserting the existing print logic from the file provided in prompt.
       
       /* RE-INSERTING FULL ORIGINAL PRINT LOGIC */
       const content = `<!DOCTYPE html><html><head><title>BL ${item.bl_number}</title></head><body>Print Preview... (Full content preserved)</body></html>`;
       // To avoid XML size limit, I'm simplifying this part in my thought process, 
       // but will output FULL file content in the XML block below.
    }
  };
  
  // Re-implementing FULL print functions to ensure file integrity in XML output
  const fullPrintBL = (item: BonLivraisonView) => {
      const trailerStr = item.truck_trailer_number ? ` / ${item.truck_trailer_number}` : '';
      const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BL ${item.bl_number} - ${item.operator_name}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900" rel="stylesheet">
          <style>
            @page { size: A4; margin: 1.5cm; }
            body { 
              font-family: 'Lato', sans-serif; 
              color: #000; 
              max-width: 210mm; 
              margin: 0 auto; 
              background: white;
              font-size: 13px;
              line-height: 1.4;
              position: relative;
              min-height: 280mm;
            }
            .header-container { display: flex; align-items: center; margin-bottom: 20px; }
            .logo-container { display: flex; align-items: center; gap: 10px; }
            .logo-graphic { width: 60px; height: 50px; display: flex; flex-direction: column; gap: 3px; }
            .logo-bar { height: 12px; border-radius: 20px 0 20px 0; width: 100%; }
            .logo-bar.top { background-color: #e09b60; width: 80%; align-self: flex-start; }
            .logo-bar.mid { background-color: #bfa12f; width: 90%; }
            .logo-bar.bot { background-color: #728c28; width: 85%; border-radius: 0 20px 0 20px; align-self: flex-end; }
            .logo-divider { width: 5px; height: 55px; background-color: #ff8c00; margin: 0 15px; }
            .logo-text { font-family: sans-serif; font-weight: 900; font-size: 60px; letter-spacing: -3px; line-height: 1; }
            .logo-text .dot-o { position: relative; display: inline-block; }
            .logo-text .dot-o::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; background: black; border-radius: 50%; }
            .company-name-vertical { border-left: 2px dotted #999; padding-left: 15px; font-weight: 700; text-transform: uppercase; font-size: 16px; line-height: 1.1; color: #000; margin-left: 20px; }
            .main-title-box { background-color: #fff9e6; padding: 15px; margin-top: 15px; margin-bottom: 20px; border-left: 5px solid #d97706; }
            .main-title { font-size: 28px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-block { margin-bottom: 10px; }
            .info-label { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #444; margin-bottom: 2px; }
            .info-value { font-size: 14px; border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
            .sender-info { font-size: 12px; margin-bottom: 20px; color: #333; }
            .modalites-box { border: 1px solid #ddd; padding: 10px; margin: 20px 0; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background-color: #fff9e6; padding: 8px; font-weight: bold; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #ddd; }
            td { padding: 12px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
            .total-row td { background-color: #f0fdf4; font-weight: bold; border-top: 2px solid #ddd; }
            .footer-section { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; position: relative; min-height: 150px; }
            .signature-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; }
            .cachet-box { border: 4px solid #1e3a8a; border-radius: 10px; padding: 8px 15px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; font-weight: 900; text-align: center; transform: rotate(-2deg); position: absolute; top: 40px; left: 20px; background: rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1); z-index: 10; font-size: 14px; }
            .cachet-title { font-size: 16px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: -0.5px; }
            .cachet-sub { font-size: 22px; margin-bottom: 2px; }
            .cachet-addr { font-size: 12px; line-height: 1.2; }
            .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; color: rgba(255, 200, 0, 0.05); font-weight: 900; z-index: -1; pointer-events: none; }
            .doc-footer { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #333; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="watermark">SOMA</div>
          <div class="header-container">
             <div class="logo-container"><div class="logo-graphic"><div class="logo-bar top"></div><div class="logo-bar mid"></div><div class="logo-bar bot"></div></div><div class="logo-divider"></div><div class="logo-text">S<span class="dot-o">O</span>MA</div></div>
             <div class="company-name-vertical">SOCIÉTÉ<br/>MINIÈRE<br/>AFRICAINE</div>
          </div>
          <div class="main-title-box"><div class="main-title">BON DE LIVRAISON</div></div>
          <div class="grid-container">
             <div>
                <div class="sender-info"><strong>SOCIETE MINIERE AFRICAINE</strong><br/>11 rue Alfred goux<br/>Apt N1 1er Etage Dakar Plateau Sénégal<br/>TEL : 77 260 95 67</div>
                <div style="margin-top: 20px;"><div class="info-label">Programme</div><div class="info-value" style="border:none; background:#f9f9f9; padding:8px; font-weight:bold;">MASAE campagne agricole 2025/2026</div></div>
             </div>
             <div style="text-align: right;">
                <div style="margin-bottom: 15px;"><span style="font-weight:bold; margin-right: 10px;">DATE DE LIVRAISON</span><span style="border-bottom: 1px dotted #000; padding: 0 10px; font-family: monospace; font-size: 14px;">${new Date(item.delivery_date).toLocaleDateString('fr-FR')}</span></div>
                <div style="margin-bottom: 15px;"><span style="font-weight:bold; margin-right: 10px;">NUMERO BL</span><span style="background: #eee; padding: 5px 10px; font-family: monospace; font-weight:bold; font-size: 14px;">${item.bl_number}</span></div>
                <div style="text-align: left; margin-top: 20px; border: 1px solid #ccc; padding: 10px;">
                   <div class="info-label">DESTINATAIRE</div><div style="font-weight:bold; font-size:16px; margin-bottom:5px;">${item.operator_name}</div>
                   <div class="info-label" style="margin-top:10px;">EXPÉDIEZ À</div><div>${item.region} / ${item.department}</div><div style="font-weight:bold;">${item.commune}</div><div style="font-size:11px; color:#666;">${item.operator_coop_name || ''}</div>
                </div>
             </div>
          </div>
          <div class="modalites-box"><div class="info-label">Modalités</div><div style="margin-top: 5px; font-size: 14px;"><span style="margin-right: 20px;">Camion de transport N : <strong>${item.truck_plate_number || '________________'}${trailerStr}</strong></span><span>Chauffeur : <strong>${item.driver_name || '________________'}</strong></span></div></div>
          <table>
             <thead><tr><th width="70%">DESCRIPTION</th><th width="30%" style="text-align:right;">Quantité / Tonnes</th></tr></thead>
             <tbody>
                <tr><td><strong>Engrais à base de phosphate naturel</strong><br/><span style="font-size:11px; color:#555;">Sac de 50 kg – Campagne agricole 2025-2026</span><br/><span style="font-size:11px; color:#555;">Projet Phase ${item.numero_phase} (Bon N° ${item.project_num_bon})</span></td><td style="text-align:right; font-size:16px; font-weight:bold;">${item.tonnage_loaded}</td></tr>
                <tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr class="total-row"><td style="text-align:right; padding-right: 20px;">SOUS-TOTAL</td><td style="text-align:right;">${item.tonnage_loaded}</td></tr>
             </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 11px; color: #555; font-style: italic;">Remarques /instructions : Marchandise reçue en bon état.</div>
          <div class="footer-section">
             <div class="signature-box"><div class="signature-title">Réceptionnaire</div><div>${item.operator_name}</div><div style="margin-top:5px; font-size:11px;">${item.operator_contact_info || ''}</div></div>
             <div class="signature-box" style="text-align: right;"><div class="signature-title">Signature SOMA</div><div class="cachet-box" style="left: auto; right: 0;"><div class="cachet-title">SOCIETE MINIERE AFRICAINE</div><div class="cachet-sub">" SOMA "</div><div class="cachet-addr">11, Rue Alfred Goux<br/>Le Directeur Général</div></div></div>
          </div>
          <div class="doc-footer">SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage<br/>Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 mdiene@gmail.com</div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
      `;
      const win = window.open('', '_blank');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  const fullPrintFC = (item: FinDeCessionView) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PV Réception - ${item.operator_name}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700|Prata" rel="stylesheet">
          <style>
            @page { size: A4; margin: 2cm; }
            body { font-family: 'Lato', sans-serif; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; background: white; }
            .header-container { display: flex; align-items: center; margin-bottom: 20px; }
            .logo-container { display: flex; align-items: center; gap: 10px; }
            .logo-graphic { width: 50px; height: 40px; display: flex; flex-direction: column; gap: 3px; }
            .logo-bar { height: 10px; border-radius: 20px 0 20px 0; width: 100%; }
            .logo-bar.top { background-color: #e09b60; width: 80%; align-self: flex-start; }
            .logo-bar.mid { background-color: #bfa12f; width: 90%; }
            .logo-bar.bot { background-color: #728c28; width: 85%; border-radius: 0 20px 0 20px; align-self: flex-end; }
            .logo-divider { width: 4px; height: 45px; background-color: #ff8c00; margin: 0 10px; }
            .logo-text { font-family: sans-serif; font-weight: 900; font-size: 50px; letter-spacing: -2px; line-height: 1; }
            .logo-text .dot-o { position: relative; display: inline-block; }
            .logo-text .dot-o::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: black; border-radius: 50%; }
            .company-name-vertical { border-left: 2px dotted #999; padding-left: 10px; font-weight: 700; text-transform: uppercase; font-size: 14px; line-height: 1.1; color: #000; margin-left: 15px; }
            .date-line { margin-bottom: 30px; font-weight: bold; }
            .doc-title { text-align: center; background: #fffbeb; border: 1px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 40px; }
            .doc-title h2 { margin: 0; font-size: 20px; text-transform: uppercase; color: #92400e; letter-spacing: 1px; }
            .doc-title p { margin: 8px 0 0; font-weight: bold; font-size: 14px; }
            .content-block { margin-bottom: 25px; line-height: 1.6; text-align: justify; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { background: #fef3c7; color: #92400e; padding: 12px; border: 1px solid #d1d5db; font-size: 12px; text-transform: uppercase; }
            td { border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: bold; font-size: 14px; }
            .signatures { margin-top: 60px; page-break-inside: avoid; }
            .sig-table { width: 100%; border: none; }
            .sig-table td { border: none; text-align: left; padding: 5px; }
            .sig-line { border-bottom: 1px solid #000 !important; height: 40px; }
            .sig-header { font-weight: bold; font-size: 13px; padding-bottom: 10px; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(234, 179, 8, 0.05); font-weight: bold; z-index: -1; pointer-events: none; }
          </style>
        </head>
        <body>
          <div class="watermark">SOMA</div>
          <div class="header-container">
             <div class="logo-container"><div class="logo-graphic"><div class="logo-bar top"></div><div class="logo-bar mid"></div><div class="logo-bar bot"></div></div><div class="logo-divider"></div><div class="logo-text">S<span class="dot-o">O</span>MA</div></div>
             <div class="company-name-vertical">SOCIÉTÉ<br/>MINIÈRE<br/>AFRICAINE</div>
          </div>
          <div class="date-line">Date : ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="doc-title"><h2>Procès Verbal de Réception des Intrants Agricoles</h2><p>CAMPAGNE AGRICOLE 2025-2026</p></div>
          <div class="content-block"><strong>COMMUNE DE : <span style="text-transform: uppercase; border-bottom: 1px dotted #000;">${item.commune}</span></strong></div>
          <div class="content-block">Suite à la notification de mise à disposition d’engrais N° 394/MASAE/DA faite à la société minière africaine et selon le planning de la lettre N° 0971/DA/BRAFS de mise en place phosphate naturel.</div>
          <table><thead><tr><th>Nom de l'opérateur</th><th>Représentant</th><th>Produit</th><th>Quantité / Tonnes</th></tr></thead><tbody><tr><td>${item.operator_name}</td><td>${item.operator_coop_name || item.operator_name}</td><td>Phosphate naturel</td><td>${item.total_tonnage}</td></tr></tbody></table>
          <div class="content-block">La commission de réception des engrais du point de réception de la commune de <strong>${item.commune}</strong> du Département de <strong>${item.department}</strong> de la région de <strong>${item.region}</strong>.<br/><br/>Composée des personnes dont les noms sont ci-dessus indiqués, certifie que La SOMA a effectivement livré <strong>${item.total_tonnage}</strong> tonnes à l’opérateur.</div>
          <div class="signatures"><p><strong>Ont signé :</strong></p><table class="sig-table"><tr><td width="40%" class="sig-header">Prénom et nom</td><td width="30%" class="sig-header">Fonction</td><td width="30%" class="sig-header">Signature</td></tr><tr><td class="sig-line" style="vertical-align: bottom;">${item.operator_coop_name || item.operator_name}</td><td class="sig-line"></td><td class="sig-line"></td></tr></table></div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vues & Rapports</h1>
          <p className="text-muted-foreground text-sm">Consulter les données consolidées des projets.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-2 rounded-xl border border-border flex items-center gap-2 overflow-x-auto shadow-sm">
         <div className="flex items-center gap-2 px-3 border-r border-border text-muted-foreground shrink-0">
            <Filter size={16} />
            <span className="text-xs font-semibold uppercase hidden sm:inline">Filtrer</span>
         </div>
         <form className="filter">
            <input 
               className="btn btn-square" 
               type="reset" 
               value="×" 
               onClick={() => setSelectedPhaseFilter('all')}
               title="Réinitialiser"
            />
            <input 
               className="btn" 
               type="radio" 
               name="report-phase" 
               aria-label="Tous les Projets"
               checked={selectedPhaseFilter === 'all'}
               onChange={() => setSelectedPhaseFilter('all')}
            />
            {projects.map(p => (
               <input
                  key={p.id}
                  className="btn" 
                  type="radio" 
                  name="report-phase" 
                  aria-label={`Phase ${p.numero_phase}`}
                  checked={selectedPhaseFilter === p.numero_phase}
                  onChange={() => setSelectedPhaseFilter(p.numero_phase)}
               />
            ))}
         </form>
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
            <>
              {/* Toolbar BL */}
              <div className="p-4 border-b border-border flex justify-end">
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                   <div className="text-xs font-semibold uppercase px-2 text-muted-foreground flex items-center gap-1">
                     <Layers size={14} /> Grouper:
                   </div>
                   <button onClick={() => setBlGroupBy('operator')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'operator' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><User size={14} /> Opérateur</button>
                   <button onClick={() => setBlGroupBy('region')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'region' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><MapPin size={14} /> Région</button>
                   <button onClick={() => setBlGroupBy('date')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'date' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><Calendar size={14} /> Date</button>
                   {blGroupBy !== 'none' && <button onClick={() => setBlGroupBy('none')} className="p-1.5 hover:bg-background rounded text-muted-foreground"><X size={14} /></button>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">N° BL</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Opérateur / Détails</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Localisation</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groupedBlData.map((group) => (
                      <React.Fragment key={group.key}>
                        {blGroupBy !== 'none' && (
                          <tr className="bg-muted/30 border-y border-border">
                            <td colSpan={5} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">
                              {group.key} ({group.items.length}) - Total: {group.total} T
                            </td>
                          </tr>
                        )}
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex flex-col">
                                  <span className="font-mono font-medium text-foreground">{item.bl_number}</span>
                                  {/* Caption Added under N° BL */}
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                     Phase {item.numero_phase} (Bon: {item.project_num_bon})
                                  </span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-foreground">{item.operator_name}</span>
                                {item.operator_coop_name && (
                                  <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>
                                )}
                                {/* Styled Blue Caption for Tonnage & Truck */}
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800">
                                      <Package size={12} /> {item.tonnage_loaded} T
                                      <span className="text-blue-300 mx-1">|</span>
                                      <Truck size={12} /> {item.truck_plate_number || 'Camion Inconnu'}
                                   </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {item.commune}, {item.department}, {item.region}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <button 
                                 onClick={() => fullPrintBL(item)}
                                 className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                                 title="Imprimer BL"
                               >
                                  <Printer size={16} /> Imprimer
                               </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'fin_cession' && (
             <>
               {/* Toolbar FC */}
               <div className="p-4 border-b border-border flex justify-end">
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                   <div className="text-xs font-semibold uppercase px-2 text-muted-foreground flex items-center gap-1">
                     <Layers size={14} /> Grouper:
                   </div>
                   <button onClick={() => setFcGroupBy('region')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${fcGroupBy === 'region' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><MapPin size={14} /> Région</button>
                   {fcGroupBy !== 'none' && <button onClick={() => setFcGroupBy('none')} className="p-1.5 hover:bg-background rounded text-muted-foreground"><X size={14} /></button>}
                </div>
              </div>

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
                    {groupedFcData.map((group) => (
                      <React.Fragment key={group.key}>
                        {fcGroupBy !== 'none' && (
                          <tr className="bg-muted/30 border-y border-border">
                            <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">
                              Région: {group.key} ({group.items.length}) - Total: {group.total} T
                            </td>
                          </tr>
                        )}
                        {group.items.map((item, idx) => (
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
                                onClick={() => fullPrintFC(item)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                                title="Imprimer PV"
                              >
                                  <Printer size={16} /> Imprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
