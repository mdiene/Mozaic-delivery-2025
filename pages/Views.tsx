import React, { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { db } from '../services/db';
import { BonLivraisonView, FinDeCessionView, Project } from '../types';
import { FileText, Gift, Printer, Layers, User, MapPin, X, Filter, Calendar, Package, Truck, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// SOMA Logo CSS provided by user
const SOMA_LOGO_STYLES = `
  :root {
    --soma-orange: #f0a243;
    --soma-gold: #c9b037;
    --soma-green: #7eb344;
    --soma-black: #1a1a1b;
  }
  .soma-container {
    display: inline-flex;
    align-items: center;
    font-family: 'Arial Black', 'Helvetica', sans-serif;
    gap: 15px;
    padding: 10px 0;
  }
  .leaf-stack { display: flex; flex-direction: column; gap: 4px; }
  .leaf { width: 45px; height: 18px; border-radius: 0 100px 0 100px; }
  .orange { background-color: var(--soma-orange) !important; }
  .gold { background-color: var(--soma-gold) !important; }
  .green { background-color: var(--soma-green) !important; }
  .divider { width: 4px; height: 65px; background-color: var(--soma-orange) !important; }
  .main-text { font-size: 60px; color: var(--soma-black); letter-spacing: -2px; display: flex; align-items: center; line-height: 1; font-weight: 900; }
  .o-dot { position: relative; display: inline-block; }
  .o-dot::after { content: ''; position: absolute; width: 8px; height: 8px; background-color: var(--soma-black); border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .tagline { font-family: 'Arial', sans-serif; font-size: 14px; font-weight: bold; color: var(--soma-black); line-height: 1.1; border-left: 1px solid #ccc; padding-left: 10px; letter-spacing: 0.5px; }
  @media print { 
    .leaf, .divider { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    .o-dot::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .fc-page { page-break-after: always; position: relative; }
  }
`;

// SOMA Logo HTML provided by user
const SOMA_LOGO_HTML = `
  <div class="soma-container">
    <div class="leaf-stack">
      <div class="leaf orange"></div>
      <div class="leaf gold"></div>
      <div class="leaf green"></div>
    </div>
    <div class="divider"></div>
    <div class="main-text">S<span class="o-dot">O</span>MA</div>
    <div class="tagline">SOCIÉTÉ<br>MINIÈRE<br>AFRICAINE</div>
  </div>
`;

/**
 * Procedural drawing of the SOMA logo for jsPDF to match the SOMA_LOGO_HTML design perfectly
 */
const drawSomaHeaderOnPdf = (doc: jsPDF, x: number, y: number) => {
  const leafWidth = 10;
  const leafHeight = 4;
  const leafGap = 1;
  
  // Three colored leaves
  doc.setFillColor(240, 162, 67); // Orange
  doc.roundedRect(x, y, leafWidth, leafHeight, 1.5, 1.5, 'F');
  
  doc.setFillColor(201, 176, 55); // Gold
  doc.roundedRect(x, y + leafHeight + leafGap, leafWidth, leafHeight, 1.5, 1.5, 'F');
  
  doc.setFillColor(126, 179, 68); // Green
  doc.roundedRect(x, y + 2 * (leafHeight + leafGap), leafWidth, leafHeight, 1.5, 1.5, 'F');
  
  // Orange divider line
  doc.setFillColor(240, 162, 67);
  doc.rect(x + leafWidth + 3, y, 1, 15, 'F');
  
  // SOMA Text
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 27);
  const textX = x + leafWidth + 8;
  doc.text("SOMA", textX, y + 11);
  
  // The dot in the 'O'
  doc.setFillColor(26, 26, 27);
  doc.circle(textX + 11.5, y + 6.5, 1, 'F');
  
  // Tagline
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.1);
  doc.line(textX + 32, y, textX + 32, y + 15);
  
  doc.text("SOCIÉTÉ", textX + 35, y + 4.5);
  doc.text("MINIÈRE", textX + 35, y + 9);
  doc.text("AFRICAINE", textX + 35, y + 13.5);
};

export const Views = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = user?.role === 'MANAGER';

  const activeTab = isManager ? 'bon_livraison' : (searchParams.get('tab') as 'bon_livraison' | 'fin_cession') || 'bon_livraison';
  
  const setActiveTab = (tab: 'bon_livraison' | 'fin_cession') => {
    if (isManager && tab === 'fin_cession') return;
    setSearchParams({ tab });
  };

  const [blData, setBlData] = useState<BonLivraisonView[]>([]);
  const [fcData, setFcData] = useState<FinDeCessionView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  
  const [blGroupBy, setBlGroupBy] = useState<'none' | 'operator' | 'region' | 'date'>('date');
  const [fcGroupBy, setFcGroupBy] = useState<'none' | 'region'>('none');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const proj = await db.getProjects();
        setProjects(proj);
        const phase3 = proj.find(p => p.numero_phase === 3 && p.project_visibility !== false);
        if (phase3) setSelectedPhaseFilter(phase3.numero_phase);
      } catch (e) { console.error("Error loading projects:", e); }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (dateRangeInputRef.current && (window as any).flatpickr) {
      const fp = (window as any).flatpickr(dateRangeInputRef.current, {
        mode: 'range',
        dateFormat: "Y-m-d",
        onChange: (selectedDates: Date[]) => {
          if (selectedDates.length === 2) setDateRange({ start: selectedDates[0], end: selectedDates[1] });
          else setDateRange({ start: null, end: null });
        }
      });
      return () => fp.destroy();
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'bon_livraison') {
        const data = await db.getBonLivraisonViews();
        data.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
        setBlData(data);
      } else if (activeTab === 'fin_cession' && !isManager) {
        const data = await db.getFinDeCessionViews();
        setFcData(data);
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab, isManager]);

  const filteredBlData = useMemo(() => {
    let data = blData;
    if (selectedPhaseFilter !== 'all') data = data.filter(item => item.numero_phase === selectedPhaseFilter);
    if (dateRange.start && dateRange.end) {
      data = data.filter(item => {
        if (!item.delivery_date) return false;
        const itemDate = new Date(item.delivery_date);
        itemDate.setHours(0,0,0,0);
        const start = new Date(dateRange.start!); start.setHours(0,0,0,0);
        const end = new Date(dateRange.end!); end.setHours(23,59,59,999);
        return itemDate >= start && itemDate <= end;
      });
    }
    return data.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  }, [blData, selectedPhaseFilter, dateRange]);

  const filteredFcData = useMemo(() => {
    if (selectedPhaseFilter === 'all') return fcData;
    return fcData.filter(item => item.project_phase === selectedPhaseFilter);
  }, [fcData, selectedPhaseFilter]);
  
  const visibleProjects = useMemo(() => projects.filter(p => p.project_visibility !== false), [projects]);

  const groupedBlData = useMemo(() => {
    if (blGroupBy === 'none') return [{ key: 'All', items: filteredBlData, total: filteredBlData.reduce((sum, item) => sum + Number(item.tonnage_loaded), 0) }];
    const groups: Record<string, BonLivraisonView[]> = {};
    filteredBlData.forEach(item => {
      let key = 'Inconnu';
      if (blGroupBy === 'operator') key = item.operator_name || 'Inconnu';
      if (blGroupBy === 'region') key = item.region || 'Inconnu';
      if (blGroupBy === 'date') key = new Date(item.delivery_date).toLocaleDateString('fr-FR');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    let sortedKeys = Object.keys(groups);
    if (blGroupBy === 'date') {
       sortedKeys.sort((a, b) => {
          const partsA = a.split('/'); const partsB = b.split('/');
          if (partsA.length !== 3 || partsB.length !== 3) return a.localeCompare(b);
          return new Date(parseInt(partsB[2]), parseInt(partsB[1])-1, parseInt(partsB[0])).getTime() - new Date(parseInt(partsA[2]), parseInt(partsA[1])-1, parseInt(partsA[0])).getTime();
       });
    } else sortedKeys.sort((a, b) => a.localeCompare(b));
    return sortedKeys.map(key => ({ key, items: groups[key], total: groups[key].reduce((sum, item) => sum + Number(item.tonnage_loaded), 0) }));
  }, [filteredBlData, blGroupBy]);

  const groupedFcData = useMemo(() => {
    if (fcGroupBy === 'none') return [{ key: 'All', items: filteredFcData, total: filteredFcData.reduce((sum, item) => sum + Number(item.total_tonnage), 0) }];
    const groups: Record<string, FinDeCessionView[]> = {};
    filteredFcData.forEach(item => {
      const key = item.region || 'Inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.keys(groups).sort().map(key => ({ key, items: groups[key], total: groups[key].reduce((sum, item) => sum + Number(item.total_tonnage), 0) }));
  }, [filteredFcData, fcGroupBy]);

  const handleExportCSV = () => {
    const data = activeTab === 'bon_livraison' ? filteredBlData : filteredFcData;
    if (!data.length) return alert('Aucune donnée à exporter');
    const headers = activeTab === 'bon_livraison' ? ['N° BL', 'Date', 'Opérateur', 'Coopérative', 'Région', 'Département', 'Commune', 'Camion', 'Chauffeur', 'Tonnage', 'Phase'] : ['Opérateur', 'Coopérative', 'Région', 'Département', 'Commune', 'Phase', 'Nbr Livraisons', 'Tonnage Total'];
    const csvContent = [headers.join(','), ...data.map(row => {
      const escape = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;
      if (activeTab === 'bon_livraison') {
        const item = row as BonLivraisonView;
        return [item.bl_number, item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('fr-FR') : '', escape(item.operator_name), escape(item.operator_coop_name), escape(item.region), escape(item.department), escape(item.commune), escape(item.truck_plate_number), escape(item.driver_name), item.tonnage_loaded, item.numero_phase].join(',');
      } else {
        const item = row as FinDeCessionView;
        return [escape(item.operator_name), escape(item.operator_coop_name), escape(item.region), escape(item.department), escape(item.commune), item.project_phase, item.deliveries_count, item.total_tonnage].join(',');
      }
    })].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url); link.setAttribute('download', `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  /**
   * Helper to build BL HTML Template
   */
  const getBLTemplate = (item: BonLivraisonView) => {
    const trailerStr = item.truck_trailer_number ? ` / ${item.truck_trailer_number}` : '';
    return `
      <div class="bl-page" style="page-break-after: always; min-height: 100vh; position: relative; padding: 20px;">
        <div class="header-container" style="display: flex; align-items: center; margin-bottom: 15px;">
           ${SOMA_LOGO_HTML}
        </div>
        <div style="background-color: #fff9e6; padding: 10px; margin-top: 10px; margin-bottom: 15px; border-left: 5px solid #d97706;">
           <div style="font-size: 24px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px;">BON DE LIVRAISON</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
           <div>
              <div style="font-size: 11px; margin-bottom: 15px; color: #333;"><strong>SOCIETE MINIERE AFRICAINE</strong><br/>11 rue Alfred goux<br/>Apt N1 1er Etage Dakar Plateau Sénégal<br/>TEL : 77 260 95 67</div>
              <div style="margin-top: 15px;"><div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #444; margin-bottom: 2px;">Programme</div><div style="background:#f9f9f9; padding:6px; font-weight:bold;">MASAE campagne agricole 2025/2026</div></div>
           </div>
           <div style="text-align: right;">
              <div style="margin-bottom: 10px;"><span style="font-weight:bold; margin-right: 10px;">DATE DE LIVRAISON</span><span style="border-bottom: 1px dotted #000; padding: 0 10px; font-family: monospace; font-size: 12px;">${new Date(item.delivery_date).toLocaleDateString('fr-FR')}</span></div>
              <div style="margin-bottom: 10px;"><span style="font-weight:bold; margin-right: 10px;">NUMERO BL</span><span style="background: #eee; padding: 4px 8px; font-family: monospace; font-weight:bold; font-size: 13px;">${item.bl_number}</span></div>
              <div style="text-align: left; margin-top: 15px; border: 1px solid #ccc; padding: 8px;">
                 <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #444; margin-bottom: 2px;">DESTINATAIRE</div><div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${item.operator_name}</div>
                 <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #444; margin-top:8px;">EXPÉDIEZ À</div><div>${item.region} / ${item.department}</div><div style="font-weight:bold;">${item.commune}</div>
              </div>
           </div>
        </div>
        <div style="border: 1px solid #ddd; padding: 12px; margin: 30px 0 20px 0; background: #f9fafb;">
          <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #444; margin-bottom: 2px;">Modalités</div>
          <div style="margin-top: 4px; font-size: 12px;">
            <span style="margin-right: 20px;">Camion: <strong>${item.truck_plate_number || '________________'}${trailerStr}</strong></span>
            <span>Chauffeur: <strong>${item.driver_name || '________________'}</strong></span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
           <thead><tr><th width="70%" style="text-align: left; background-color: #fff9e6; padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #ddd;">DESCRIPTION</th><th width="30%" style="text-align:right; background-color: #fff9e6; padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #ddd;">Quantité / Tonnes</th></tr></thead>
           <tbody>
              <tr><td style="padding: 18px 8px; border-bottom: 1px solid #eee; vertical-align: top;"><strong>Engrais à base de phosphate naturel</strong><br/><span>Sac de 50 kg – Campagne agricole 2025-2026</span><br/><span>Projet Phase ${item.numero_phase} (Bon N° ${item.project_num_bon})</span></td><td style="text-align:right; font-size:14px; font-weight:bold; padding: 18px 8px; border-bottom: 1px solid #eee; vertical-align: top;">${item.tonnage_loaded}</td></tr>
              <tr style="background-color: #f0fdf4; font-weight: bold;"><td style="text-align:right; padding-right: 20px; border-top: 2px solid #ddd; padding: 18px 8px;">SOUS-TOTAL</td><td style="text-align:right; border-top: 2px solid #ddd; padding: 18px 8px;">${item.tonnage_loaded}</td></tr>
           </tbody>
        </table>
        <div style="margin-top: 60px; display: flex; justify-content: space-between;">
           <div style="width: 45%; position: relative; min-height: 120px;"><strong>Réceptionnaire</strong><br/>${item.operator_name}</div>
           <div style="width: 45%; position: relative; min-height: 120px; text-align: right;">
              <strong>Signature SOMA</strong>
              <div style="border: 3px solid #1e3a8a; border-radius: 8px; padding: 5px 10px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; font-weight: 900; text-align: center; transform: rotate(-2deg); position: absolute; top: 30px; right: 0; background: rgba(255, 255, 255, 0.85); font-size: 12px;">SOCIETE MINIERE AFRICAINE<br/>" SOMA "<br/>Le Directeur Général</div>
           </div>
        </div>
        <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 9px; color: #333; border-top: 1px solid #ccc; padding-top: 8px;">SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage<br/>Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 mdiene@gmail.com</div>
      </div>
    `;
  };

  /**
   * Helper to build FC HTML Template with Watermark Leaf (SOMA text removed)
   */
  const getFCTemplate = (item: FinDeCessionView) => {
    return `
      <div class="fc-page" style="page-break-after: always; min-height: 100vh; position: relative; padding: 20px;">
        <div class="watermark" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.1; z-index: -1; pointer-events: none; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 40px; width: 100%; justify-content: center;">
          <div class="leaf-stack" style="transform: scale(6);">
            <div class="leaf orange"></div>
            <div class="leaf gold"></div>
            <div class="leaf green"></div>
          </div>
        </div>
        <div class="header-container" style="display: flex; align-items: center; margin-bottom: 20px;">
           ${SOMA_LOGO_HTML}
        </div>
        <div style="margin-bottom: 30px; font-weight: bold;">Date : ${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="text-align: center; background: #fffbeb; border: 1px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
           <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; color: #92400e; letter-spacing: 1px;">Procès Verbal de Réception des Intrants Agricoles</h2>
           <p style="margin: 8px 0 0; font-weight: bold; font-size: 14px;">CAMPAGNE AGRICOLE 2025-2026</p>
        </div>
        <div style="margin-bottom: 25px; line-height: 1.6; text-align: justify; font-size: 14px;"><strong>COMMUNE DE : <span style="text-transform: uppercase; border-bottom: 1px dotted #000;">${item.commune}</span></strong></div>
        <div style="margin-bottom: 25px; line-height: 1.6; text-align: justify; font-size: 14px;">Suite à la notification de mise à disposition d’engrais N° 394/MASAE/DA faite à la société minière africaine et selon le planning de la lettre N° 0971/DA/BRAFS de mise en place phosphate naturel.</div>
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
          <thead>
            <tr>
              <th style="background: #fef3c7; color: #92400e; padding: 12px; border: 1px solid #d1d5db; font-size: 12px; text-transform: uppercase;">Coopérative / GIE</th>
              <th style="background: #fef3c7; color: #92400e; padding: 12px; border: 1px solid #d1d5db; font-size: 12px; text-transform: uppercase;">Représentant</th>
              <th style="background: #fef3c7; color: #92400e; padding: 12px; border: 1px solid #d1d5db; font-size: 12px; text-transform: uppercase;">Produit</th>
              <th style="background: #fef3c7; color: #92400e; padding: 12px; border: 1px solid #d1d5db; font-size: 12px; text-transform: uppercase;">Quantité / Tonnes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: bold; font-size: 14px;">${item.operator_coop_name || item.operator_name}</td>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: bold; font-size: 14px;">${item.operator_name}</td>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: bold; font-size: 14px;">Phosphate naturel</td>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: bold; font-size: 14px;">${item.total_tonnage.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-bottom: 25px; line-height: 1.6; text-align: justify; font-size: 14px;">La commission de réception des engrais du point de réception de la commune de <strong>${item.commune}</strong> du Département de <strong>${item.department}</strong> de la région de <strong>${item.region}</strong>.<br/><br/>Composée des personnes dont les noms sont ci-dessus indiqués, certifie que La SOMA a effectivement livré <strong>${item.total_tonnage.toFixed(2)}</strong> tonnes à l’opérateur : <strong>${item.operator_coop_name || item.operator_name}</strong>.</div>
        <div style="margin-top: 60px; page-break-inside: avoid;">
           <p><strong>Ont signé :</strong></p>
           <table style="width: 100%; border: none;">
              <tr><td width="40%" style="font-weight: bold; font-size: 13px; padding-bottom: 10px; border: none; text-align: left;">Prénom et nom</td><td width="30%" style="font-weight: bold; font-size: 13px; padding-bottom: 10px; border: none; text-align: left;">Téléphone</td><td width="30%" style="font-weight: bold; font-size: 13px; padding-bottom: 10px; border: none; text-align: left;">Signature</td></tr>
              <tr><td style="border-bottom: 1px solid #000 !important; height: 40px; vertical-align: bottom; border: none; text-align: left;">${item.operator_name}</td><td style="border-bottom: 1px solid #000 !important; height: 40px; vertical-align: bottom; border: none; text-align: left;">${item.operator_phone || ''}</td><td style="border-bottom: 1px solid #000 !important; height: 40px; border: none; text-align: left;"></td></tr>
           </table>
        </div>
        <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 9px; color: #333; border-top: 1px solid #ccc; padding-top: 8px;">SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage Dakar Plateau<br/>Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 – email: mdiene@gmail.com</div>
      </div>
    `;
  };

  /**
   * Generalized Print Window function
   */
  const openPrintWindow = (htmlContent: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Le bloqueur de fenêtres contextuelles empêche l'impression.");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900" rel="stylesheet">
          <style>
            @page { size: A4; margin: 1cm; }
            body { font-family: 'Lato', sans-serif; color: #000; margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ${SOMA_LOGO_STYLES}
            .bl-page, .fc-page { width: 100%; box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = () => { 
              setTimeout(() => { 
                window.print(); 
                window.close(); 
              }, 800); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintSingleBL = (item: BonLivraisonView) => {
    openPrintWindow(getBLTemplate(item), `BL_${item.bl_number}`);
  };

  const handlePrintSingleFC = (item: FinDeCessionView) => {
    openPrintWindow(getFCTemplate(item), `PV_Cession_${item.operator_name}`);
  };

  const handlePrintAll = () => {
    if (activeTab === 'bon_livraison') {
      if (!filteredBlData.length) return alert('Aucun BL à imprimer');
      const content = filteredBlData.map(item => getBLTemplate(item)).join('');
      openPrintWindow(content, `Batch_BL_Ph${selectedPhaseFilter}`);
    } else {
      if (!filteredFcData.length) return alert('Aucun PV à imprimer');
      const content = filteredFcData.map(item => getFCTemplate(item)).join('');
      openPrintWindow(content, `Batch_FC_Ph${selectedPhaseFilter}`);
    }
  };

  /**
   * Generates a direct PDF for Bon de Livraison using jsPDF
   */
  const downloadBLPdf = async (item: BonLivraisonView) => {
    const fileName = `BL_${item.bl_number}_${item.operator_name.replace(/\s+/g, '_')}.pdf`;
    setDownloadingId(item.bl_number);
    try {
      const doc = new jsPDF();
      drawSomaHeaderOnPdf(doc, 15, 10);

      doc.setFillColor(255, 249, 230); doc.rect(15, 35, 180, 10, 'F');
      doc.setDrawColor(217, 119, 6); doc.setLineWidth(1.5); doc.line(15, 35, 15, 45);
      doc.setFontSize(16); doc.setTextColor(60, 60, 60); doc.text("BON DE LIVRAISON", 20, 42);

      doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
      doc.text("SOCIETE MINIERE AFRICAINE", 15, 55);
      doc.setFont("helvetica", "normal"); doc.text("11 rue Alfred goux", 15, 60);
      doc.text("Apt N1 1er Etage Dakar Plateau Sénégal", 15, 65); doc.text("TEL : 77 260 95 67", 15, 70);

      doc.setFont("helvetica", "bold"); doc.text("DATE DE LIVRAISON:", 120, 55);
      doc.setFont("helvetica", "normal"); doc.text(new Date(item.delivery_date).toLocaleDateString('fr-FR'), 165, 55);
      doc.setFont("helvetica", "bold"); doc.text("NUMÉRO BL:", 120, 62);
      doc.setFont("courier", "bold"); doc.text(item.bl_number, 165, 62);

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.1); doc.rect(120, 70, 75, 25);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text("DESTINATAIRE", 122, 74);
      doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
      doc.text(item.operator_name, 122, 80); doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`${item.commune}, ${item.region}`, 122, 86);

      autoTable(doc, {
        startY: 105,
        head: [['DESCRIPTION DES MARCHANDISES', 'QUANTITÉ / TONNES']],
        body: [
          [`Phosphate naturel enrichi - Campagne 2025/2026\nPROJET PHASE ${item.numero_phase}\nBON N° ${item.project_num_bon}`, { content: `${item.tonnage_loaded}`, styles: { halign: 'right', fontStyle: 'bold' } }],
          ['', ''],
          [{ content: 'TOTAL GÉNÉRAL', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] } }, { content: `${item.tonnage_loaded}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244] } }]
        ],
        theme: 'plain',
        headStyles: { fillColor: [255, 249, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5, lineWidth: { bottom: 0.1 } }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 30;
      doc.setFont("helvetica", "bold"); doc.text("LE RÉCEPTIONNAIRE", 15, finalY);
      doc.text("SIGNATURE & CACHET SOMA", 140, finalY); doc.setLineWidth(0.5);
      doc.line(15, finalY + 2, 60, finalY + 2); doc.line(140, finalY + 2, 185, finalY + 2);
      
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Generates a direct PDF for Fin de Cession using jsPDF with Watermark (SOMA text removed)
   */
  const downloadFCPdf = async (item: FinDeCessionView) => {
    const fileName = `PV_Cession_PH${item.project_phase}_${item.operator_name.replace(/\s+/g, '_')}.pdf`;
    const fcUniqueId = `FC-PH${item.project_phase}-${item.operator_id.slice(0, 4)}`;
    setDownloadingId(fcUniqueId);
    try {
      const doc = new jsPDF();

      // Watermark Leaf design only
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({opacity: 0.1});
      doc.setGState(gState);
      
      // Draw watermark leaf stack
      const wx = 105; const wy = 150;
      doc.setFillColor(240, 162, 67); doc.roundedRect(wx - 25, wy - 30, 50, 20, 5, 5, 'F');
      doc.setFillColor(201, 176, 55); doc.roundedRect(wx - 25, wy - 5, 50, 20, 5, 5, 'F');
      doc.setFillColor(126, 179, 68); doc.roundedRect(wx - 25, wy + 20, 50, 20, 5, 5, 'F');
      
      doc.restoreGraphicsState();

      drawSomaHeaderOnPdf(doc, 15, 10);

      doc.setFillColor(255, 251, 235); doc.setDrawColor(234, 179, 8); doc.setLineWidth(0.3);
      doc.roundedRect(15, 35, 180, 20, 2, 2, 'FD'); doc.setFontSize(14); doc.setTextColor(146, 64, 14);
      doc.setFont("helvetica", "bold"); doc.text("PROCÈS VERBAL DE RÉCEPTION DES INTRANTS AGRICOLES", 105, 45, { align: 'center' });
      doc.setFontSize(10); doc.text(`CAMPAGNE AGRICOLE 2025-2026 - PHASE ${item.project_phase}`, 105, 51, { align: 'center' });

      doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 15, 65);
      doc.setFont("helvetica", "bold"); const locationText = `COMMUNE DE : ${item.commune.toUpperCase()}`;
      doc.text(locationText, 15, 75); doc.setLineWidth(0.1); doc.line(15, 76, 15 + doc.getTextWidth(locationText), 76);

      const introText = doc.splitTextToSize("La commission de réception certifie que le tonnage suivant a été effectivement mis en place :", 180);
      doc.setFont("helvetica", "normal"); doc.text(introText, 15, 85);

      autoTable(doc, {
        startY: 95,
        head: [['COOPÉRATIVE / BÉNÉFICIAIRE', 'REPRÉSENTANT', 'PRODUIT', 'TOTAL LIVRÉ (T)']],
        body: [[item.operator_coop_name || item.operator_name, item.operator_name, 'Phosphate Naturel', { content: `${item.total_tonnage.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'center' } }]],
        theme: 'grid',
        headStyles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold', halign: 'center' }
      });

      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && projects.length === 0) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des rapports...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeTab === 'fin_cession' ? 'Bon de Fin de Cession' : 'Bon de Livraison'}
          </h1>
          <p className="text-muted-foreground text-sm">Consulter les données consolidées des projets.</p>
        </div>
        {!isManager && (
           <div className="flex gap-2 bg-muted p-1 rounded-lg">
              <button 
                 onClick={() => setActiveTab('bon_livraison')}
                 className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'bon_livraison' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                 Bon de Livraison
              </button>
              <button 
                 onClick={() => setActiveTab('fin_cession')}
                 className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'fin_cession' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                 Fin de Cession
              </button>
           </div>
        )}
      </div>

      <div className="bg-card p-2 rounded-xl border border-border flex items-center gap-4 overflow-x-auto shadow-sm min-h-[4rem]">
         <div className="flex items-center gap-2 px-3 border-r border-border text-muted-foreground shrink-0 h-full">
            <Filter size={16} />
            <span className="text-xs font-semibold uppercase hidden sm:inline">Filtrer</span>
         </div>
         <form className="filter shrink-0">
            <input className="btn btn-square" type="reset" value="×" onClick={() => setSelectedPhaseFilter('all')} title="Réinitialiser" />
            <input className="btn" type="radio" name="report-phase" aria-label="Tous les Projets" checked={selectedPhaseFilter === 'all'} onChange={() => setSelectedPhaseFilter('all')} />
            {visibleProjects.map(p => (
               <input key={p.id} className="btn" type="radio" name="report-phase" aria-label={`Phase ${p.numero_phase}`} checked={selectedPhaseFilter === p.numero_phase} onChange={() => setSelectedPhaseFilter(p.numero_phase)} />
            ))}
         </form>
         
         <div className="divider divider-horizontal text-muted-foreground text-xs mx-0">ou</div>

         <div className="relative max-w-sm shrink-0">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
               <Calendar size={16} className="text-muted-foreground" />
            </div>
            <input ref={dateRangeInputRef} type="text" className="input max-w-sm ps-10 cursor-pointer" placeholder="Période (Début à Fin)" id="flatpickr-range" />
            {dateRange.start && (
               <button onClick={() => { if (dateRangeInputRef.current && (window as any).flatpickr) (dateRangeInputRef.current as any)._flatpickr.clear(); }} className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground">
                 <X size={14} />
               </button>
            )}
         </div>

         <div className="ml-auto pl-4 border-l border-border flex items-center gap-2">
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
               <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Exporter CSV</span>
            </button>
            <button onClick={handlePrintAll} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
               <Printer size={16} /> <span className="hidden sm:inline">Imprimer Tout</span>
            </button>
         </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-0">
          {activeTab === 'bon_livraison' && (
            <>
              <div className="p-4 border-b border-border flex justify-end">
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                   <div className="text-xs font-semibold uppercase px-2 text-muted-foreground flex items-center gap-1"><Layers size={14} /> Grouper:</div>
                   <button onClick={() => setBlGroupBy('date')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'date' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><Calendar size={14} /> Date</button>
                   <button onClick={() => setBlGroupBy('operator')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'operator' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><User size={14} /> Opérateur</button>
                   <button onClick={() => setBlGroupBy('region')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'region' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><MapPin size={14} /> Région</button>
                   {blGroupBy !== 'none' && <button onClick={() => setBlGroupBy('none')} className="p-1.5 hover:bg-background rounded text-muted-foreground"><X size={14} /></button>}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="table table-striped">
                  <thead className="bg-primary/5 border-b-2 border-primary/20">
                    <tr><th>N° BL</th><th>Date</th><th>Opérateur / Détails</th><th>Localisation</th><th className="text-center">Actions</th></tr>
                  </thead>
                  <tbody>
                    {groupedBlData.map((group) => (
                      <Fragment key={group.key}>
                        {blGroupBy !== 'none' && (
                          <tr className="bg-muted/30"><td colSpan={5} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">{group.key} ({group.items.length}) - Total: {group.total} T</td></tr>
                        )}
                        {group.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3"><div className="flex flex-col"><span className="font-mono font-medium text-foreground">{item.bl_number}</span><span className="text-[10px] text-muted-foreground mt-0.5">Phase {item.numero_phase} (Bon: {item.project_num_bon})</span></div></td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className="text-sm font-bold text-foreground">{item.operator_name}</span>{item.operator_coop_name && <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>}<div className="flex items-center gap-2 mt-1"><span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800"><Package size={12} /> {item.tonnage_loaded} T <span className="text-blue-300 mx-1">|</span> <Truck size={12} /> {item.truck_plate_number || 'Camion Inconnu'}</span></div></div></td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.commune}, {item.department}, {item.region}</td>
                            <td className="px-4 py-3 text-center">
                               <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => downloadBLPdf(item)} disabled={downloadingId === item.bl_number} className={`btn btn-text btn-sm text-blue-500 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2 ${downloadingId === item.bl_number ? 'opacity-50 cursor-wait' : ''}`} title="Enregistrer PDF">
                                     {downloadingId === item.bl_number ? <RefreshCw size={14} className="animate-spin" /> : <Download size={16} />}
                                  </button>
                                  <button onClick={() => handlePrintSingleBL(item)} className="btn btn-text btn-sm text-muted-foreground hover:bg-muted rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2" title="Imprimer BL"><Printer size={16} /></button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'fin_cession' && !isManager && (
             <>
               <div className="p-4 border-b border-border flex justify-end">
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                   <div className="text-xs font-semibold uppercase px-2 text-muted-foreground flex items-center gap-1"><Layers size={14} /> Grouper:</div>
                   <button onClick={() => setFcGroupBy('region')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${fcGroupBy === 'region' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><MapPin size={14} /> Région</button>
                   {fcGroupBy !== 'none' && <button onClick={() => setFcGroupBy('none')} className="p-1.5 hover:bg-background rounded text-muted-foreground"><X size={14} /></button>}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="table table-striped">
                  <thead className="bg-primary/5 border-b-2 border-primary/20">
                    <tr><th>Opérateur</th><th>Localisation</th><th>Phase Projet</th><th className="text-center">Nbr Livraisons</th><th className="text-right">Tonnage Total</th><th className="text-center">Actions</th></tr>
                  </thead>
                  <tbody>
                    {groupedFcData.map((group) => (
                      <Fragment key={group.key}>
                        {fcGroupBy !== 'none' && (
                          <tr className="bg-muted/30"><td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">Région: {group.key} ({group.items.length}) - Total: {group.total} T</td></tr>
                        )}
                        {group.items.map((item, idx) => {
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-3"><div className="flex flex-col"><span className="text-sm font-medium text-foreground">{item.operator_name}</span>{item.operator_coop_name && <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>}</div></td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{item.commune}, {item.department}, {item.region}</td>
                              <td className="px-4 py-3 text-sm text-foreground">Phase {item.project_phase}</td>
                              <td className="px-4 py-3 text-center font-mono text-sm text-foreground">{item.deliveries_count}</td>
                              <td className="px-4 py-3 text-right font-mono font-medium text-primary">{item.total_tonnage.toFixed(2)} T</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handlePrintSingleFC(item)} className="btn btn-text btn-sm text-muted-foreground hover:bg-muted rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2" title="Imprimer PV"><Printer size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
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