
import React, { useRef, useEffect } from 'react';
import { Network } from 'vis-network';
import { NetworkHierarchy } from '../types';

interface Props {
  regions: NetworkHierarchy;
}

// Generate pie chart SVG as data URI
const generatePieChartSVG = (completionRate: number, colorHex: string) => {
  const percentage = Math.min(100, Math.max(0, Math.round(completionRate)));
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~220
  const offset = circumference - (percentage / 100) * circumference;
  
  // Create SVG string
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <!-- Background Circle -->
      <circle cx="40" cy="40" r="${radius}" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2" />
      
      <!-- Progress Circle -->
      <circle 
        cx="40" 
        cy="40" 
        r="${radius}" 
        fill="none" 
        stroke="${colorHex}" 
        stroke-width="8" 
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 40 40)"
        stroke-linecap="round"
      />
      
      <!-- Text -->
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14" font-weight="bold" fill="#374151">
        ${percentage}%
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Colors matching Tailwind palette
const HEX_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4'  // cyan-500
];

export default function RegionalGraph({ regions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || regions.length === 0) return;

    // 1. Prepare Nodes & Edges
    const nodes: any[] = [];
    const edges: any[] = [];

    // Central Hub
    nodes.push({
      id: 'hub',
      label: 'Mine de Soma',
      shape: 'circle',
      color: { background: '#1e293b', border: '#0f172a' },
      font: { color: '#ffffff', size: 16, bold: true },
      size: 50,
      shadow: true,
      level: 0
    });

    regions.forEach((region, rIndex) => {
      const color = HEX_COLORS[rIndex % HEX_COLORS.length];
      const pieImage = generatePieChartSVG(region.completionRate, color);

      // --- Level 1: Region (Pie Chart) ---
      nodes.push({
        id: region.id,
        label: region.name,
        shape: 'image',
        image: pieImage,
        size: 40,
        font: { size: 14, color: '#374151', bold: true, vadjust: 45 },
        title: `Région: ${region.name}\nCible: ${region.target} T\nLivré: ${region.delivered} T`
      });

      edges.push({
        from: 'hub',
        to: region.id,
        width: 3,
        color: { color: color, opacity: 0.8 },
        length: 250
      });

      // --- Level 2: Departments ---
      region.departments.forEach((dept, dIndex) => {
        const deptNodeId = dept.id;
        
        nodes.push({
          id: deptNodeId,
          label: dept.name,
          shape: 'box',
          color: { background: '#ffffff', border: color },
          font: { size: 12, color: '#4b5563' },
          borderWidth: 2,
          shapeProperties: { borderRadius: 4 },
          title: `Département: ${dept.name}\nCible: ${dept.target} T\nLivré: ${dept.delivered} T`
        });

        edges.push({
          from: region.id,
          to: deptNodeId,
          width: 2,
          color: { color: color, opacity: 0.5 },
          length: 120
        });

        // --- Level 3: Communes ---
        dept.communes.forEach((commune, cIndex) => {
          const communeNodeId = commune.id;
          
          nodes.push({
            id: communeNodeId,
            label: commune.name,
            shape: 'dot',
            size: 8,
            color: { background: color, border: '#ffffff' },
            font: { size: 10, color: '#6b7280', vadjust: 15 },
            borderWidth: 2,
            title: `Commune: ${commune.name}\nLivraisons: ${commune.deliveries.length}\nVolume: ${commune.delivered} T`
          });

          edges.push({
            from: deptNodeId,
            to: communeNodeId,
            width: 1,
            color: { color: '#cbd5e1', opacity: 1 },
            length: 80
          });

          // --- Level 4: Deliveries (Individual Dots) ---
          if (commune.deliveries && commune.deliveries.length > 0) {
            commune.deliveries.forEach((del) => {
               const deliveryId = `del-${del.id}`;
               
               nodes.push({
                 id: deliveryId,
                 label: '',
                 shape: 'dot',
                 size: 4,
                 color: '#10b981', // Emerald for active delivery
                 group: 'delivery',
                 title: `Livraison: ${del.bl_number}\nCharge: ${del.tonnage} T\nCamion: ${del.truck_plate}\nChauffeur: ${del.driver_name}`
               });

               edges.push({
                 from: communeNodeId,
                 to: deliveryId,
                 length: 20,
                 color: { color: '#10b981', opacity: 0.4 },
                 width: 1
               });
            });
          }
        });
      });
    });

    // 2. Configuration Options
    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 1,
        shadow: false,
        smooth: {
          enabled: true,
          type: 'continuous',
          forceDirection: 'none',
          roundness: 0.5
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          iterations: 2000
        },
        barnesHut: {
          gravitationalConstant: -4000,
          centralGravity: 0.1,
          springLength: 100,
          springConstant: 0.05,
          damping: 0.09,
          avoidOverlap: 0.5
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100, // Faster tooltip
        zoomView: true
      }
    };

    // 3. Initialize Network
    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [regions]);

  return (
    <div className="w-full bg-card rounded-2xl shadow-soft-xl border border-border overflow-hidden flex flex-col h-full">
       <div className="p-4 border-b border-border bg-muted/20 shrink-0">
          <h3 className="font-bold text-lg text-foreground">Carte du Réseau</h3>
          <p className="text-xs text-muted-foreground">Hub → Région → Département → Commune → Livraisons (•)</p>
       </div>
       {/* Use relative positioning for parent and absolute inset-0 for container to prevent infinite resize loop */}
       <div className="relative w-full flex-1 bg-muted/5 min-h-[500px]">
          <div ref={containerRef} className="absolute inset-0" />
          
          {/* Legend Overlay */}
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur p-3 rounded-lg border border-border shadow-sm text-xs space-y-2 pointer-events-none">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-900"></div>
                <span className="text-foreground font-medium">Mine de Soma (Hub)</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white"></div>
                <span className="text-foreground font-medium">Région (Taux %)</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-blue-500 bg-white rounded-sm"></div>
                <span className="text-foreground font-medium">Département</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-foreground font-medium">Commune</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-foreground font-medium">Livraisons Actives</span>
             </div>
          </div>
       </div>
    </div>
  );
}
