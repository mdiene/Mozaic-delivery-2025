
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { useProject } from '../components/Layout';
import RegionalGraph from '../components/RegionalGraph';
import { NetworkHierarchy } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Navigation, Clock, MapPin, Layers, Filter } from 'lucide-react';

export const NetworkPage = () => {
  const { selectedProject, projects, setSelectedProject } = useProject();
  const [graphData, setGraphData] = useState<NetworkHierarchy>([]);
  const [loading, setLoading] = useState(true);
  
  // Gemini Route Logic
  const [origin, setOrigin] = useState("Amadi Ounare");
  const [stops, setStops] = useState("");
  const [targetCommunes, setTargetCommunes] = useState<string[]>([]);
  const [routeResults, setRouteResults] = useState<Record<string, { distance: string, duration: string, mapLink: string }>>({});
  const [calculating, setCalculating] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await db.getNetworkHierarchy(selectedProject);
      setGraphData(data);
      
      // Extract unique commune names for routing list
      const communes = new Set<string>();
      data.forEach(r => {
        r.departments.forEach(d => {
          d.communes.forEach(c => {
             communes.add(`${c.name}, ${d.name}`);
          });
        });
      });
      setTargetCommunes(Array.from(communes));
      setLoading(false);
    };
    loadData();
  }, [selectedProject]);

  const calculateRoute = async (destination: string) => {
    setCalculating(destination);
    try {
      const apiKey = (window as any).process?.env?.API_KEY;
      if (!apiKey) {
        alert("API Key missing. Please configure environment.");
        setCalculating(null);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Use specific coordinates for the warehouse if default is selected to ensure Google Maps precision
      const originQuery = origin.toLowerCase().includes("amadi") 
        ? "Amadi Ounare (15.346918959764999, -13.021794499700828)" 
        : origin;

      const prompt = `
        Calculate the driving route from "${originQuery}" to "${destination}" in Senegal.
        ${stops ? `Include stops at: ${stops}.` : ''}
        Provide the estimated distance (km) and duration.
        Also provide a Google Maps URL for this route.
        Format response purely as JSON: { "distance": "X km", "duration": "Y hours", "mapLink": "https://..." }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });
      
      // Basic parsing since we asked for JSON format in text
      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const result = JSON.parse(jsonMatch[0]);
         
         // Extract grounded link if available, fallback to generated link
         let mapUri = result.mapLink;
         const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
         if (grounding) {
            // Try to find a map link in grounding metadata
            const mapChunk = grounding.find((c: any) => c.web?.uri?.includes('maps.google') || c.web?.uri?.includes('goo.gl'));
            if (mapChunk) mapUri = mapChunk.web.uri;
         }

         setRouteResults(prev => ({
           ...prev,
           [destination]: {
             distance: result.distance,
             duration: result.duration,
             mapLink: mapUri
           }
         }));
      }
    } catch (e) {
      console.error(e);
      alert("Error calculating route. See console.");
    } finally {
      setCalculating(null);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Réseau de Distribution & Intelligence Logistique</h1>
          <p className="text-muted-foreground text-sm">Vue hiérarchique du réseau et calcul d'itinéraires optimisés.</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* LEFT: Graph Visualization (2/3) */}
         <div className="lg:col-span-2 h-full flex flex-col">
           {/* Filter Toolbar */}
           <div className="bg-card p-2 rounded-xl border border-border mb-4 flex items-center gap-2 overflow-x-auto shadow-sm shrink-0">
              <div className="flex items-center gap-2 px-3 border-r border-border text-muted-foreground">
                <Filter size={16} />
                <span className="text-xs font-semibold uppercase hidden sm:inline">Filtres</span>
              </div>
              <button
                onClick={() => setSelectedProject('all')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedProject === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Vue d'ensemble
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedProject === p.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
                </button>
              ))}
           </div>

           {/* Graph Container */}
           <div className="flex-1 min-h-0 bg-card rounded-2xl border border-border overflow-hidden relative shadow-soft-xl">
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

         {/* RIGHT: Route Intelligence (1/3) */}
         <div className="bg-card rounded-2xl shadow-soft-xl border border-border flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
               <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                 <Navigation size={18} className="text-primary" /> 
                 Calcul d'Itinéraire
               </h3>
               <p className="text-xs text-muted-foreground">Optimisation logistique via Google Maps</p>
            </div>
            
            <div className="p-4 space-y-4 border-b border-border">
               <div>
                 <label className="text-xs font-semibold text-muted-foreground uppercase">Origine (Entrepôt)</label>
                 <div className="flex items-center gap-2 mt-1 bg-background border border-input rounded-lg p-2">
                    <MapPin size={16} className="text-primary" />
                    <input 
                      className="bg-transparent w-full text-sm outline-none text-foreground"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                 </div>
                 {origin === "Amadi Ounare" && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                       GPS: 15.3469, -13.0218
                    </p>
                 )}
               </div>
               <div>
                 <label className="text-xs font-semibold text-muted-foreground uppercase">Étapes Intermédiaires (Optionnel)</label>
                 <input 
                    className="w-full mt-1 bg-background border border-input rounded-lg p-2 text-sm outline-none text-foreground placeholder:text-muted-foreground/50"
                    placeholder="Ex: Touba, Diourbel..."
                    value={stops}
                    onChange={(e) => setStops(e.target.value)}
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Destinations Actives</label>
               {targetCommunes.length === 0 && (
                 <p className="text-sm text-muted-foreground italic">Aucune destination active trouvée pour ce projet.</p>
               )}
               {targetCommunes.map((dest, idx) => (
                 <div key={idx} className="p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-medium text-sm text-foreground">{dest}</span>
                       <button 
                         onClick={() => calculateRoute(dest)}
                         disabled={calculating === dest}
                         className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 disabled:opacity-50"
                       >
                         {calculating === dest ? 'Calcul...' : 'Calculer'}
                       </button>
                    </div>
                    
                    {routeResults[dest] && (
                       <div className="mt-2 pt-2 border-t border-border/50 text-xs animate-fade-in">
                          <div className="flex items-center gap-4 mb-1">
                             <span className="flex items-center gap-1 text-foreground font-medium">
                               <Navigation size={12} /> {routeResults[dest].distance}
                             </span>
                             <span className="flex items-center gap-1 text-muted-foreground">
                               <Clock size={12} /> {routeResults[dest].duration}
                             </span>
                          </div>
                          <a 
                            href={routeResults[dest].mapLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            Voir sur Google Maps &rarr;
                          </a>
                       </div>
                    )}
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
