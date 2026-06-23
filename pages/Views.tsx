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
  
  /* --- Unified Redesigned Styles --- */
  .bl-page, .fc-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    box-sizing: border-box;
    padding: 18mm 15mm 42mm 15mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #ffffff;
    page-break-after: always;
  }
  
  /* Top smooth curved background gradient shape in SOMA tones */
  .bl-page::before, .fc-page::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 120mm;
    background: radial-gradient(circle at top right, rgba(240, 162, 67, 0.12) 0%, rgba(201, 176, 55, 0.08) 35%, rgba(126, 179, 68, 0.05) 60%, transparent 80%);
    z-index: 1;
    pointer-events: none;
  }

  /* --- Header --- */
  .doc-header {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12mm;
  }
  .doc-title {
    font-size: 32px;
    font-weight: 900;
    color: #0A2540;
    font-style: italic;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: -0.5px;
    text-align: right;
  }

  /* --- Addresses Block --- */
  .addresses-container {
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 15mm;
    margin-bottom: 8mm;
  }
  .address-block h3 {
    font-size: 13px;
    font-weight: 800;
    color: #0A2540;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 5px;
    margin-bottom: 8px;
    margin-top: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .address-block p {
    font-size: 11px;
    line-height: 1.4;
    margin: 3px 0;
    color: #334155;
  }

  /* --- Metadata horizontal bar --- */
  .meta-table {
    position: relative;
    z-index: 10;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background-color: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8mm;
    text-align: center;
  }
  .meta-col {
    padding: 10px 4px;
    border-right: 1px solid #CBD5E1;
  }
  .meta-col:last-child {
    border-right: none;
  }
  .meta-label {
    font-size: 10px;
    font-weight: 800;
    color: #0A2540;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .meta-value {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
  }

  /* --- Items Table --- */
  .items-table {
    position: relative;
    z-index: 10;
    width: 100%;
    border-collapse: collapse;
    margin-bottom: auto; /* Pushes remaining content down */
  }
  .items-table th {
    background-color: #0A2540;
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 12px;
    border-right: 1px solid rgba(255, 255, 255, 0.15);
    text-align: center;
  }
  .items-table th:last-child {
    border-right: none;
  }
  .items-table td {
    padding: 10px 12px;
    font-size: 11px;
    text-align: center;
    color: #334155;
    border-bottom: 1px solid #E2E8F0;
    border-right: 1px solid #E2E8F0;
  }
  .items-table td:last-child {
    border-right: none;
  }
  .items-table tr:nth-child(even) td {
    background-color: #F8FAFC;
  }
  .items-table tr:nth-child(odd) td {
    background-color: #E2E8F0;
  }
  .items-table td.left-align {
    text-align: left;
  }
  .items-table .total-row td {
    font-weight: 800;
    background-color: #F0FDF4 !important;
    border-top: 2px solid #0A2540;
    color: #15803D;
  }

  /* --- Transport Details Box --- */
  .transport-container {
    position: relative;
    z-index: 10;
    background-color: #F8FAFC;
    border-left: 4px solid #f0a243;
    padding: 10px 14px;
    border-radius: 4px;
    margin-bottom: 8mm;
  }
  .transport-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    color: #0A2540;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }
  .transport-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 15px;
  }
  .transport-item {
    font-size: 11px;
    color: #475569;
  }

  /* --- Thank you section --- */
  .thanks-section {
    position: relative;
    z-index: 10;
    text-align: center;
    margin-top: 4mm;
    margin-bottom: 4mm;
  }
  .thanks-title {
    font-size: 13px;
    font-weight: 800;
    color: #0A2540;
    margin-bottom: 3px;
  }
  .thanks-text {
    font-size: 9px;
    color: #64748B;
    max-width: 85%;
    margin: 0 auto;
    line-height: 1.4;
  }

  /* --- Signatures Receipt Zone --- */
  .receipt-zone-title {
    position: relative;
    z-index: 10;
    width: 100%;
    text-align: center;
    font-size: 12px;
    font-weight: 800;
    color: #0A2540;
    margin-top: 2mm;
    margin-bottom: 2mm;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .receipt-zone {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    margin-bottom: 4mm;
    gap: 15mm;
  }
  .signature-block {
    width: 48%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .signature-title {
    font-size: 11px;
    font-weight: 800;
    color: #0A2540;
    margin-bottom: 6mm;
  }
  .signature-line-placeholder {
    width: 80%;
    border-bottom: 1px solid #94A3B8;
    height: 8mm;
    margin-bottom: 3px;
  }
  .signature-label {
    font-size: 9px;
    color: #64748B;
    font-weight: 600;
    text-transform: uppercase;
  }
  .stamp-container {
    width: 80%;
    height: 8mm;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 3px;
  }
  .soma-stamp {
    border: 2px solid #1e3a8a;
    border-radius: 4px;
    padding: 2px 6px;
    color: #1e3a8a;
    font-family: 'Courier New', Courier, monospace;
    font-weight: 900;
    text-align: center;
    transform: rotate(-3deg);
    background: rgba(255, 255, 255, 0.9);
    font-size: 8px;
    line-height: 1.1;
  }

  /* --- Footer Wave --- */
  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 210mm;
    height: 42mm;
    background: linear-gradient(135deg, #0A2540 0%, #111827 100%);
    border-top: 4px solid #f0a243;
    clip-path: ellipse(120% 100% at 35% 100%);
    box-sizing: border-box;
    padding: 18mm 15mm 6mm 15mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    color: #ffffff;
    z-index: 10;
  }
  .footer-info {
    display: grid;
    grid-template-columns: auto auto;
    gap: 4px 15px;
    font-size: 9px;
    opacity: 0.95;
  }
  .footer-info-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .footer-terms {
    width: 45%;
    font-size: 8px;
    line-height: 1.4;
    opacity: 0.9;
    border-left: 1px solid #38BDF8;
    padding-left: 10px;
    margin-bottom: 2px;
  }
  .footer-terms h4 {
    margin: 0 0 2px 0;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #38BDF8;
  }

  @media print { 
    .leaf, .divider { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    .o-dot::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bl-page, .fc-page { page-break-after: always; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bl-page::before, .fc-page::before { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    const destinatireName = item.operateur_coop_gie && item.operator_coop_name 
      ? `${item.operator_name} / ${item.operator_coop_name}` 
      : item.operator_name;

    return `
      <div class="bl-page">
        <div class="doc-header">
            ${SOMA_LOGO_HTML}
            <h1 class="doc-title">Bon de Livraison</h1>
        </div>

        <div class="addresses-container">
            <div class="address-block">
                <h3>Destinataire</h3>
                <p><strong>${destinatireName}</strong></p>
                <p>Téléphone : <strong>${item.operator_contact_info || '---'}</strong></p>
                <p>Région : ${item.region || '---'}</p>
                <p>Département : ${item.department || '---'}</p>
                <p>Commune : <strong>${item.commune || '---'}</strong></p>
            </div>
            <div class="address-block">
                <h3>Expéditeur</h3>
                <p><strong>SOCIÉTÉ MINIÈRE AFRICAINE (SOMA S.A.)</strong></p>
                <p>Site de Matam, Hamady Ounaré, Sénégal</p>
                <p>Siège : 11 rue Alfred goux, Apt N1 1er Etage, Dakar</p>
                <p>TEL : +221 77 260 95 67 / 77 247 25 00</p>
            </div>
        </div>

        <div class="meta-table">
            <div class="meta-col">
                <div class="meta-label">Numéro BL</div>
                <div class="meta-value">${item.bl_number}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Phase</div>
                <div class="meta-value">Phase ${item.numero_phase}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Date</div>
                <div class="meta-value">${new Date(item.delivery_date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Bon SOMA</div>
                <div class="meta-value">#${item.project_num_bon || '---'}</div>
            </div>
        </div>

        <div class="transport-container">
            <div class="transport-title">Informations de Transport</div>
            <div class="transport-grid">
                <div class="transport-item"><strong>Chauffeur :</strong> ${item.driver_name || '---'}</div>
                <div class="transport-item"><strong>Camion / Remorque :</strong> ${item.truck_plate_number || '---'}${trailerStr}</div>
                ${item.Trucks_proprietaire ? `<div class="transport-item"><strong>Propriétaire :</strong> ${item.Trucks_proprietaire}</div>` : ''}
                <div class="transport-item"><strong>Programme :</strong> ${item.project_description || 'Campagne agricole 2025/2026'}</div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Qté (Sacs)</th>
                    <th style="width: 20%;">Code Article</th>
                    <th style="width: 50%;">Description</th>
                    <th style="width: 15%;">Tonnage (T)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${Math.round(item.tonnage_loaded * 20)}</td>
                    <td>PN-50KG</td>
                    <td class="left-align">
                        <strong>Engrais à base de phosphate naturel</strong><br/>
                        <span style="font-size: 10px; color: #64748B;">Sac de 50 kg – Campagne agricole 2025-2026</span>
                    </td>
                    <td><strong>${item.tonnage_loaded} T</strong></td>
                </tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding-right: 15px;">TOTAL LIVRÉ</td>
                    <td>${item.tonnage_loaded} T</td>
                </tr>
            </tbody>
        </table>

        <div class="thanks-section">
            <div class="thanks-title">Merci pour votre confiance !</div>
            <div class="thanks-text">Les marchandises livrées restent la propriété de la SOMA jusqu'au complet déchargement et validation du procès-verbal de réception.</div>
        </div>

        <div class="receipt-zone-title">Émargements et Réception</div>
        <div class="receipt-zone" style="gap: 5mm;">
            <div class="signature-block" style="width: 31%;">
                <div class="signature-title">Le Réceptionnaire</div>
                <div class="signature-line-placeholder"></div>
                <div class="signature-label">Signature & Date</div>
            </div>
            <div class="signature-block" style="width: 31%;">
                <div class="signature-title">Le Chauffeur</div>
                <div class="signature-line-placeholder"></div>
                <div class="signature-label">Signature & Date</div>
            </div>
            <div class="signature-block" style="width: 31%;">
                <div class="signature-title">Pour la SOMA S.A.</div>
                <div class="stamp-container">
                    <div class="soma-stamp" style="font-size: 7px;">SOCIÉTÉ MINIÈRE AFRICAINE<br/>" SOMA S.A. "<br/>Le Directeur Général</div>
                </div>
                <div class="signature-label">Visa Autorisé</div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-info">
                <div class="footer-info-item">📍 Matam / Hamady Ounaré, Sénégal</div>
                <div class="footer-info-item">✉️ mdiene@gmail.com</div>
                <div class="footer-info-item">📞 +221 77 247 25 00 / 77 260 95 67</div>
                <div class="footer-info-item">🌐 www.soma.sn</div>
            </div>
            <div class="footer-terms">
                <h4>SOCIÉTÉ MINIÈRE AFRICAINE S.A.</h4>
                Les marchandises livrées restent la propriété de la SOMA jusqu'à réception conforme. Tout litige relève de la compétence exclusive du tribunal de commerce de Dakar.
            </div>
        </div>
      </div>
    `;
  };

  /**
   * Helper to build FC HTML Template with Watermark Leaf (SOMA text removed)
   */
  const getFCTemplate = (item: FinDeCessionView) => {
    return `
      <div class="fc-page">
        <div class="doc-header">
            ${SOMA_LOGO_HTML}
            <h1 class="doc-title" style="font-size: 26px;">Procès Verbal</h1>
        </div>

        <div class="addresses-container">
            <div class="address-block">
                <h3>Point de Réception</h3>
                <p><strong>Commune de : ${item.commune}</strong></p>
                <p>Département : ${item.department}</p>
                <p>Région : ${item.region}</p>
            </div>
            <div class="address-block">
                <h3>Opérateur Bénéficiaire</h3>
                <p><strong>${item.operator_coop_name || item.operator_name}</strong></p>
                <p>Représenté par : <strong>${item.operator_name}</strong></p>
                <p>Tél : ${item.operator_phone || '---'}</p>
            </div>
        </div>

        <div class="meta-table">
            <div class="meta-col">
                <div class="meta-label">Document</div>
                <div class="meta-value">PV Réception</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Campagne</div>
                <div class="meta-value">2025 - 2026</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Date PV</div>
                <div class="meta-value">${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Phase</div>
                <div class="meta-value">Phase ${item.project_phase || '---'}</div>
            </div>
        </div>

        <div style="font-size: 11px; line-height: 1.5; color: #475569; margin-bottom: 6mm; text-align: justify; z-index: 10; position: relative;">
            La commission de réception des engrais du point de réception de la commune de <strong>${item.commune}</strong> certifie que la SOMA a effectivement livré les volumes ci-dessous à l'opérateur bénéficiaire, conformément aux dispositions de mise à disposition des intrants de la campagne agricole 2025-2026.
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Qté (Sacs)</th>
                    <th style="width: 20%;">Code Article</th>
                    <th style="width: 50%;">Description</th>
                    <th style="width: 15%;">Tonnage (T)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${Math.round(item.total_tonnage * 20)}</td>
                    <td>PN-50KG</td>
                    <td class="left-align">
                        <strong>Phosphate naturel (En vrac / sacs)</strong><br/>
                        <span style="font-size: 10px; color: #64748B;">Distribution intrants agricoles - Campagne 2025/2026</span>
                    </td>
                    <td><strong>${item.total_tonnage.toFixed(2)} T</strong></td>
                </tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding-right: 15px;">TOTAL RÉCEPTIONNÉ</td>
                    <td>${item.total_tonnage.toFixed(2)} T</td>
                </tr>
            </tbody>
        </table>

        <div class="thanks-section" style="margin-top: 6mm;">
            <div class="thanks-title">Certification de Conformité</div>
            <div class="thanks-text">Les membres de la commission attestent de la conformité quantitative et qualitative des intrants réceptionnés au point de livraison convenu.</div>
        </div>

        <div class="receipt-zone-title" style="margin-top: 4mm;">Émargements Commission</div>
        <div class="receipt-zone">
            <div class="signature-block">
                <div class="signature-title">${item.operator_name}</div>
                <div class="signature-line-placeholder"></div>
                <div class="signature-label">Signature & Date (Tél: ${item.operator_phone || '---'})</div>
            </div>
            <div class="signature-block">
                <div class="signature-title">Pour la SOMA S.A.</div>
                <div class="stamp-container">
                    <div class="soma-stamp">SOCIÉTÉ MINIÈRE AFRICAINE<br/>" SOMA S.A. "<br/>Le Directeur Général</div>
                </div>
                <div class="signature-label">Visa Autorisé</div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-info">
                <div class="footer-info-item">📍 Matam / Hamady Ounaré, Sénégal</div>
                <div class="footer-info-item">✉️ mdiene@gmail.com</div>
                <div class="footer-info-item">📞 +221 77 247 25 00 / 77 260 95 67</div>
                <div class="footer-info-item">🌐 www.soma.sn</div>
            </div>
            <div class="footer-terms">
                <h4>SOCIÉTÉ MINIÈRE AFRICAINE S.A.</h4>
                Le présent Procès-Verbal est dressé en vue de certifier de la conformité de la réception physique des intrants conformément aux engagements de livraison.
            </div>
        </div>
      </div>
    `;
  };

  /**
   * Helper to build Feuille de Route HTML Template for Export projects
   */
  const getFeuilleDeRouteTemplate = (item: BonLivraisonView) => {
    const numColis = Math.ceil((item.tonnage_loaded * 1000) / 50);
    return `
      <div class="bl-page" style="page-break-after: always; min-height: 100vh; position: relative; padding: 20px;">
        <div class="header-container" style="display: flex; align-items: center; margin-bottom: 20px;">
           ${SOMA_LOGO_HTML}
        </div>
        <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 30px;">
           <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900;">FEUILLE DE ROUTE PHOSPHATE</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
           <div style="border: 1px solid #000; padding: 10px;">
              <p style="margin: 5px 0;"><strong>Numéro Feuille de route :</strong> <span style="font-family: monospace;">FR-${item.bl_number}</span></p>
              <p style="margin: 5px 0;"><strong>Déclaration :</strong> <span style="font-family: monospace; font-weight: bold; font-size: 16px;">${item.declaration_code || '---'}</span></p>
              <p style="margin: 5px 0;"><strong>Bureau frontière :</strong> ${item.commune}</p>
           </div>
           <div style="border: 1px solid #000; padding: 10px;">
              <p style="margin: 5px 0;"><strong>Nature produit :</strong> Roche de Phopshate naturelle</p>
              <p style="margin: 5px 0;"><strong>Nombre de colis :</strong> ${numColis} sacs de 50kg</p>
              <p style="margin: 5px 0;"><strong>Poids :</strong> ${item.tonnage_loaded} T</p>
           </div>
        </div>

        <div style="border: 1px solid #000; padding: 15px; margin-bottom: 30px;">
           <h3 style="margin: 0 0 15px 0; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase; font-size: 14px;">Informations Transport</h3>
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                 <p style="margin: 8px 0;"><strong>Camion / marque / modèle :</strong> ${item.truck_plate_number} / ${item.truck_trailer_number || '---'} / ${item.truck_chassis || '---'}</p>
                 ${item.Trucks_proprietaire ? `<p style="margin: 8px 0;"><strong>Propriétaire :</strong> ${item.Trucks_proprietaire}</p>` : ''}
              </div>
              <div>
                 <p style="margin: 8px 0;"><strong>Chauffeur :</strong> ${item.driver_name}</p>
                 <p style="margin: 8px 0;"><strong>Numéro permis :</strong> ${item.driver_license || '---'}</p>
                 <p style="margin: 8px 0;"><strong>Téléphone :</strong> ${item.driver_phone || '---'}</p>
              </div>
           </div>
        </div>

        <div style="border: 1px solid #000; padding: 15px; margin-bottom: 30px;">
           <h3 style="margin: 0 0 15px 0; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase; font-size: 14px;">Itinéraire & Destination</h3>
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                 <p style="margin: 8px 0;"><strong>Lieu de chargement :</strong> Mine de SOMA à Hamady Ounare</p>
                 <p style="margin: 8px 0;"><strong>Destination :</strong> ${item.region} / ${item.department} / ${item.commune}</p>
              </div>
              <div>
                 <p style="margin: 8px 0;"><strong>Destinataire :</strong> FOUTA ENTREPRISE LIMITED</p>
                 <p style="margin: 8px 0;"><strong>Date de sortie frontière :</strong> ____/____/2026</p>
              </div>
           </div>
        </div>

        <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
           <div style="border: 1px solid #000; padding: 40px 10px 10px 10px; height: 120px;">
              <p style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Responsable de chargement (Entrée)</p>
           </div>
           <div style="border: 1px solid #000; padding: 40px 10px 10px 10px; height: 120px;">
              <p style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Visa Douane (Sortie)</p>
           </div>
           <div style="border: 1px solid #000; padding: 40px 10px 10px 10px; height: 120px;">
              <p style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Cachet réception</p>
           </div>
        </div>

        <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 9px; color: #333; border-top: 1px solid #ccc; padding-top: 8px;">
           SOCIÉTÉ MINIÈRE AFRICAINE - Hamady Ounare, Sénégal<br/>
           Document officiel de transport pour l'exportation de phosphate naturel.
        </div>
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
            @page { size: A4; margin: 0; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748; margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ${SOMA_LOGO_STYLES}
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
    let content = getBLTemplate(item);
    if (item.export_statut) {
      content += getFeuilleDeRouteTemplate(item);
    }
    openPrintWindow(content, `BL_${item.bl_number}`);
  };

  const handlePrintSingleFC = (item: FinDeCessionView) => {
    openPrintWindow(getFCTemplate(item), `PV_Cession_${item.operator_name}`);
  };

  const handlePrintAll = () => {
    if (activeTab === 'bon_livraison') {
      if (!filteredBlData.length) return alert('Aucun BL à imprimer');
      const content = filteredBlData.map(item => {
        let tpl = getBLTemplate(item);
        if (item.export_statut) {
          tpl += getFeuilleDeRouteTemplate(item);
        }
        return tpl;
      }).join('');
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
    const destinatireName = item.operateur_coop_gie && item.operator_coop_name 
      ? `${item.operator_name} / ${item.operator_coop_name}` 
      : item.operator_name;

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

      // Programme section
      doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text("PROGRAMME", 15, 80);
      doc.setFillColor(249, 249, 249); doc.rect(15, 82, 90, 8, 'F');
      doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
      doc.text(item.project_description || 'MASAE campagne agricole 2025/2026', 17, 87);

      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("DATE DE LIVRAISON:", 120, 55);
      doc.setFont("helvetica", "normal"); doc.text(new Date(item.delivery_date).toLocaleDateString('fr-FR'), 165, 55);
      doc.setFont("helvetica", "bold"); doc.text("NUMÉRO BL:", 120, 62);
      doc.setFont("courier", "bold"); doc.text(item.bl_number, 165, 62);

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.1); doc.rect(120, 70, 75, 25);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text("DESTINATAIRE", 122, 74);
      doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
      doc.text(destinatireName, 122, 80); doc.setFontSize(9); doc.setFont("helvetica", "normal");
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
      
      if (item.export_statut) {
        doc.addPage();
        drawSomaHeaderOnPdf(doc, 15, 10);
        
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(15, 35, 180, 15);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("FEUILLE DE ROUTE PHOSPHATE", 105, 45, { align: 'center' });
        
        doc.setLineWidth(0.1); doc.rect(15, 55, 90, 25);
        doc.setFontSize(9); doc.text(`Numéro Feuille de route : FR-${item.bl_number}`, 18, 62);
        doc.setFontSize(11); doc.text(`Déclaration : ${item.declaration_code || '---'}`, 18, 69);
        doc.setFontSize(9); doc.text(`Bureau frontière : ${item.commune}`, 18, 76);
        
        doc.rect(105, 55, 90, 25);
        doc.text("Nature produit : Roche de Phopshate naturelle", 108, 62);
        doc.text(`Nombre de colis : ${Math.ceil((item.tonnage_loaded * 1000) / 50)} sacs de 50kg`, 108, 69);
        doc.text(`Poids : ${item.tonnage_loaded} T`, 108, 76);
        
        doc.rect(15, 85, 180, 40);
        doc.setFontSize(10); doc.text("INFORMATIONS TRANSPORT", 18, 92);
        doc.line(15, 94, 195, 94);
        doc.setFontSize(9);
        doc.text("Camion / marque / modèle : Camion vrac / bennes / Renault", 18, 102);
        doc.text(`Immatriculation / châssis : ${item.truck_plate_number} / ${item.truck_trailer_number || '---'} / ${item.truck_chassis || '---'}`, 18, 110);
        doc.text(`Chauffeur : ${item.driver_name}`, 110, 102);
        doc.text(`Numéro permis : ${item.driver_license || '---'}`, 110, 110);
        doc.text(`Téléphone : ${item.driver_phone || '---'}`, 110, 118);
        
        doc.rect(15, 130, 180, 40);
        doc.setFontSize(10); doc.text("ITINÉRAIRE & DESTINATION", 18, 137);
        doc.line(15, 139, 195, 139);
        doc.setFontSize(9);
        doc.text("Lieu de chargement : Mine de SOMA à Hamady Ounare", 18, 147);
        doc.text(`Destination : ${item.region} / ${item.department} / ${item.commune}`, 18, 155);
        doc.text("Destinataire : FOUTA ENTREPRISE LIMITED", 110, 147);
        doc.text("Date de sortie frontière : ____/____/2026", 110, 155);
        
        const signY = 180;
        doc.rect(15, signY, 55, 40); doc.setFontSize(8); doc.text("VISA DOUANE (ENTRÉE)", 18, signY + 5);
        doc.rect(77.5, signY, 55, 40); doc.text("VISA DOUANE (SORTIE)", 80.5, signY + 5);
        doc.rect(140, signY, 55, 40); doc.text("CACHET TRANSPORTEUR", 143, signY + 5);
        
        doc.setFontSize(7); doc.setTextColor(100);
        doc.text("SOCIÉTÉ MINIÈRE AFRICAINE - Hamady Ounare, Sénégal", 105, 285, { align: 'center' });
        doc.text("Document officiel de transport pour l'exportation de phosphate naturel.", 105, 289, { align: 'center' });
      }

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