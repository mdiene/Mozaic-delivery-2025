
import { useEffect, useState } from 'react';
import { db } from '../services/db';
import { useProject } from '../components/Layout';
import { GoogleGenAI } from "@google/genai";
import { Navigation, Clock, MapPin, Search } from 'lucide-react';

export const Itinerary = () => {
  const { selectedProject } = useProject();
  const [loading, setLoading] = useState(true);
  
  // Gemini Route Logic
  const [origin, setOrigin] = useState("Amadi Ounare");
  const [stops, setStops] = useState("");
  const [targetCommunes, setTargetCommunes] = useState<string[]>([]);
  const [routeResults, setRouteResults] = useState<Record<string, { distance: string, duration: string, mapLink: string }>>({});
  const [calculating, setCalculating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await db.getNetworkHierarchy(selectedProject);
      
      // Extract unique commune names for routing list
      const communes = new Set<string>();
      data.forEach(r => {
        r.departments.forEach(d => {
          d.communes.forEach(c => {
             communes.add(`${c.name}, ${d.name}`);
          });
        });
      });
      setTargetCommunes(Array.from(communes).sort());
      setLoading(false);
    };
    loadData();
  }, [selectedProject]);

  const calculateRoute = async (destination: string) => {
    setCalculating(destination);
    try {
      const apiKey = process.env.API_KEY;
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
      
      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const result = JSON.parse(jsonMatch[0]);
         
         let mapUri = result.mapLink;
         const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
         if (grounding) {
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

  const filteredCommunes = targetCommunes.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calcul d'Itinéraire</h1>
          <p className="text-muted-foreground text-sm">Planification logistique optimisée via Google Gemini</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-fit">
           <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
             <Navigation size={20} className="text-primary" /> Configuration
           </h3>
           
           <div className="space-y-4">
             <div>
               <label className="text-sm font-medium text-foreground mb-1 block">Origine (Entrepôt)</label>
               <div className="flex items-center gap-2 bg-background border border-input rounded-lg p-2.5 focus-within:ring-1 focus-within:ring-primary">
                  <MapPin size={18} className="text-primary" />
                  <input 
                    className="bg-transparent w-full text-sm outline-none text-foreground placeholder:text-muted-foreground"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Point de départ"
                  />
               </div>
               {origin.includes("Amadi") && (
                  <p className="text-xs text-muted-foreground mt-1 ml-1 font-mono">
                     GPS: 15.3469, -13.0218
                  </p>
               )}
             </div>

             <div>
               <label className="text-sm font-medium text-foreground mb-1 block">Étapes (Optionnel)</label>
               <textarea 
                  className="w-full bg-background border border-input rounded-lg p-3 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary min-h-[80px]"
                  placeholder="Ex: Arrêt à Touba, puis Diourbel..."
                  value={stops}
                  onChange={(e) => setStops(e.target.value)}
               />
             </div>
           </div>
        </div>

        {/* Destinations List */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Destinations ({filteredCommunes.length})</h3>
              <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                 <input 
                   type="text"
                   placeholder="Filtrer les communes..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                 />
              </div>
           </div>

           {loading ? (
             <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
               Chargement des destinations...
             </div>
           ) : filteredCommunes.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
               Aucune destination trouvée pour ce projet.
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredCommunes.map((dest, idx) => (
                 <div key={idx} className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                       <span className="font-bold text-foreground">{dest}</span>
                       <button 
                         onClick={() => calculateRoute(dest)}
                         disabled={calculating === dest}
                         className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors"
                       >
                         {calculating === dest ? 'Calcul...' : 'Calculer'}
                       </button>
                    </div>
                    
                    {routeResults[dest] ? (
                       <div className="pt-3 border-t border-border mt-3 animate-fade-in">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                             <div className="flex items-center gap-2 text-sm text-foreground font-medium bg-muted/30 p-2 rounded">
                               <Navigation size={14} className="text-blue-500" /> 
                               {routeResults[dest].distance}
                             </div>
                             <div className="flex items-center gap-2 text-sm text-foreground font-medium bg-muted/30 p-2 rounded">
                               <Clock size={14} className="text-amber-500" /> 
                               {routeResults[dest].duration}
                             </div>
                          </div>
                          <a 
                            href={routeResults[dest].mapLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-2 font-medium"
                          >
                            Ouvrir dans Google Maps &rarr;
                          </a>
                       </div>
                    ) : (
                       <div className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border/50 flex items-center gap-2 opacity-60">
                          <Navigation size={12} />
                          En attente de calcul
                       </div>
                    )}
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
