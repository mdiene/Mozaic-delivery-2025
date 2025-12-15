
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Truck } from '../types';
import { ScanBarcode, Truck as TruckIcon, Clock, ArrowRight, User, Search, RefreshCw, X, Camera, MapPin } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const TruckFIFO = () => {
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [onSiteTrucks, setOnSiteTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedTruck, setLastScannedTruck] = useState<Truck | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allTrucks = await db.getTrucks();
      setTrucks(allTrucks);
      updateQueueList(allTrucks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateQueueList = (allTrucks: Truck[]) => {
    // Filter and sort ON_SITE trucks (FIFO)
    const onSite = allTrucks
      .filter(t => t.status === 'ON_SITE')
      .sort((a, b) => {
         if (!a.updated_at) return 1;
         if (!b.updated_at) return -1;
         return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      });
    setOnSiteTrucks(onSite);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualScan = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;

    let truckId = '';
    let plateNumber = '';

    // Attempt to parse JSON (QR Code Content)
    try {
      const data = JSON.parse(scanInput);
      if (data.id) truckId = data.id;
      if (data.plate) plateNumber = data.plate;
    } catch (err) {
      // Fallback: Treat input as Plate Number or exact ID
      plateNumber = scanInput.trim().toUpperCase();
    }

    const truck = trucks.find(t => t.id === truckId || t.plate_number === plateNumber);

    if (truck) {
      await enterTruckToQueue(truck);
      setScanInput('');
    } else {
      alert(`Camion non trouvé: ${scanInput}`);
    }
  };

  const enterTruckToQueue = async (truck: Truck) => {
    try {
      // Update status to ON_SITE and set timestamp
      const now = new Date().toISOString();
      await db.updateItem('trucks', truck.id, { 
        status: 'ON_SITE', 
        updated_at: now 
      });
      
      // Optimistic Update locally to reflect changes instantly
      const updatedTruck = { ...truck, status: 'ON_SITE' as const, updated_at: now };
      
      // Update global list state
      const newTrucksList = trucks.map(t => t.id === truck.id ? updatedTruck : t);
      setTrucks(newTrucksList);
      
      // Re-calculate queue list
      updateQueueList(newTrucksList);

      setLastScannedTruck(updatedTruck);
      
      // Auto-close scanner if open
      if (isScannerOpen) setIsScannerOpen(false);
      
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement du camion.");
    }
  };

  const startScanner = () => {
    setIsScannerOpen(true);
    setTimeout(() => {
      if (!scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          "reader", 
          { fps: 10, qrbox: 250 }, 
          /* verbose= */ false
        );
        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error(err));
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const onScanSuccess = (decodedText: string) => {
    // Stop scanning after success
    if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
    }
    setIsScannerOpen(false);
    
    // Process the text
    setScanInput(decodedText);
    
    // Logic to identify truck
    let truckId = '';
    let plateNumber = '';
    try {
        const data = JSON.parse(decodedText);
        if (data.id) truckId = data.id;
        if (data.plate) plateNumber = data.plate;
    } catch (e) {
       plateNumber = decodedText.trim().toUpperCase();
    }

    const truck = trucks.find(t => t.id === truckId || t.plate_number === plateNumber);
    if (truck) {
        enterTruckToQueue(truck);
    } else {
        alert("Camion non trouvé dans la base de données.");
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleDispatch = (truck: Truck) => {
    navigate(`/logistics/dispatch?action=new&truckId=${truck.id}`);
  };

  const handleRemoveFromQueue = async (truckId: string) => {
     if(!confirm("Retirer ce camion de la file d'attente ? Il sera marqué comme DISPONIBLE.")) return;
     try {
        await db.updateItem('trucks', truckId, { status: 'AVAILABLE' });
        
        // Update local state
        const updatedTrucks = trucks.map(t => t.id === truckId ? { ...t, status: 'AVAILABLE' as const } : t);
        setTrucks(updatedTrucks);
        updateQueueList(updatedTrucks);
     } catch(e) {
        alert("Erreur lors de la mise à jour.");
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File d'attente (FIFO)</h1>
          <p className="text-muted-foreground text-sm">Scanner les camions à l'arrivée pour les placer en file d'attente de chargement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input / Scanner */}
        <div className="space-y-6">
           <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                 <ScanBarcode size={20} className="text-primary" /> Entrée Camion
              </h3>
              
              {!isScannerOpen ? (
                 <div className="space-y-4">
                    <form onSubmit={handleManualScan} className="relative">
                       <input 
                          autoFocus
                          type="text" 
                          placeholder="Scanner QR ou saisir immatriculation..."
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none font-mono text-sm uppercase placeholder:normal-case"
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                       />
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    </form>
                    
                    <button 
                       onClick={() => handleManualScan()}
                       className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                       Valider Entrée
                    </button>

                    <div className="relative py-2">
                       <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                       <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OU</span></div>
                    </div>

                    <button 
                       onClick={startScanner}
                       className="w-full border border-border hover:bg-muted text-foreground py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                       <Camera size={18} /> Ouvrir Caméra
                    </button>
                 </div>
              ) : (
                 <div className="space-y-4">
                    <div id="reader" className="w-full rounded-lg overflow-hidden border border-border"></div>
                    <button 
                       onClick={stopScanner}
                       className="w-full bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg font-medium transition-colors"
                    >
                       Annuler le scan
                    </button>
                 </div>
              )}
           </div>

           {/* Last Scanned Feedback */}
           {lastScannedTruck && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full text-emerald-700 dark:text-emerald-100 shrink-0">
                       <TruckIcon size={20} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider mb-1">Succès</p>
                       <p className="font-bold text-lg text-emerald-900 dark:text-emerald-100">{lastScannedTruck.plate_number}</p>
                       <p className="text-sm text-emerald-700 dark:text-emerald-300">Statut mis à jour : <strong>ON SITE</strong></p>
                       <p className="text-xs text-emerald-600/80 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {new Date(lastScannedTruck.updated_at!).toLocaleTimeString()}
                       </p>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Right: The Queue */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm flex flex-col h-[600px]">
           <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                 <Clock size={20} className="text-muted-foreground" /> 
                 File d'Attente 
                 <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-mono">{onSiteTrucks.length}</span>
              </h3>
              <button onClick={fetchData} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors" title="Actualiser">
                 <RefreshCw size={16} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {onSiteTrucks.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <TruckIcon size={48} className="mb-4 text-muted-foreground/50" />
                    <p>Aucun camion sur site.</p>
                    <p className="text-xs mt-2">Scannez un camion pour l'ajouter.</p>
                 </div>
              ) : (
                 onSiteTrucks.map((truck, index) => (
                    <div 
                       key={truck.id} 
                       className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all bg-card relative overflow-hidden"
                    >
                       {/* Rank Number Background */}
                       <div className="absolute -left-2 -top-2 w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center text-4xl font-black text-muted-foreground/5 pointer-events-none">
                          {index + 1}
                       </div>

                       <div className="flex items-center gap-4 relative z-10 pl-4">
                          <div className="p-2.5 bg-primary/5 text-primary rounded-lg shrink-0">
                             <TruckIcon size={24} />
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-foreground font-mono">{truck.plate_number}</h4>
                                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                                   <MapPin size={10} /> Sur Site
                                </span>
                             </div>
                             <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                {truck.driver_name && (
                                   <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded"><User size={12} /> {truck.driver_name}</span>
                                )}
                                <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                                   <Clock size={12} /> 
                                   Arrivé à {truck.updated_at ? new Date(truck.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 mt-4 sm:mt-0 relative z-10 self-end sm:self-auto w-full sm:w-auto">
                          <button 
                             onClick={() => handleRemoveFromQueue(truck.id)}
                             className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                             title="Retirer de la file (Marquer comme Disponible)"
                          >
                             <X size={18} />
                          </button>
                          <button 
                             onClick={() => handleDispatch(truck)}
                             className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                          >
                             Créer BL <ArrowRight size={16} />
                          </button>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
