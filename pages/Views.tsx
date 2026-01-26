
import { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { db } from '../services/db';
import { BonLivraisonView, FinDeCessionView, Project } from '../types';
import { FileText, Gift, Printer, Layers, User, MapPin, X, Filter, Calendar, Package, Truck, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper to load image for jsPDF
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
};

export const Views = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = user?.role === 'MANAGER';

  // Get active tab from URL or default to 'bon_livraison'
  // If Manager, strictly force 'bon_livraison'
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

  // Filters
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');
  
  // Date Range Filter State
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  
  // Grouping State
  const [blGroupBy, setBlGroupBy] = useState<'none' | 'operator' | 'region' | 'date'>('date');
  const [fcGroupBy, setFcGroupBy] = useState<'none' | 'region'>('none');

  // Load Projects and set default filter ONCE on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const proj = await db.getProjects();
        setProjects(proj);
        
        // Auto-select Phase 3 if available and visible
        const phase3 = proj.find(p => p.numero_phase === 3 && p.project_visibility !== false);
        if (phase3) {
          setSelectedPhaseFilter(phase3.numero_phase);
        }
      } catch (e) {
        console.error("Error loading projects:", e);
      }
    };
    loadProjects();
  }, []);

  // Initialize Flatpickr
  useEffect(() => {
    if (dateRangeInputRef.current && (window as any).flatpickr) {
      const fp = (window as any).flatpickr(dateRangeInputRef.current, {
        mode: 'range',
        dateFormat: "Y-m-d",
        locale: {
          rangeSeparator: " au "
        },
        onChange: (selectedDates: Date[]) => {
          if (selectedDates.length === 2) {
            setDateRange({ start: selectedDates[0], end: selectedDates[1] });
          } else {
            setDateRange({ start: null, end: null });
          }
        }
      });

      // Cleanup
      return () => fp.destroy();
    }
  }, []);

  // Load Tab Data when tab changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'bon_livraison') {
        const data = await db.getBonLivraisonViews();
        // Default sort: Latest to Earliest
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

  // Filter Logic
  const filteredBlData = useMemo(() => {
    let data = blData;
    
    // Phase Filter
    if (selectedPhaseFilter !== 'all') {
      data = data.filter(item => item.numero_phase === selectedPhaseFilter);
    }

    // Date Range Filter
    if (dateRange.start && dateRange.end) {
      data = data.filter(item => {
        if (!item.delivery_date) return false;
        const itemDate = new Date(item.delivery_date);
        itemDate.setHours(0,0,0,0);
        
        const start = new Date(dateRange.start!);
        start.setHours(0,0,0,0);
        
        const end = new Date(dateRange.end!);
        end.setHours(23,59,59,999);
        
        return itemDate >= start && itemDate <= end;
      });
    }

    // Always sort by date descending (latest first)
    return data.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  }, [blData, selectedPhaseFilter, dateRange]);

  const filteredFcData = useMemo(() => {
    if (selectedPhaseFilter === 'all') return fcData;
    return fcData.filter(item => item.project_phase === selectedPhaseFilter);
  }, [fcData, selectedPhaseFilter]);
  
  const visibleProjects = useMemo(() => projects.filter(p => p.project_visibility !== false), [projects]);

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
       // Sort date keys DESCENDING (Newest first)
       sortedKeys.sort((a, b) => {
          // parse DD/MM/YYYY back to time
          const partsA = a.split('/');
          const partsB = b.split('/');
          if (partsA.length !== 3 || partsB.length !== 3) return a.localeCompare(b);
          
          const da = parseInt(partsA[0], 10);
          const ma = parseInt(partsA[1], 10);
          const ya = parseInt(partsA[2], 10);
          
          const db = parseInt(partsB[0], 10);
          const mb = parseInt(partsB[1], 10);
          const yb = parseInt(partsB[2], 10);
          
          return new Date(yb, mb-1, db).getTime() - new Date(ya, ma-1, da).getTime();
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

  // Handle CSV Export
  const handleExportCSV = () => {
    const data = activeTab === 'bon_livraison' ? filteredBlData : filteredFcData;
    if (!data.length) return alert('Aucune donnée à exporter');

    const headers = activeTab === 'bon_livraison' 
      ? ['N° BL', 'Date', 'Opérateur', 'Coopérative', 'Région', 'Département', 'Commune', 'Camion', 'Chauffeur', 'Tonnage', 'Phase']
      : ['Opérateur', 'Coopérative', 'Région', 'Département', 'Commune', 'Phase', 'Nbr Livraisons', 'Tonnage Total'];

    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        if (activeTab === 'bon_livraison') {
          const item = row as BonLivraisonView;
          // Escape quotes for CSV
          const escape = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;
          return [
            item.bl_number,
            item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('fr-FR') : '',
            escape(item.operator_name),
            escape(item.operator_coop_name),
            escape(item.region),
            escape(item.department),
            escape(item.commune),
            escape(item.truck_plate_number),
            escape(item.driver_name),
            item.tonnage_loaded,
            item.numero_phase
          ].join(',');
        } else {
          const item = row as FinDeCessionView;
          const escape = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;
          return [
            escape(item.operator_name),
            escape(item.operator_coop_name),
            escape(item.region),
            escape(item.department),
            escape(item.commune),
            item.project_phase,
            item.deliveries_count,
            item.total_tonnage
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const SOMA_LOGO_URL = 'http://soma.sn/wp-content/uploads/2025/09/WhatsApp-Image-2025-08-23-at-22.12.34.jpeg';

  // PDF Download Handler (using jsPDF)
  const downloadBLPdf = async (item: BonLivraisonView) => {
    setDownloadingId(item.bl_number);
    try {
      const doc = new jsPDF();
      
      try {
        const logoImg = await loadImage(SOMA_LOGO_URL);
        doc.addImage(logoImg, 'JPEG', 15, 10, 50, 20);
      } catch (e) {
        // Fallback Logo Representation if image fails
        doc.setFillColor(224, 155, 96);
        doc.rect(15, 15, 8, 2, 'F');
        doc.setFillColor(191, 161, 47);
        doc.rect(15, 18, 9, 2, 'F');
        doc.setFillColor(114, 140, 40);
        doc.rect(15, 21, 8.5, 2, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.text("SOMA", 30, 25);
      }

      // Title
      doc.setFillColor(255, 249, 230); // #fff9e6
      doc.rect(15, 35, 180, 10, 'F');
      doc.setDrawColor(217, 119, 6); // #d97706
      doc.setLineWidth(1.5);
      doc.line(15, 35, 15, 45); // Left orange border
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text("BON DE LIVRAISON", 20, 42);

      // Info Grid
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Left: Sender
      doc.setFont("helvetica", "bold");
      doc.text("SOCIETE MINIERE AFRICAINE", 15, 55);
      doc.setFont("helvetica", "normal");
      doc.text("11 rue Alfred goux", 15, 60);
      doc.text("Apt N1 1er Etage Dakar Plateau Sénégal", 15, 65);
      doc.text("TEL : 77 260 95 67", 15, 70);
      
      // Programme Box
      doc.setFontSize(9);
      doc.text("PROGRAMME", 15, 80);
      doc.setFillColor(249, 250, 251);
      doc.rect(15, 82, 80, 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.text("MASAE campagne agricole 2025/2026", 17, 87);

      // Right: Recipient & BL Info
      // Date
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("DATE DE LIVRAISON", 120, 55);
      doc.setFont("courier", "normal");
      doc.text(new Date(item.delivery_date).toLocaleDateString('fr-FR'), 160, 55);
      
      // BL Num
      doc.setFont("helvetica", "bold");
      doc.text("NUMERO BL", 120, 62);
      doc.setFillColor(238, 238, 238);
      doc.rect(155, 58, 40, 6, 'F');
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(item.bl_number, 158, 62);

      // Recipient Box
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(120, 70, 75, 28); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("DESTINATAIRE", 122, 74);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(item.operator_name, 122, 79);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("EXPÉDIEZ À", 122, 85);
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(`${item.commune}, ${item.department}`, 122, 90);
      
      let extraY = 94;
      if (item.operator_coop_name) {
         doc.setFontSize(8);
         doc.setTextColor(80, 80, 80);
         doc.text(item.operator_coop_name, 122, extraY);
         extraY += 4;
      }
      if (item.operator_contact_info) {
         doc.setFontSize(8);
         doc.setTextColor(80, 80, 80);
         doc.text(item.operator_contact_info, 122, extraY);
      }

      // Modalites
      doc.setFillColor(249, 250, 251);
      doc.rect(15, 100, 180, 12, 'F');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text("Modalités", 17, 104);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const trailerStr = item.truck_trailer_number ? ` / ${item.truck_trailer_number}` : '';
      doc.text(`Camion: ${item.truck_plate_number || '____________'}${trailerStr}      Chauffeur: ${item.driver_name || '____________'}`, 17, 109);

      // Table
      autoTable(doc, {
        startY: 115,
        margin: { left: 15, right: 15 },
        head: [['DESCRIPTION', 'Quantité / Tonnes']],
        body: [
          [
            { 
              content: `Engrais à base de phosphate naturel\nSac de 50 kg – Campagne agricole 2025-2026\nProjet Phase ${item.numero_phase} (Bon N° ${item.project_num_bon})`, 
              styles: { fontStyle: 'bold' } 
            }, 
            { content: `${item.tonnage_loaded}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 } }
          ],
          ['', ''], 
          ['SOUS-TOTAL', { content: `${item.tonnage_loaded}`, styles: { halign: 'right', fontStyle: 'bold' } }]
        ],
        theme: 'plain',
        headStyles: { fillColor: [255, 249, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 125 }, 
          1: { cellWidth: 50 }
        },
        didParseCell: (data) => {
           if (data.row.index === 2) {
              data.cell.styles.fillColor = [240, 253, 244]; 
              data.cell.styles.lineWidth = { top: 0.1 };
           }
        }
      });

      // Footer Signatures
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Remarques / instructions : Marchandise reçue en bon état.", 15, finalY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Réceptionnaire", 15, finalY + 15);
      doc.text("Signature SOMA", 140, finalY + 15);
      doc.setLineWidth(0.5);
      doc.line(15, finalY + 16, 60, finalY + 16);
      doc.line(140, finalY + 16, 185, finalY + 16);

      doc.setFont("helvetica", "normal");
      doc.text(item.operator_name, 15, finalY + 22);
      if (item.operator_contact_info) {
         doc.setFontSize(8);
         doc.text(item.operator_contact_info, 15, finalY + 26);
      }

      // Cachet Simulation
      doc.setDrawColor(30, 58, 138); 
      doc.setLineWidth(0.8);
      doc.saveGraphicsState();
      doc.setTextColor(30, 58, 138);
      doc.text("SOCIETE MINIERE AFRICAINE", 140, finalY + 30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('" SOMA "', 155, finalY + 36);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("11, Rue Alfred Goux", 150, finalY + 40);
      doc.text("Le Directeur Général", 150, finalY + 44);
      doc.roundedRect(138, finalY + 22, 50, 25, 3, 3);
      doc.restoreGraphicsState();

      // Footer Text
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage", 105, 285, { align: 'center' });
      doc.text("Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 mdiene@gmail.com", 105, 289, { align: 'center' });

      doc.save(`${item.bl_number} - ${item.operator_name}.pdf`);
    } catch (e) {
      console.error("PDF Generation Error:", e);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // PDF Download Handler for Fin de Cession
  const downloadFCPdf = async (item: FinDeCessionView) => {
    const uniqueId = `FC-PH${item.project_phase}-${item.operator_id.slice(0, 4)}`;
    setDownloadingId(uniqueId);
    
    try {
      const doc = new jsPDF();
      
      // Header Branding - Use Logo Image
      try {
        const logoImg = await loadImage(SOMA_LOGO_URL);
        doc.addImage(logoImg, 'JPEG', 15, 10, 50, 20);
      } catch (e) {
        // Fallback if image fails
        doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.text("SOMA", 30, 25);
      }

      // Document Title
      doc.setFillColor(255, 249, 230); doc.rect(15, 35, 180, 10, 'F');
      doc.setDrawColor(217, 119, 6); doc.setLineWidth(1.5); doc.line(15, 35, 15, 45);
      doc.setFontSize(14); doc.setTextColor(60, 60, 60);
      doc.text("PROCÈS VERBAL DE RÉCEPTION DES INTRANTS", 20, 42);

      doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 15, 55);
      doc.setFont("helvetica", "bold"); doc.text("CAMPAGNE AGRICOLE 2025-2026", 15, 60);

      // Main Text
      doc.setFont("helvetica", "normal");
      doc.text(`COMMUNE DE : ${item.commune.toUpperCase()}`, 15, 75);
      doc.setLineWidth(0.1); doc.line(15, 76, 15 + doc.getTextWidth(`COMMUNE DE : ${item.commune.toUpperCase()}`), 76);

      const splitText = doc.splitTextToSize(
        `Suite à la notification de mise à disposition d’engrais N° 394/MASAE/DA faite à la société minière africaine et selon le planning de la lettre N° 0971/DA/BRAFS de mise en place phosphate naturel.`, 
        180
      );
      doc.text(splitText, 15, 85);

      // Summary Table
      autoTable(doc, {
        startY: 100,
        margin: { left: 15, right: 15 },
        head: [['COOPÉRATIVE / GIE', 'REPRÉSENTANT', 'PRODUIT', 'QUANTITÉ / T']],
        body: [[
          { content: item.operator_coop_name || item.operator_name, styles: { fontStyle: 'bold' } },
          item.operator_name,
          'Phosphate naturel',
          { content: `${item.total_tonnage}`, styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5, halign: 'center' },
        columnStyles: { 0: { halign: 'left' } }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFont("helvetica", "normal");
      const introText = `La commission de réception des engrais du point de réception de la commune de ${item.commune} du Département de ${item.department} de la région de ${item.region}. 
        
Composée des personnes dont les noms sont ci-dessus indiqués, certifie que La SOMA a effectivement livré ${item.total_tonnage} tonnes à l’opérateur :`;
      
      const lines = doc.splitTextToSize(introText, 180);
      doc.text(lines, 15, nextY);
      
      const boldTextY = nextY + (lines.length * 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(item.operator_coop_name || item.operator_name, 15, boldTextY);

      // Signatures
      doc.setFont("helvetica", "bold");
      doc.text("Ont signé :", 15, boldTextY + 25);
      
      doc.setFontSize(9);
      doc.text("Prénom et nom", 15, boldTextY + 35);
      doc.text("Téléphone", 80, boldTextY + 35);
      doc.text("Signature", 140, boldTextY + 35);
      
      doc.setLineWidth(0.2);
      doc.line(15, boldTextY + 50, 70, boldTextY + 50);
      doc.line(80, boldTextY + 50, 130, boldTextY + 50);
      doc.line(140, boldTextY + 50, 190, boldTextY + 50);
      
      doc.setFont("helvetica", "normal");
      doc.text(item.operator_name, 15, boldTextY + 45);
      doc.text(item.operator_phone || '', 80, boldTextY + 45);

      // Professional Footer
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage", 105, 285, { align: 'center' });
      doc.text("Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 mdiene@gmail.com", 105, 289, { align: 'center' });

      // Save with unique name
      const filename = `FC_PH${item.project_phase}_${item.operator_name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error(e);
      alert("Erreur generation PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const fullPrintBL = (item: BonLivraisonView) => {
      const trailerStr = item.truck_trailer_number ? ` / ${item.truck_trailer_number}` : '';
      const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${item.bl_number} - ${item.operator_name}</title>
          <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0.8cm; }
            body { 
              font-family: 'Lato', sans-serif; 
              color: #000; 
              margin: 0 auto; 
              background: white;
              font-size: 11px;
              line-height: 1.3;
              position: relative;
              height: 100vh;
              width: 100%;
              box-sizing: border-box;
            }
            .header-container { display: flex; align-items: center; margin-bottom: 15px; }
            .header-container img { height: 60px; width: auto; object-fit: contain; }
            .main-title-box { background-color: #fff9e6; padding: 10px; margin-top: 10px; margin-bottom: 15px; border-left: 5px solid #d97706; }
            .main-title { font-size: 24px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .info-block { margin-bottom: 8px; }
            .info-label { font-weight: bold; text-transform: uppercase; font-size: 10px; color: #444; margin-bottom: 2px; }
            .info-value { font-size: 12px; border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
            .sender-info { font-size: 11px; margin-bottom: 15px; color: #333; }
            .modalites-box { border: 1px solid #ddd; padding: 12px; margin: 30px 0 20px 0; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background-color: #fff9e6; padding: 8px 6px; font-weight: bold; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #ddd; }
            td { padding: 18px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
            .total-row td { background-color: #f0fdf4; font-weight: bold; border-top: 2px solid #ddd; }
            .footer-section { margin-top: 30px; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; position: relative; min-height: 120px; }
            .signature-title { font-weight: bold; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; }
            .cachet-box { border: 3px solid #1e3a8a; border-radius: 8px; padding: 5px 10px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; font-weight: 900; text-align: center; transform: rotate(-2deg); position: absolute; top: 30px; left: 10px; background: rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1); z-index: 10; font-size: 12px; }
            .cachet-title { font-size: 14px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: -0.5px; }
            .cachet-sub { font-size: 18px; margin-bottom: 2px; }
            .cachet-addr { font-size: 10px; line-height: 1.2; }
            .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; color: rgba(255, 200, 0, 0.05); font-weight: 900; z-index: -1; pointer-events: none; }
            .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #333; border-top: 1px solid #ccc; padding-top: 8px; padding-bottom: 8px; background: white; }
          </style>
        </head>
        <body>
          <div class="watermark">SOMA</div>
          <div class="header-container">
             <img src="${SOMA_LOGO_URL}" alt="Logo SOMA" id="logo" />
          </div>
          <div class="main-title-box"><div class="main-title">BON DE LIVRAISON</div></div>
          <div class="grid-container">
             <div>
                <div class="sender-info"><strong>SOCIETE MINIERE AFRICAINE</strong><br/>11 rue Alfred goux<br/>Apt N1 1er Etage Dakar Plateau Sénégal<br/>TEL : 77 260 95 67</div>
                <div style="margin-top: 15px;"><div class="info-label">Programme</div><div class="info-value" style="border:none; background:#f9f9f9; padding:6px; font-weight:bold;">MASAE campagne agricole 2025/2026</div></div>
             </div>
             <div style="text-align: right;">
                <div style="margin-bottom: 10px;"><span style="font-weight:bold; margin-right: 10px;">DATE DE LIVRAISON</span><span style="border-bottom: 1px dotted #000; padding: 0 10px; font-family: monospace; font-size: 12px;">${new Date(item.delivery_date).toLocaleDateString('fr-FR')}</span></div>
                <div style="margin-bottom: 10px;"><span style="font-weight:bold; margin-right: 10px;">NUMERO BL</span><span style="background: #eee; padding: 4px 8px; font-family: monospace; font-weight:bold; font-size: 13px;">${item.bl_number}</span></div>
                <div style="text-align: left; margin-top: 15px; border: 1px solid #ccc; padding: 8px;">
                   <div class="info-label">DESTINATAIRE</div><div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${item.operator_name}</div>
                   <div class="info-label" style="margin-top:8px;">EXPÉDIEZ À</div><div>${item.region} / ${item.department}</div><div style="font-weight:bold;">${item.commune}</div><div style="font-size:10px; color:#666;">${item.operator_coop_name || ''}</div>
                   <div style="font-size:10px; color:#666; margin-top:2px;">${item.operator_contact_info || ''}</div>
                </div>
             </div>
          </div>
          <div class="modalites-box"><div class="info-label">Modalités</div><div style="margin-top: 4px; font-size: 12px;"><span style="margin-right: 20px;">Camion de transport N : <strong>${item.truck_plate_number || '________________'}${trailerStr}</strong></span><span>Chauffeur : <strong>${item.driver_name || '________________'}</strong></span></div></div>
          <table>
             <thead><tr><th width="70%">DESCRIPTION</th><th width="30%" style="text-align:right;">Quantité / Tonnes</th></tr></thead>
             <tbody>
                <tr><td><strong>Engrais à base de phosphate naturel</strong><br/><span style="font-size:10px; color:#555;">Sac de 50 kg – Campagne agricole 2025-2026</span><br/><span style="font-size:10px; color:#555;">Projet Phase ${item.numero_phase} (Bon N° ${item.project_num_bon})</span></td><td style="text-align:right; font-size:14px; font-weight:bold;">${item.tonnage_loaded}</td></tr>
                <tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr class="total-row"><td style="text-align:right; padding-right: 20px;">SOUS-TOTAL</td><td style="text-align:right;">${item.tonnage_loaded}</td></tr>
             </tbody>
          </table>
          <div style="margin-top: 15px; font-size: 10px; color: #555; font-style: italic;">Remarques /instructions : Marchandise reçue en bon état.</div>
          <div class="footer-section">
             <div class="signature-box"><div class="signature-title">Réceptionnaire</div><div>${item.operator_name}</div><div style="margin-top:5px; font-size:10px;">${item.operator_contact_info || ''}</div></div>
             <div class="signature-box" style="text-align: right;"><div class="signature-title">Signature SOMA</div><div class="cachet-box" style="left: auto; right: 0;"><div class="cachet-title">SOCIETE MINIERE AFRICAINE</div><div class="cachet-sub">" SOMA "</div><div class="cachet-addr">11, Rue Alfred Goux<br/>Le Directeur Général</div></div></div>
          </div>
          <div class="doc-footer">SARL au capital de 10 000 000 F CFA – Siege social: 11 rue Alfred goux Apt N1 1er Etage<br/>Tel: +221 77 247 25 00 – fax: +221 33 827 95 85 mdiene@gmail.com</div>
          <script>
            window.onload = () => {
              const logo = document.getElementById('logo');
              const finalize = () => setTimeout(() => { window.print(); window.close(); }, 500);
              if (logo.complete) {
                finalize();
              } else {
                logo.onload = finalize;
                logo.onerror = finalize;
              }
            }
          </script>
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
            .header-container { display: flex; align-items: center; margin-bottom: 20px; justify-content: center; }
            .header-container img { height: 80px; width: auto; object-fit: contain; }
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
             <img src="${SOMA_LOGO_URL}" alt="Logo SOMA" id="logo" />
          </div>
          <div class="date-line">Date : ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="doc-title"><h2>Procès Verbal de Réception des Intrants Agricoles</h2><p>CAMPAGNE AGRICOLE 2025-2026</p></div>
          <div class="content-block"><strong>COMMUNE DE : <span style="text-transform: uppercase; border-bottom: 1px dotted #000;">${item.commune}</span></strong></div>
          <div class="content-block">Suite à la notification de mise à disposition d’engrais N° 394/MASAE/DA faite à la société minière africaine et selon le planning de la lettre N° 0971/DA/BRAFS de mise en place phosphate naturel.</div>
          <table><thead><tr><th>Coopérative / GIE</th><th>Représentant</th><th>Produit</th><th>Quantité / Tonnes</th></tr></thead><tbody><tr><td>${item.operator_coop_name || item.operator_name}</td><td>${item.operator_name}</td><td>Phosphate naturel</td><td>${item.total_tonnage}</td></tr></tbody></table>
          <div class="content-block">La commission de réception des engrais du point de réception de la commune de <strong>${item.commune}</strong> du Département de <strong>${item.department}</strong> de la région de <strong>${item.region}</strong>.<br/><br/>Composée des personnes dont les noms sont ci-dessus indiqués, certifie que La SOMA a effectivement livré <strong>${item.total_tonnage}</strong> tonnes à l’opérateur : <strong>${item.operator_coop_name || item.operator_name}</strong>.</div>
          <div class="signatures"><p><strong>Ont signé :</strong></p><table class="sig-table"><tr><td width="40%" class="sig-header">Prénom et nom</td><td width="30%" class="sig-header">Téléphone</td><td width="30%" class="sig-header">Signature</td></tr><tr><td class="sig-line" style="vertical-align: bottom;">${item.operator_name}</td><td class="sig-line" style="vertical-align: bottom;">${item.operator_phone || ''}</td><td class="sig-line"></td></tr></table></div>
          <script>
            window.onload = () => {
              const logo = document.getElementById('logo');
              const finalize = () => setTimeout(() => { window.print(); window.close(); }, 500);
              if (logo.complete) {
                finalize();
              } else {
                logo.onload = finalize;
                logo.onerror = finalize;
              }
            }
          </script>
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

      {/* Filter Bar */}
      <div className="bg-card p-2 rounded-xl border border-border flex items-center gap-4 overflow-x-auto shadow-sm min-h-[4rem]">
         <div className="flex items-center gap-2 px-3 border-r border-border text-muted-foreground shrink-0 h-full">
            <Filter size={16} />
            <span className="text-xs font-semibold uppercase hidden sm:inline">Filtrer</span>
         </div>
         <form className="filter shrink-0">
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
            {visibleProjects.map(p => (
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
         
         <div className="divider divider-horizontal text-muted-foreground text-xs mx-0">ou</div>

         {/* Flatpickr Range Picker */}
         <div className="relative max-w-sm shrink-0">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
               <Calendar size={16} className="text-muted-foreground" />
            </div>
            <input 
              ref={dateRangeInputRef}
              type="text" 
              className="input max-w-sm ps-10 cursor-pointer" 
              placeholder="Période (Début à Fin)" 
              id="flatpickr-range" 
            />
            {dateRange.start && (
               <button 
                 onClick={() => {
                    // Clear via ref if available or just update state, flatpickr will need clearing too
                    if (dateRangeInputRef.current && (window as any).flatpickr) {
                       (dateRangeInputRef.current as any)._flatpickr.clear();
                    }
                 }}
                 className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
               >
                 <X size={14} />
               </button>
            )}
         </div>

         <div className="ml-auto pl-4 border-l border-border">
            <button 
               onClick={handleExportCSV}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
               <FileSpreadsheet size={16} />
               <span className="hidden sm:inline">Exporter CSV</span>
            </button>
         </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        {/* Removed redundant tab buttons */}
        <div className="p-0">
          {activeTab === 'bon_livraison' && (
            <>
              {/* Toolbar BL */}
              <div className="p-4 border-b border-border flex justify-end">
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                   <div className="text-xs font-semibold uppercase px-2 text-muted-foreground flex items-center gap-1">
                     <Layers size={14} /> Grouper:
                   </div>
                   <button onClick={() => setBlGroupBy('date')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'date' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><Calendar size={14} /> Date</button>
                   <button onClick={() => setBlGroupBy('operator')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'operator' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><User size={14} /> Opérateur</button>
                   <button onClick={() => setBlGroupBy('region')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${blGroupBy === 'region' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-muted-foreground'}`}><MapPin size={14} /> Région</button>
                   {blGroupBy !== 'none' && <button onClick={() => setBlGroupBy('none')} className="p-1.5 hover:bg-background rounded text-muted-foreground"><X size={14} /></button>}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="table table-striped">
                  <thead className="bg-primary/5 border-b-2 border-primary/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">N° BL</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Opérateur / Détails</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Localisation</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedBlData.map((group) => (
                      <Fragment key={group.key}>
                        {blGroupBy !== 'none' && (
                          <tr className="bg-muted/30">
                            <td colSpan={5} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">
                              {group.key} ({group.items.length}) - Total: {group.total} T
                            </td>
                          </tr>
                        )}
                        {group.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                               <div className="flex flex-col">
                                  <span className="font-mono font-medium text-foreground">{item.bl_number}</span>
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                     Phase {item.numero_phase} (Bon: {item.project_num_bon})
                                  </span>
                               </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-foreground">{item.operator_name}</span>
                                {item.operator_coop_name && (
                                  <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800">
                                      <Package size={12} /> {item.tonnage_loaded} T
                                      <span className="text-blue-300 mx-1">|</span>
                                      <Truck size={12} /> {item.truck_plate_number || 'Camion Inconnu'}
                                   </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.commune}, {item.department}, {item.region}
                            </td>
                            <td className="px-4 py-3 text-center">
                               <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => downloadBLPdf(item)}
                                    disabled={downloadingId === item.bl_number}
                                    className={`btn btn-text btn-sm text-blue-500 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2 ${downloadingId === item.bl_number ? 'opacity-50 cursor-wait' : ''}`}
                                    title={`${item.bl_number} - ${item.operator_name}.pdf`}
                                  >
                                      <Download size={16} />
                                  </button>
                                  <button 
                                    onClick={() => fullPrintBL(item)}
                                    className="btn btn-text btn-sm text-muted-foreground hover:bg-muted rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2"
                                    title="Imprimer BL"
                                  >
                                      <Printer size={16} />
                                  </button>
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

              <div className="w-full overflow-x-auto">
                <table className="table table-striped">
                  <thead className="bg-primary/5 border-b-2 border-primary/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Opérateur</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Localisation</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Phase Projet</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-primary uppercase tracking-wider">Nbr Livraisons</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider">Tonnage Total</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedFcData.map((group) => (
                      <Fragment key={group.key}>
                        {fcGroupBy !== 'none' && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-foreground tracking-wider">
                              Région: {group.key} ({group.items.length}) - Total: {group.total} T
                            </td>
                          </tr>
                        )}
                        {group.items.map((item, idx) => {
                          const fcUniqueId = `FC-PH${item.project_phase}-${item.operator_id.slice(0, 4)}`;
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{item.operator_name}</span>
                                  {item.operator_coop_name && (
                                    <span className="text-xs text-muted-foreground">{item.operator_coop_name}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {item.commune}, {item.department}, {item.region}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                Phase {item.project_phase}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-sm text-foreground">
                                {item.deliveries_count}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                                {item.total_tonnage} T
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => downloadFCPdf(item)}
                                    disabled={downloadingId === fcUniqueId}
                                    className={`btn btn-text btn-sm text-blue-500 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2 ${downloadingId === fcUniqueId ? 'opacity-50 cursor-wait' : ''}`}
                                    title="Enregistrer PDF"
                                  >
                                      <Download size={16} />
                                  </button>
                                  <button 
                                    onClick={() => fullPrintFC(item)}
                                    className="btn btn-text btn-sm text-muted-foreground hover:bg-muted rounded-lg inline-flex items-center gap-1 text-sm font-medium w-auto px-2"
                                    title="Imprimer PV"
                                  >
                                      <Printer size={16} />
                                  </button>
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
