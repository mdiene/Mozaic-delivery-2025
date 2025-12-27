
import React from 'react';
import { Grid, Factory, Package } from 'lucide-react';

export const ProductionScreening = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suivi du Cribblage</h1>
          <p className="text-muted-foreground text-sm">Gestion des opérations de tamisage et de calibrage du phosphate.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-primary/10 text-primary rounded-xl"><Grid size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Volume Criblé</p>
              <p className="text-xl font-bold font-mono">0 T</p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Factory size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Rendement Machine</p>
              <p className="text-xl font-bold font-mono">0%</p>
           </div>
        </div>
      </div>

      <div className="bg-card p-12 text-center text-muted-foreground border border-border rounded-2xl italic shadow-soft-sm">
         Module Cribblage en cours de configuration.
      </div>
    </div>
  );
};
