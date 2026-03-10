
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../services/db';
import { DeliveryView, NetworkHierarchy } from '../types';
import RegionalGraph from '../components/RegionalGraph';
import { 
  Truck, 
  Calendar, 
  MapPin, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  ChevronRight,
  Download,
  Share2,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PublicView = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project') || 'all';
  
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [networkData, setNetworkData] = useState<NetworkHierarchy>([]);
  const [error, setError] = useState<string | null>(null);

  // Decode ID if it's base64 (for owner names with special characters)
  const decodedId = useMemo(() => {
    try {
      return atob(id || '');
    } catch {
      return id || '';
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (type === 'transport') {
          const allDeliveries = await db.getDeliveriesView(false); // Get all, even if not "visible" if we have the link? 
          // Actually, the user said "current deliveries", usually we respect visibility but maybe for public links we want to show what's requested.
          // Let's stick to visible for now unless specified.
          const filtered = allDeliveries.filter(d => 
            d.truck_owner === decodedId && 
            (projectId === 'all' || d.project_id === projectId)
          );
          setDeliveries(filtered);
        } else if (type === 'network') {
          const data = await db.getNetworkHierarchy(projectId);
          setNetworkData(data);
        } else {
          setError("Type de vue non reconnu.");
        }
      } catch (err) {
        console.error(err);
        setError("Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type, decodedId, projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground animate-pulse">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-8 text-center shadow-xl">
          <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Accès Impossible</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary w-full"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              {type === 'transport' ? <Truck size={24} /> : <MapPin size={24} />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {type === 'transport' ? `Bilan Transport - ${decodedId}` : 'Carte du Réseau'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {type === 'transport' ? 'Rapport de livraisons en temps réel' : 'Visualisation globale de la distribution'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {type === 'transport' ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <Package size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Livré</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {deliveries.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0).toLocaleString()}
                  </span>
                  <span className="text-slate-500 text-sm font-medium">Tonnes</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Voyages</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {deliveries.length}
                  </span>
                  <span className="text-slate-500 text-sm font-medium">Livraisons</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <Truck size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Camions Actifs</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {new Set(deliveries.map(d => d.truck_plate)).size}
                  </span>
                  <span className="text-slate-500 text-sm font-medium">Unités</span>
                </div>
              </motion.div>
            </div>

            {/* Deliveries List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={20} className="text-primary" />
                  Historique des Livraisons
                </h2>
                <div className="text-xs text-slate-500">
                  {deliveries.length} enregistrements trouvés
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">BL #</th>
                      <th className="px-6 py-4">Camion</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4 text-right">Tonnage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deliveries.length > 0 ? (
                      deliveries.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()).map((del, idx) => (
                        <motion.tr 
                          key={del.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {new Date(del.delivery_date).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(del.delivery_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                              {del.bl_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{del.truck_plate}</span>
                              <span className="text-[10px] text-slate-400">{del.driver_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600 dark:text-slate-300">{del.commune_name}</span>
                              <span className="text-[10px] text-slate-400">{del.region_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-primary">
                              {Number(del.tonnage_loaded).toLocaleString()} t
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <Package size={48} />
                            <p>Aucune livraison enregistrée pour cette période.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-16rem)] flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Visualisation du Réseau
                </h2>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="text-slate-500">Livré</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                      <span className="text-slate-500">Prévu</span>
                   </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                {networkData.length > 0 ? (
                  <RegionalGraph regions={networkData} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <p>Aucune donnée de réseau disponible.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200 dark:border-slate-800 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <p>© {new Date().getFullYear()} - Système de Gestion Logistique. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">Support</a>
            <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-primary transition-colors">Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
