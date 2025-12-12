
import { useEffect, useState } from 'react';
import { db } from '../services/db';
import { useProject } from '../components/Layout';
import RegionalGraph from '../components/RegionalGraph';
import { NetworkHierarchy } from '../types';
import { Filter, Maximize2, Minimize2, Layers } from 'lucide-react';

export const NetworkPage = () => {
  const { selectedProject, projects, setSelectedProject } = useProject();
  const [graphData, setGraphData] = useState<NetworkHierarchy>([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await db.getNetworkHierarchy(selectedProject);
      setGraphData(data);
      setLoading(false);
    };
    loadData();
  }, [selectedProject]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carte du Réseau</h1>
          <p className="text-muted-foreground text-sm">Visualisation hiérarchique des distributions par région.</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
         {/* Filter Toolbar */}
         <div className="bg-card p-2 rounded-xl border border-border mb-4 flex items-center gap-2 overflow-x-auto shadow-sm shrink-0">
            <div className="flex items-center gap-2 px-3 border-r border-border text-muted-foreground">
              <Filter size={16} />
              <span className="text-xs font-semibold uppercase hidden sm:inline">Filtres</span>
            </div>
            <form className="filter">
              <input 
                className="btn btn-square" 
                type="reset" 
                value="×" 
                onClick={() => setSelectedProject('all')}
                title="Réinitialiser"
              />
              <input 
                className="btn" 
                type="radio" 
                name="network-filter" 
                aria-label="Vue d'ensemble"
                checked={selectedProject === 'all'}
                onChange={() => setSelectedProject('all')}
              />
              {projects.map(p => (
                <input
                  key={p.id}
                  className="btn" 
                  type="radio" 
                  name="network-filter" 
                  aria-label={`Phase ${p.numero_phase}${p.numero_marche ? ` - ${p.numero_marche}` : ''}`}
                  checked={selectedProject === p.id}
                  onChange={() => setSelectedProject(p.id)}
                />
              ))}
            </form>
         </div>

         {/* Graph Container */}
         <div className={`
           bg-card border border-border overflow-hidden relative shadow-soft-xl transition-all duration-300
           ${isFullScreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'flex-1 min-h-0 rounded-2xl'}
         `}>
           {/* Fullscreen Toggle */}
           <div className="absolute top-4 right-4 z-10">
             <button
               onClick={() => setIsFullScreen(!isFullScreen)}
               className="p-2 bg-background/90 backdrop-blur border border-border rounded-lg shadow-sm text-foreground hover:text-primary transition-colors"
               title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
             >
               {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
             </button>
           </div>

           {loading ? (
             <div className="w-full h-full flex items-center justify-center text-muted-foreground">
               <div className="flex flex-col items-center gap-2">
                 <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                 <span>Chargement du réseau...</span>
               </div>
             </div>
           ) : graphData.length > 0 ? (
               <RegionalGraph regions={graphData} />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-muted-foreground p-8 text-center">
               <div>
                 <Layers size={48} className="mx-auto mb-4 opacity-20" />
                 <p>Aucune donnée de réseau pour ce projet.</p>
                 <p className="text-xs mt-2 opacity-60">Vérifiez qu'il existe des allocations et des départements configurés.</p>
               </div>
             </div>
           )}
         </div>
      </div>
    </div>
  );
};
