
import React, { useRef, useEffect } from 'react';
import { Network } from 'vis-network';
import { RegionPerformance } from '../types';

interface Props {
  regions: RegionPerformance[];
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
      font: { color: '#ffffff', size: 14, bold: true },
      size: 40,
      shadow: true
    });

    regions.forEach((region, index) => {
      const color = HEX_COLORS[index % HEX_COLORS.length];
      const pieImage = generatePieChartSVG(region.completionRate, color);

      // Region Node (with Pie Chart Image)
      nodes.push({
        id: region.regionId,
        label: region.regionName,
        shape: 'image',
        image: pieImage,
        size: 40,
        font: { size: 12, color: '#374151', multi: true, vadjust: 45 },
        title: `
          Region: ${region.regionName}
          Target: ${region.targetTonnage} T
          Delivered: ${region.deliveredTonnage} T (${region.completionRate.toFixed(1)}%)
          Deliveries: ${region.deliveryCount}
        ` // Tooltip
      });

      // Edge Hub -> Region
      edges.push({
        from: 'hub',
        to: region.regionId,
        width: Math.max(1, (region.completionRate / 100) * 8), // Thicker line for higher completion
        color: { color: color, opacity: 0.6 },
        length: 200, // Spring length
        dashes: region.completionRate === 0
      });

      // Delivery Satellite Nodes (Visual flourish if deliveries exist)
      if (region.deliveryCount > 0) {
        const satCount = Math.min(3, Math.ceil(region.deliveryCount / 5)); // Cap at 3 satellites
        for (let i = 0; i < satCount; i++) {
           const satId = `${region.regionId}-sat-${i}`;
           nodes.push({
             id: satId,
             label: '',
             shape: 'dot',
             size: 5,
             color: color,
             group: 'satellite'
           });
           edges.push({
             from: region.regionId,
             to: satId,
             length: 30,
             color: { color: color, opacity: 0.3 },
             width: 1
           });
        }
      }
    });

    // 2. Configuration Options
    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 2,
        shadow: false,
        smooth: {
          type: 'continuous'
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          iterations: 1000
        },
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.2
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: false // Disable zoom for cleaner dashboard look
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
    <div className="w-full bg-card rounded-2xl shadow-soft-xl border border-border overflow-hidden flex flex-col">
       <div className="p-6 border-b border-border">
          <h3 className="font-bold text-lg text-foreground">Réseau de Distribution</h3>
          <p className="text-sm text-muted-foreground">Visualisation des flux de livraison et performance régionale</p>
       </div>
       <div className="relative w-full h-[600px] bg-muted/10">
          <div ref={containerRef} className="w-full h-full" />
          
          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg border border-border shadow-sm text-xs space-y-2">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-900"></div>
                <span className="text-foreground font-medium">Hub Central</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white"></div>
                <span className="text-foreground font-medium">Région (% Réalisé)</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-emerald-500 opacity-60 rounded"></div>
                <span className="text-foreground font-medium">Volume de Flux</span>
             </div>
          </div>
       </div>
    </div>
  );
}
