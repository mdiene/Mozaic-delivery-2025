
import { useState, useEffect, useRef, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Truck, DeliveryView } from '../types';
import { ScanBarcode, Truck as TruckIcon, Clock, ArrowRight, User, Search, RefreshCw, X, Camera, MapPin, Calendar, Printer, CheckCircle, Navigation, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';

// Helper for date grouping
const formatDateGroup = (dateStr?: string) => {
  if (!dateStr) return 'Date inconnue';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const TruckFIFO = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  
  const [onSiteTrucks, setOnSiteTrucks] = useState<Truck[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedTruck, setLastScannedTruck] = useState<Truck | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const isDriver = user?.role === 'DRIVER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allTrucks, allDeliveries] = await Promise.all([
         db.getTrucks(),
         db.getDeliveriesView()
      ]);
      
      setTrucks(allTrucks);
      setDeliveries(allDeliveries);
      
      processLists(allTrucks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processLists = (allTrucks: Truck[]) => {
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

  const groupedOnSite = useMemo(() => {
     const groups: Record<string, Truck[]> = {};
     onSiteTrucks.forEach(t => {
        const group = formatDateGroup(t.updated_at);
        if (!groups[group]) groups[group] = [];
        groups[group].push(t);
     });
     return groups;
  }, [onSiteTrucks]);

  const handleManualScan = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTruckId) return;

    const truck = trucks.find(t => t.id === selectedTruckId);

    if (truck) {
      await enterTruckToQueue(truck);
      setSelectedTruckId('');
    } else {
      alert(`Camion non trouvé.`);
    }
  };

  const enterTruckToQueue = async (truck: Truck) => {
    try {
      const now = new Date().toISOString();
      await db.updateItem('trucks', truck.id, { 
        status: 'ON_SITE', 
        updated_at: now 
      });
      
      const updatedTruck = { ...truck, status: 'ON_SITE' as const, updated_at: now };
      const newTrucksList = trucks.map(t => t.id === truck.id ? updatedTruck : t);
      
      setTrucks(newTrucksList);
      processLists(newTrucksList);
      setLastScannedTruck(updatedTruck);
      
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
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
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
    if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
    }
    setIsScannerOpen(false);
    
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

  const onScanFailure = (error: any) => {};

  const handleDispatch = (truck: Truck) => {
    navigate(`/logistics/dispatch?action=new&truckId=${truck.id}`);
  };

  const handleRemoveFromQueue = async (truckId: string) => {
     if(!confirm("Retirer ce camion de la file d'attente ? Il sera marqué comme DISPONIBLE.")) return;
     try {
        await db.updateItem('trucks', truckId, { status: 'AVAILABLE' });
        const updatedTrucks = trucks.map(t => t.id === truckId ? { ...t, status: 'AVAILABLE' as const } : t);
        setTrucks(updatedTrucks);
        processLists(updatedTrucks);
     } catch(e) {
        alert("Erreur lors de la mise à jour.");
     }
  };

  // Memoized options for searchable select
  const truckOptions: Option[] = useMemo(() => {
    return trucks
      .filter(t => t.status === 'AVAILABLE') // Only show trucks that can actually enter the queue
      .map(t => ({
        value: t.id,
        label: t.plate_number,
        subLabel: t.driver_name || 'Chauffeur non assigné',
        extraInfo: t.owner_type ? (
           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase border border-blue-100">
              <ShieldCheck size={10} /> Wague AB
           </span>
        ) : null
      }));
  }, [trucks]);

  return (
    <div className={`space-y-6 ${isDriver ? 'max-w-md mx-auto pb-20' : ''}`}>
      {!isDriver && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Flux (FIFO)</h1>
            <p className="text-muted-foreground text-sm">Scanner les arrivées et gérer les départs.</p>
          </div>
        </div>
      )}

      {isDriver && (
        <div className="bg-primary p-4 -mx-6 -mt-6 mb-6 rounded-b-3xl text-primary-foreground shadow-lg">
           <h2 className="text-xl font-bold">Validation Camion</h2>
           <p className="text-primary-foreground/70 text-xs">Portail Chauffeur - Validation QR Code</p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isDriver ? '' : 'lg:grid-cols-3'} gap-6`}>
        {/* Left: Input / Scanner */}
        <div className="space-y-6">
           <div className={`bg-card rounded-2xl border border-border shadow-soft-xl p-6 ${!isDriver ? 'sticky top-24' : ''}`}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <ScanBarcode size={20} className="text-primary" /> Entrée Camion
              </h3>
              
              {!isScannerOpen ? (
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Sélectionner Camion</label>
                       <AdvancedSelect 
                          options={truckOptions}
                          value={selectedTruckId}
                          onChange={setSelectedTruckId}
                          placeholder="Rechercher immatriculation..."
                          className="shadow-soft-sm"
                       />
                    </div>
                    
                    <button 
                       onClick={() => handleManualScan()}
                       disabled={!selectedTruckId}
                       className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all shadow-glow active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                       Valider Entrée
                    </button>

                    <div className="relative py-2">
                       <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                       <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-card px-3 text-muted-foreground">OU</span></div>
                    </div>

                    <button 
                       onClick={startScanner}
                       className="w-full border border-border hover:bg-muted text-foreground py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                       <Camera size={20} /> Scanner QR Code
                    </button>
                 </div>
              ) : (
                 <div className="space-y-4">
                    <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-primary/20 shadow-inner"></div>
                    <button 
                       onClick={stopScanner}
                       className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-xl font-bold transition-colors"
                    >
                       Annuler le scan
                    </button>
                 </div>
              )}
           </div>

           {/* Last Scanned Feedback */}
           {lastScannedTruck && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 shadow-soft-sm">
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-100 shrink-0 shadow-sm">
                       <TruckIcon size={24} />
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-start">
                          <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-widest mb-1">Succès</p>
                          <span className="text-[10px] font-mono text-emerald-600/80 flex items-center gap-1">
                             <Clock size={10} /> {new Date(lastScannedTruck.updated_at!).toLocaleTimeString()}
                          </span>
                       </div>
                       <p className="font-black text-xl text-emerald-900 dark:text-emerald-100 font-mono">{lastScannedTruck.plate_number}</p>
                       <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Positionné dans la file d'attente.</p>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Right: The Queue */}
        <div className={`${isDriver ? 'opacity-90' : 'lg:col-span-2'} bg-card rounded-2xl border border-border shadow-soft-xl flex flex-col h-[600px] overflow-hidden`}>
           {/* Header Area */}
           <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                 <Clock size={20} />
              </div>
              <div>
                 <h3 className="font-bold text-base text-foreground uppercase tracking-wider flex items-center gap-2">
                    File d'attente <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">{onSiteTrucks.length}</span>
                 </h3>
                 <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Ordre d'arrivée FIFO</p>
              </div>
              <button onClick={fetchData} className="ml-auto p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors" title="Actualiser">
                 <RefreshCw size={18} />
              </button>
           </div>

           {isDriver && (
              <div className="p-4 bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-3 border-b border-amber-100">
                 <ShieldAlert size={14} className="shrink-0" />
                 L'ACCÈS AUX ACTIONS EST RÉSERVÉ AUX COORDINATEURS DE SITE.
              </div>
           )}

           <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {onSiteTrucks.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <TruckIcon size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">File vide</p>
                 </div>
              ) : (
                 Object.entries(groupedOnSite).map(([dateLabel, groupTrucks]) => (
                    <div key={dateLabel} className="space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground sticky top-0 bg-card py-2 z-10">
                          <Calendar size={12} /> {dateLabel}
                       </div>
                       {(groupTrucks as Truck[]).map((truck, index) => (
                          <div 
                             key={truck.id} 
                             className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-soft-sm transition-all bg-card"
                          >
                             <div className="flex items-center gap-4 pl-1">
                                <div className={`text-lg font-black ${isDriver ? 'text-muted-foreground' : 'text-primary/20'}`}>
                                   {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className="p-2 bg-primary/5 text-primary rounded-lg shrink-0">
                                   <TruckIcon size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-base text-foreground font-mono">{truck.plate_number}</h4>
                                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border border-emerald-200">
                                         Sur Site
                                      </span>
                                      {truck.owner_type && (
                                         <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border border-blue-200">
                                            WAB
                                         </span>
                                      )}
                                   </div>
                                   <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                                      {truck.driver_name && (
                                         <span className="flex items-center gap-1"><User size={10} /> {truck.driver_name}</span>
                                      )}
                                      <span className="flex items-center gap-1 font-mono">
                                         <Clock size={10} /> {truck.updated_at ? new Date(truck.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                      </span>
                                   </div>
                                </div>
                             </div>

                             {!isDriver && (
                                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                   <button 
                                      onClick={() => handleRemoveFromQueue(truck.id)}
                                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                      title="Retirer"
                                   >
                                      <X size={18} />
                                   </button>
                                   <button 
                                      onClick={() => handleDispatch(truck)}
                                      className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold shadow-soft-sm transition-all text-xs"
                                   >
                                      Charger <ArrowRight size={14} />
                                   </button>
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
