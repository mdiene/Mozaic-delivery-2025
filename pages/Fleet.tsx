import { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { Truck as TruckType, Driver as DriverType } from '../types';
import { Truck, User, Plus, Trash2, Edit2, X, Save, Link as LinkIcon, Search, ChevronDown, QrCode, Printer, CheckCircle2, Link2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedSelect, Option } from '../components/AdvancedSelect';

export const Fleet = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trucks' | 'drivers'>('trucks');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);

  const isVisitor = user?.role === 'VISITOR';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'form' | 'assign'>('form');
  const [formData, setFormData] = useState<any>({});
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQRTruck, setSelectedQRTruck] = useState<TruckType | null>(null);
  const [generatedQRValue, setGeneratedQRValue] = useState<string>('');
  const [qrSuccessMessage, setQrSuccessMessage] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [truckSearch, setTruckSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([db.getTrucks(), db.getDrivers()]);
      setTrucks(t);
      setDrivers(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    if (isVisitor) return;
    setModalType('form');
    setFormData({});
    setTruckSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    if (isVisitor) return;
    setModalType('form');
    setFormData({ ...item });
    if (activeTab === 'trucks') {
      setTruckSearch(item.plate_number);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isVisitor) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ?')) return;
    try {
      await db.deleteItem(activeTab, id);
      fetchData();
    } catch (e) {
      alert("Impossible de supprimer. L'élément est peut-être utilisé.");
    }
  };

  const handleAssignTruck = (driver: DriverType) => {
    if (isVisitor) return;
    setModalType('assign');
    setFormData({ ...driver }); // We store the driver data
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    
    try {
      if (modalType === 'assign') {
        // Assignment logic: Update the driver table with the truck_id
        const driverId = formData.id;
        const truckId = formData.truck_id; // Selected from AdvancedSelect
        
        if (!truckId) {
          // If no truck selected, we might be unassigning
          await db.updateItem('drivers', driverId, { truck_id: null });
        } else {
          // Check if this truck is assigned elsewhere and unassign it first (1:1 constraint)
          await db.updateTruckDriverAssignment(truckId, driverId);
        }
      } else {
        const payload = { ...formData };
        let driverIdToAssign = null;
        
        if (activeTab === 'trucks') {
          driverIdToAssign = payload.driver_id || null;
          delete payload.driver_id;
          delete payload.driver_name;
          delete payload.qrcode_content;
          if (payload.capacity_tonnes) {
            payload.capacity_tonnes = Number(payload.capacity_tonnes);
          }
        }
        
        if (activeTab === 'drivers') {
          payload.phone_normalized = payload.phone;
          delete payload.phone;
          delete payload.truck_plate;
          delete payload.trucks;
        }

        if (!payload.id) delete payload.id;
        let savedId = formData.id;
        
        if (formData.id) {
          await db.updateItem(activeTab, formData.id, payload);
        } else {
          const result = await db.createItem(activeTab, payload);
          if (result && result.length > 0) savedId = result[0].id;
        }

        if (activeTab === 'trucks' && savedId) {
          await db.updateTruckDriverAssignment(savedId, driverIdToAssign);
        }
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(`Échec de l'enregistrement: ${JSON.stringify(error)}`);
    }
  };

  const handleOpenQRModal = (truck: TruckType) => {
    setSelectedQRTruck(truck);
    setGeneratedQRValue(truck.qrcode_content || '');
    setQrSuccessMessage('');
    setIsQRModalOpen(true);
  };

  const handleGenerateQR = () => {
    if (isVisitor || !selectedQRTruck) return;
    const content = JSON.stringify({ id: selectedQRTruck.id, plate: selectedQRTruck.plate_number, trailer: selectedQRTruck.trailer_number || '' });
    setGeneratedQRValue(content);
    setQrSuccessMessage('');
  };

  const handleSaveQR = async () => {
    if (isVisitor || !selectedQRTruck || !generatedQRValue) return;
    try {
      await db.updateItem('trucks', selectedQRTruck.id, { qrcode_content: generatedQRValue });
      const updatedTrucks = trucks.map(t => t.id === selectedQRTruck.id ? { ...t, qrcode_content: generatedQRValue } : t);
      setTrucks(updatedTrucks);
      setQrSuccessMessage('QR Code enregistré avec succès !');
    } catch (e) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handlePrintQR = () => {
    if (!selectedQRTruck || !generatedQRValue) return;
    const driver = drivers.find(d => d.id === selectedQRTruck.driver_id);
    const printWindow = window.open('', '_blank', 'width=400,height=550');
    if (printWindow) {
      const canvas = qrRef.current?.querySelector('canvas');
      const dataUrl = canvas ? canvas.toDataURL() : '';
      printWindow.document.write(`<html><head><title>QR - ${selectedQRTruck.plate_number}</title><style>body { font-family: sans-serif; text-align: center; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } .driver-name { font-size: 22px; font-weight: bold; } img { border: 4px solid #000; padding: 10px; margin: 20px 0; } .plate { font-size: 28px; font-weight: 900; border: 2px solid #000; padding: 5px 15px; }</style></head><body><div class="driver-name">${driver ? driver.name : 'Non Assigné'}</div>${dataUrl ? `<img src="${dataUrl}" width="250" height="250" />` : '<p>Erreur QR</p>'}<div class="plate">${selectedQRTruck.plate_number}</div><script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body></html>`);
      printWindow.document.close();
    }
  };

  // Filter trucks that are not assigned to any driver
  const availableTruckOptions: Option[] = useMemo(() => {
    // Get all truck IDs currently assigned to drivers
    const assignedTruckIds = new Set(drivers.map(d => d.truck_id).filter(Boolean));
    
    return trucks
      .filter(t => !assignedTruckIds.has(t.id) || t.id === formData.truck_id)
      .map(t => ({
        value: t.id,
        label: t.plate_number,
        subLabel: `Capacité: ${t.capacity_tonnes}T ${t.trailer_number ? `| Remorque: ${t.trailer_number}` : ''}`
      }));
  }, [trucks, drivers, formData.truck_id, isModalOpen]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement du Parc...</div>;

  const assignedDrivers = drivers.filter(d => d.truck_plate);
  const unassignedDrivers = drivers.filter(d => !d.truck_plate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion du Parc Automobile</h1>
        <button 
          onClick={openModal}
          disabled={isVisitor}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Ajouter {activeTab === 'trucks' ? 'Camion' : 'Chauffeur'}
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab('trucks')} className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'trucks' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Camions</button>
          <button onClick={() => setActiveTab('drivers')} className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'drivers' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Chauffeurs</button>
        </div>

        <div className="w-full overflow-x-auto">
          {activeTab === 'trucks' ? (
            <table className="table table-striped">
              <thead className="bg-primary/5 border-b-2 border-primary/20">
                <tr><th>Immatriculation</th><th>N° Châssis</th><th>Capacité</th><th>Chauffeur Assigné</th><th>Statut</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {trucks.map(truck => (
                  <tr key={truck.id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="p-2 bg-muted rounded-lg"><Truck size={18} /></div><div><p className="font-mono font-medium">{truck.plate_number}</p></div></div></td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{truck.chassis_camion || '-'}</td>
                    <td className="px-4 py-3 text-sm">{truck.capacity_tonnes} T</td>
                    <td className="px-4 py-3">{truck.driver_name || <span className="text-xs italic">Non assigné</span>}</td>
                    <td className="px-4 py-3"><span className={`badge badge-soft text-xs ${truck.status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>{truck.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenQRModal(truck)} className="btn btn-circle btn-text btn-sm" title="QR Code"><QrCode size={16} /></button>
                        <button onClick={() => handleEdit(truck)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(truck.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm btn-text-error disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table table-striped">
              <thead className="bg-primary/5 border-b-2 border-primary/20">
                <tr><th>Nom</th><th>Téléphone</th><th>Permis</th><th>Statut</th><th>Camion Assigné</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {[...assignedDrivers, ...unassignedDrivers].map(driver => (
                  <tr key={driver.id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="p-2 bg-muted rounded-full"><User size={18} /></div><span>{driver.name}</span></div></td>
                    <td className="px-4 py-3 text-sm">{driver.phone}</td>
                    <td className="px-4 py-3 text-sm font-mono">{driver.license_number}</td>
                    <td className="px-4 py-3"><span className="badge badge-soft text-xs">{driver.status}</span></td>
                    <td className="px-4 py-3 text-sm">{driver.truck_plate || 'Aucun'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleAssignTruck(driver)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Assigner un Camion"><Link2 size={16} /></button>
                      <button onClick={() => handleEdit(driver)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(driver.id)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm btn-text-error disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground">
                {modalType === 'assign' ? 'Assignation Camion' : (formData.id ? 'Modifier' : 'Ajouter')} {modalType === 'assign' ? '' : (activeTab === 'trucks' ? 'Camion' : 'Chauffeur')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalType === 'assign' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                    <User size={20} className="text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Chauffeur</p>
                      <p className="text-sm font-bold text-foreground">{formData.name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sélectionner un Camion Disponible</label>
                    <AdvancedSelect 
                      options={availableTruckOptions}
                      value={formData.truck_id || ''}
                      onChange={(val) => setFormData({ ...formData, truck_id: val })}
                      placeholder="Rechercher par immatriculation..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Seuls les camions non encore assignés à un chauffeur actif sont affichés.
                    </p>
                  </div>
                </div>
              ) : activeTab === 'trucks' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Immatriculation</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm uppercase bg-background" 
                      value={truckSearch} 
                      onChange={(e) => { 
                        setTruckSearch(e.target.value.toUpperCase()); 
                        setFormData({ ...formData, plate_number: e.target.value.toUpperCase() }); 
                      }} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Capacité (T)</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background" 
                        value={formData.capacity_tonnes || ''} 
                        onChange={e => setFormData({...formData, capacity_tonnes: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Statut</label>
                      <select 
                        className="w-full border border-input rounded-lg p-2 text-sm bg-background" 
                        value={formData.status || 'AVAILABLE'} 
                        onChange={e => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="AVAILABLE">Disponible</option>
                        <option value="IN_TRANSIT">En Transit</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="ON_SITE">Sur Site</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">N° Châssis</label>
                    <input 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background font-mono" 
                      value={formData.chassis_camion || ''} 
                      onChange={e => setFormData({...formData, chassis_camion: e.target.value})} 
                      placeholder="Ex: 1HGCM82633A..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">N° Remorque</label>
                    <input 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background font-mono uppercase" 
                      value={formData.trailer_number || ''} 
                      onChange={e => setFormData({...formData, trailer_number: e.target.value.toUpperCase()})} 
                      placeholder="Ex: R-1234-A"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <input 
                      type="checkbox" 
                      id="owner_type"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.owner_type !== false}
                      onChange={e => setFormData({...formData, owner_type: e.target.checked})}
                    />
                    <label htmlFor="owner_type" className="text-sm font-bold text-foreground cursor-pointer">
                       Camion Interne (Masae)
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium">Nom Complet</label>
                  <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <label className="block text-sm font-medium">Téléphone</label>
                  <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  <label className="block text-sm font-medium">N° Permis</label>
                  <input required className="w-full border border-input rounded-xl p-2.5 text-sm bg-background font-mono" value={formData.license_number || ''} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                </>
              )}
              <div className="pt-4 flex justify-end gap-2 border-t border-border mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-soft-xl flex items-center gap-2 active:scale-95 transition-all">
                  <Save size={18} /> {modalType === 'assign' ? 'Confirmer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQRModalOpen && selectedQRTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold">Gestion QR Code</h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
               <h4 className="text-xl font-bold font-mono">{selectedQRTruck.plate_number}</h4>
               <div className="p-4 bg-white rounded-lg border" ref={qrRef}>{generatedQRValue ? <QRCodeCanvas value={generatedQRValue} size={200} level="H" /> : <div className="w-[200px] h-[200px] flex items-center justify-center text-xs">Aucun QR Code</div>}</div>
               <div className="w-full space-y-2">
                  {!generatedQRValue && <button onClick={handleGenerateQR} disabled={isVisitor} className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">Générer QR</button>}
                  {generatedQRValue && <><button onClick={handleSaveQR} disabled={isVisitor} className="w-full bg-emerald-600 text-white py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">Enregistrer</button><button onClick={handlePrintQR} className="w-full bg-card border py-2 rounded-lg">Imprimer</button></>}
                  <button onClick={() => setIsQRModalOpen(false)} className="w-full bg-muted py-2 rounded-lg">Fermer</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};