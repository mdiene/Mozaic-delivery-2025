
import React from 'react';
import { HardHat, Mountain, Truck } from 'lucide-react';

export const ProductionExcavation = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suivi d'Excavation</h1>
          <p className="text-muted-foreground text-sm">Gestion de l'extraction minière et des volumes bruts en stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-primary/10 text-primary rounded-xl"><HardHat size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Volume Extrait</p>
              <p className="text-xl font-bold font-mono">0 T</p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><Mountain size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Stock Brut</p>
              <p className="text-xl font-bold font-mono">0 T</p>
           </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-soft-xl flex items-center gap-4">
           <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><Truck size={24} /></div>
           <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Rotations Engins</p>
              <p className="text-xl font-bold font-mono">0</p>
           </div>
        </div>
      </div>

      <div className="bg-card p-12 text-center text-muted-foreground border border-border rounded-2xl italic shadow-soft-sm">
         Module Excavation en cours de configuration.
      </div>
    </div>
  );
};
