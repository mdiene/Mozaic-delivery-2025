
import { useState, useEffect, FormEvent } from 'react';
import { db } from '../services/db';
import { Truck as TruckType, Driver as DriverType } from '../types';
import { Truck, User, Plus, Trash2, Edit2, X, Save, Link as LinkIcon, Search, ChevronDown } from 'lucide-react';

export const Fleet = () => {
  const [activeTab, setActiveTab] = useState<'trucks' | 'drivers'>('trucks');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Search State for Truck (Searchable Select)
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
    setFormData({});
    setTruckSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setFormData({ ...item });
    if (activeTab === 'trucks') {
      setTruckSearch(item.plate_number);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ?')) return;
    try {
      await db.deleteItem(activeTab, id);
      fetchData();
    } catch (e) {
      alert("Impossible de supprimer. L'élément est peut-être utilisé.");
    }
  };

  // Special handler to open Add Truck modal pre-filled with this driver
  const handleAssignTruck = (driver: DriverType) => {
    // Switch to trucks mode so the modal renders the Truck form
    setActiveTab('trucks');
    setFormData({
      driver_id: driver.id,
      status: 'AVAILABLE',
      capacity_tonnes: 0
    });
    setTruckSearch('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Separate Driver Assignment from Truck Payload
      let driverIdToAssign = null;
      if (activeTab === 'trucks') {
        driverIdToAssign = payload.driver_id || null;
        // Clean up payload for trucks table
        delete payload.driver_id;
        delete payload.driver_name;
      }

      // Handle Driver specific fields
      if (activeTab === 'drivers') {
        // Map form 'phone' to DB 'phone_normalized'
        payload.phone_normalized = payload.phone;
        delete payload.phone;
        // Strip truck specific info joined for display
        delete payload.truck_plate;
        delete payload.trucks;
      }
      
      // Ensure numeric types
      if (activeTab === 'trucks' && payload.capacity_tonnes) {
        payload.capacity_tonnes = Number(payload.capacity_tonnes);
      }

      // Remove ID for creation
      if (!payload.id) delete payload.id;
      
      let savedId = formData.id;

      if (formData.id) {
        await db.updateItem(activeTab, formData.id, payload);
      } else {
        const result = await db.createItem(activeTab, payload);
        if (result && result.length > 0) {
          savedId = result[0].id;
        }
      }

      // Handle Driver Assignment via foreign key on Drivers table
      if (activeTab === 'trucks' && savedId) {
        await db.updateTruckDriverAssignment(savedId, driverIdToAssign);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving:", JSON.stringify(error));
      alert(`Échec de l'enregistrement: ${JSON.stringify(error)}`);
    }
  };

  // Handler when a truck is selected from search
  const handleTruckSelect = (truck: TruckType) => {
    setFormData({
      ...formData,
      ...truck,
      // Ensure we keep the correct structure
      id: truck.id
    });
    setTruckSearch(truck.plate_number);
    setIsTruckDropdownOpen(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement du Parc...</div>;

  // Split drivers for grouping
  const assignedDrivers = drivers.filter(d => d.truck_plate);
  const unassignedDrivers = drivers.filter(d => !d.truck_plate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion du Parc Automobile</h1>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Ajouter {activeTab === 'trucks' ? 'Camion' : 'Chauffeur'}
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('trucks')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'trucks' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Camions
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'drivers' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Chauffeurs
          </button>
        </div>

        {/* Content */}
        <div className="w-full overflow-x-auto">
          {activeTab === 'trucks' ? (
            <table className="table table-striped">
              <thead className="bg-primary/5 border-b-2 border-primary/20">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Immatriculation</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Capacité</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Chauffeur Assigné</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun camion trouvé.</td></tr>}
                {trucks.map(truck => (
                  <tr key={truck.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                          <Truck size={18} />
                        </div>
                        <div>
                          <p className="font-mono font-medium text-foreground">{truck.plate_number}</p>
                          {truck.trailer_number && <p className="text-xs text-muted-foreground">Remorque: {truck.trailer_number}</p>}
                          {truck.owner_type && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">Wague AB</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{truck.capacity_tonnes} Tonnes</td>
                    <td className="px-4 py-3">
                      {truck.driver_name ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{truck.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Non assigné</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                       <span className={`badge badge-soft text-xs 
                        ${truck.status === 'AVAILABLE' ? 'badge-success' : ''}
                        ${truck.status === 'IN_TRANSIT' ? 'badge-warning' : ''}
                        ${truck.status === 'MAINTENANCE' ? 'badge-error' : ''}
                       `}>
                        {truck.status === 'AVAILABLE' ? 'DISPONIBLE' : truck.status === 'IN_TRANSIT' ? 'EN TRANSIT' : 'MAINTENANCE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(truck)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(truck.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table table-striped">
              <thead className="bg-primary/5 border-b-2 border-primary/20">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Permis</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-primary uppercase tracking-wider">Camion Assigné</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-primary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun chauffeur trouvé.</td></tr>}
                
                {/* ASSIGNED DRIVERS GROUP */}
                {assignedDrivers.length > 0 && (
                  <>
                    <tr className="bg-muted/30">
                       <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider border-y border-border">Assignés</td>
                    </tr>
                    {assignedDrivers.map(driver => (
                      <tr key={driver.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full text-muted-foreground">
                              <User size={18} />
                            </div>
                            <span className="font-medium text-foreground">{driver.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{driver.phone}</td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{driver.license_number}</td>
                        <td className="px-4 py-3">
                          <span className={`badge badge-soft text-xs 
                            ${driver.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}
                          `}>
                            {driver.status === 'ACTIVE' ? 'ACTIF' : 'INACTIF'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-muted-foreground" />
                            <span className="font-mono font-medium text-foreground">{driver.truck_plate}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEdit(driver)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(driver.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* UNASSIGNED DRIVERS GROUP */}
                {unassignedDrivers.length > 0 && (
                  <>
                    <tr className="bg-muted/30">
                       <td colSpan={6} className="px-6 py-2 text-xs font-bold uppercase text-muted-foreground tracking-wider border-y border-border">Non Assignés</td>
                    </tr>
                    {unassignedDrivers.map(driver => (
                      <tr key={driver.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full text-muted-foreground">
                              <User size={18} />
                            </div>
                            <span className="font-medium text-foreground">{driver.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{driver.phone}</td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{driver.license_number}</td>
                        <td className="px-4 py-3">
                          <span className={`badge badge-soft text-xs 
                            ${driver.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}
                          `}>
                            {driver.status === 'ACTIVE' ? 'ACTIF' : 'INACTIF'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs text-muted-foreground italic">Aucun</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Assign Truck Action */}
                          <button 
                            onClick={() => handleAssignTruck(driver)}
                            className="btn btn-circle btn-text btn-sm text-emerald-600"
                            title="Assigner un Camion"
                          >
                            <LinkIcon size={16} />
                          </button>
                          <button onClick={() => handleEdit(driver)} className="btn btn-circle btn-text btn-sm text-blue-600"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(driver.id)} className="btn btn-circle btn-text btn-sm btn-text-error"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-foreground capitalize">
                {formData.id ? 'Modifier' : 'Ajouter'} {activeTab === 'trucks' ? 'Camion' : 'Chauffeur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'trucks' ? (
                <>
                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-1">Immatriculation</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      <input 
                        required 
                        className="w-full pl-9 pr-8 border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase placeholder:normal-case focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Rechercher ou saisir ex: DK-2025-AA"
                        value={truckSearch}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setTruckSearch(val);
                          // If user types, we clear the ID to imply "New Entry" unless they select from list
                          if (formData.id) setFormData({ ...formData, plate_number: val, id: undefined });
                          else setFormData({ ...formData, plate_number: val });
                          setIsTruckDropdownOpen(true);
                        }}
                        onFocus={() => setIsTruckDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsTruckDropdownOpen(false), 200)} // Delay to allow click
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                    {isTruckDropdownOpen && truckSearch && (
                      <ul className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {trucks
                          .filter(t => t.plate_number.includes(truckSearch))
                          .map(t => (
                            <li 
                              key={t.id}
                              className="px-4 py-2 hover:bg-muted text-sm cursor-pointer text-popover-foreground flex justify-between items-center"
                              onClick={() => handleTruckSelect(t)}
                            >
                              <span>{t.plate_number}</span>
                              {t.trailer_number && <span className="text-xs text-muted-foreground">{t.trailer_number}</span>}
                            </li>
                          ))
                        }
                        {trucks.filter(t => t.plate_number.includes(truckSearch)).length === 0 && (
                          <li 
                            className="px-4 py-2 text-sm text-primary cursor-pointer hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              // Confirm creation logic (handled by onChange)
                              setIsTruckDropdownOpen(false);
                            }}
                          >
                            <Plus size={14} /> Créer nouveau : {truckSearch}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro Remorque (Optionnel)</label>
                    <input 
                      className={`w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={formData.trailer_number || ''}
                      onChange={e => setFormData({...formData, trailer_number: e.target.value.toUpperCase()})}
                      disabled={!!formData.id} // Disable if existing truck is selected
                    />
                    {formData.id && <p className="text-xs text-muted-foreground mt-1">Modifiez d'abord l'immatriculation pour un nouveau camion.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Capacité (Tonnes)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.capacity_tonnes || ''}
                      onChange={e => setFormData({...formData, capacity_tonnes: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Statut</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.status || 'AVAILABLE'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="AVAILABLE">Disponible</option>
                      <option value="IN_TRANSIT">En Transit</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Chauffeur Assigné</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.driver_id || ''}
                      onChange={e => setFormData({...formData, driver_id: e.target.value})}
                    >
                      <option value="">Sélectionner un chauffeur...</option>
                      {drivers
                        .filter(d => !d.truck_id || (formData.id && d.truck_id === formData.id) || d.id === formData.driver_id)
                        .map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.license_number})</option>
                      ))}
                    </select>
                  </div>

                  {/* Ownership Switch */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border mt-2">
                     <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground" htmlFor="ownerSwitch">
                           Propriété
                        </label>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-muted-foreground">Externe</span>
                           <input 
                              type="checkbox" 
                              className="switch switch-primary" 
                              id="ownerSwitch"
                              checked={formData.owner_type || false}
                              onChange={(e) => setFormData({...formData, owner_type: e.target.checked})}
                           />
                           <span className="text-xs font-bold text-primary">Interne</span>
                        </div>
                     </div>
                     
                     <div className="mt-2 min-h-[1.5rem]">
                        {formData.owner_type && (
                           <div className="flex items-center justify-center p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-100 animate-in fade-in">
                              <span className="text-xs font-bold uppercase tracking-wider">Wague agro business</span>
                           </div>
                        )}
                     </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom Complet</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro de Téléphone</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Numéro de Permis</label>
                    <input 
                      required 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground uppercase"
                      value={formData.license_number || ''}
                      onChange={e => setFormData({...formData, license_number: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Statut</label>
                    <select 
                      className="w-full border border-input rounded-lg p-2 text-sm bg-background text-foreground"
                      value={formData.status || 'ACTIVE'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="ACTIVE">Actif</option>
                      <option value="INACTIVE">Inactif</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                  <Save size={16} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
