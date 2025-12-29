import { useState, useEffect, FormEvent, useRef } from 'react';
import { db } from '../services/db';
import { Truck as TruckType, Driver as DriverType } from '../types';
import { Truck, User, Plus, Trash2, Edit2, X, Save, Link as LinkIcon, Search, ChevronDown, QrCode, Printer, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';

export const Fleet = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trucks' | 'drivers'>('trucks');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);

  const isVisitor = user?.role === 'VISITOR';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQRTruck, setSelectedQRTruck] = useState<TruckType | null>(null);
  const [generatedQRValue, setGeneratedQRValue] = useState<string>('');
  const [qrSuccessMessage, setQrSuccessMessage] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [truckSearch, setTruckSearch] = useState('');
  const [isTruckDropdownOpen, setIsTruckDropdownOpen] = useState(false);

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
    setFormData({});
    setTruckSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    if (isVisitor) return;
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
    setActiveTab('trucks');
    setFormData({ driver_id: driver.id, status: 'AVAILABLE', capacity_tonnes: 0 });
    setTruckSearch('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isVisitor) return;
    try {
      const payload = { ...formData };
      let driverIdToAssign = null;
      if (activeTab === 'trucks') {
        driverIdToAssign = payload.driver_id || null;
        delete payload.driver_id;
        delete payload.driver_name;
        delete payload.qrcode_content;
      }
      if (activeTab === 'drivers') {
        payload.phone_normalized = payload.phone;
        delete payload.phone;
        delete payload.truck_plate;
        delete payload.trucks;
      }
      if (activeTab === 'trucks' && payload.capacity_tonnes) {
        payload.capacity_tonnes = Number(payload.capacity_tonnes);
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
                <tr><th>Immatriculation</th><th>Capacité</th><th>Chauffeur Assigné</th><th>Statut</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {trucks.map(truck => (
                  <tr key={truck.id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="p-2 bg-muted rounded-lg"><Truck size={18} /></div><div><p className="font-mono font-medium">{truck.plate_number}</p></div></div></td>
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
                      <button onClick={() => handleAssignTruck(driver)} disabled={isVisitor} className="btn btn-circle btn-text btn-sm text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"><LinkIcon size={16} /></button>
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
              <h3 className="font-semibold text-foreground">{formData.id ? 'Modifier' : 'Ajouter'} {activeTab === 'trucks' ? 'Camion' : 'Chauffeur'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'trucks' ? (
                <>
                  <label className="block text-sm font-medium">Immatriculation</label>
                  <input required className="w-full border border-input rounded-lg p-2 text-sm uppercase bg-background" value={truckSearch} onChange={(e) => { setTruckSearch(e.target.value.toUpperCase()); setFormData({ ...formData, plate_number: e.target.value.toUpperCase() }); }} />
                  <label className="block text-sm font-medium">Capacité (T)</label>
                  <input type="number" required className="w-full border border-input rounded-lg p-2 text-sm bg-background" value={formData.capacity_tonnes || ''} onChange={e => setFormData({...formData, capacity_tonnes: e.target.value})} />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium">Nom Complet</label>
                  <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <label className="block text-sm font-medium">Téléphone</label>
                  <input required className="w-full border border-input rounded-lg p-2 text-sm bg-background" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm flex items-center gap-2"><Save size={16} /> Enregistrer</button>
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