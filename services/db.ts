

import { supabase } from '../lib/supabaseClient';
import { AllocationView, DeliveryView, Truck, Driver, Region, Department, Commune, Project, Operator, BonLivraisonView, FinDeCessionView } from '../types';

// Helper to stringify errors safely
const safeLog = (prefix: string, error: any) => {
  try {
    console.error(prefix, JSON.stringify(error, null, 2));
  } catch (e) {
    console.error(prefix, error);
  }
};

export const db = {
  getStats: async () => {
    // 1. Get total target tonnage (Allocations)
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select('id, target_tonnage');
    
    if (allocError) safeLog('Error fetching allocations:', allocError);
    const totalTarget = allocations?.reduce((sum, a) => sum + Number(a.target_tonnage), 0) || 0;

    // 2. Get deliveries for calc
    // Removed validation_status selection as column was dropped
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('tonnage_loaded, allocation_id');
    
    if (delError) safeLog('Error fetching deliveries:', delError);

    // Sum all deliveries (assuming all existing records are valid)
    const totalDelivered = deliveries
      ?.reduce((sum: number, d: any) => {
        const val = Number(d.tonnage_loaded) || 0;
        return sum + val;
      }, 0) || 0;

    // Cannot determine active trucks without status, defaulting to 0 or logic removal
    const activeTrucks = 0;

    // 3. Calc Alerts (Over delivered)
    let alerts = 0;
    if (allocations && deliveries) {
      allocations.forEach((alloc: any) => {
        const deliveredForAlloc = deliveries
          .filter((d: any) => d.allocation_id === alloc.id)
          .reduce((sum: number, d: any) => sum + (Number(d.tonnage_loaded) || 0), 0);
        
        if (deliveredForAlloc > Number(alloc.target_tonnage)) alerts++;
      });
    }

    return { totalDelivered, totalTarget, activeTrucks, alerts };
  },

  getAllocationsView: async (): Promise<AllocationView[]> => {
    const { data, error } = await supabase
      .from('allocations')
      .select(`
        *,
        regions(name),
        departments(name),
        communes(name),
        operators(name),
        project:project_id(numero_phase, numero_marche)
      `);

    if (error) {
      safeLog('Error fetching allocations view:', error);
      return [];
    }

    // Get delivered sums for progress calculation
    // Removed validation_status
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('allocation_id, tonnage_loaded');

    return data.map((alloc: any) => {
      const delivered = deliveries
        ?.filter((d: any) => d.allocation_id === alloc.id)
        .reduce((sum: number, d: any) => sum + (Number(d.tonnage_loaded) || 0), 0) || 0;

      const proj = alloc.project;
      const phaseStr = proj 
        ? `Phase ${proj.numero_phase}${proj.numero_marche ? ` - ${proj.numero_marche}` : ''}`
        : 'Phase Non Assignée';

      return {
        ...alloc,
        region_name: alloc.regions?.name || 'Unknown',
        department_name: alloc.departments?.name || 'Unknown',
        commune_name: alloc.communes?.name || 'Unknown',
        operator_name: alloc.operators?.name || 'Unknown',
        project_phase: phaseStr,
        delivered_tonnage: delivered,
        progress: alloc.target_tonnage > 0 ? (delivered / alloc.target_tonnage) * 100 : 0
      };
    });
  },

  getDeliveriesView: async (): Promise<DeliveryView[]> => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        trucks:truck_id(plate_number),
        drivers:driver_id(name),
        allocations:allocation_id (
          operator_id,
          region_id,
          operators(name),
          regions(name),
          communes(name),
          project:project_id(numero_phase, numero_marche)
        )
      `);

    if (error) {
      safeLog('Error fetching deliveries view:', error);
      return [];
    }

    return data.map((del: any) => {
      const alloc = del.allocations; // The joined object
      const proj = alloc?.project;
      
      const phaseStr = proj 
        ? `Phase ${proj.numero_phase}${proj.numero_marche ? ` - ${proj.numero_marche}` : ''}`
        : 'Phase Non Assignée';

      return {
        ...del,
        // status removed
        operator_name: alloc?.operators?.name || 'Unknown',
        region_name: alloc?.regions?.name || 'Unknown',
        commune_name: alloc?.communes?.name || 'Unknown',
        project_phase: phaseStr,
        truck_plate: del.trucks?.plate_number || 'Unknown',
        driver_name: del.drivers?.name || 'Unknown'
      };
    });
  },

  getChartData: async (projectId?: string) => {
    // Fetch regions
    const { data: regions } = await supabase.from('regions').select('id, name');
    if (!regions) return [];

    // Fetch allocations (Target)
    let allocQuery = supabase.from('allocations').select('region_id, target_tonnage');
    if (projectId && projectId !== 'all') {
      allocQuery = allocQuery.eq('project_id', projectId);
    }
    const { data: allocations } = await allocQuery;
    
    // Fetch deliveries joined with allocation to get region
    // Removed validation_status check
    let delQuery = supabase
      .from('deliveries')
      .select(`
        tonnage_loaded,
        allocations!inner (
          region_id,
          project_id
        )
      `);
    
    if (projectId && projectId !== 'all') {
       // Filter on the joined table
       delQuery = delQuery.eq('allocations.project_id', projectId);
    }

    const { data: deliveries } = await delQuery;

    const chartData: Record<string, { name: string; planned: number; delivered: number }> = {};
    
    regions.forEach((r: any) => {
      chartData[r.id] = { name: r.name, planned: 0, delivered: 0 };
    });

    // Sum planned
    allocations?.forEach((a: any) => {
      if (a.region_id && chartData[a.region_id]) {
        chartData[a.region_id].planned += Number(a.target_tonnage);
      }
    });

    // Sum delivered
    deliveries?.forEach((d: any) => {
      const rid = d.allocations?.region_id;
      if (rid && chartData[rid]) {
        const val = Number(d.tonnage_loaded) || 0;
        chartData[rid].delivered += val;
      }
    });

    return Object.values(chartData);
  },

  // Fleet
  getTrucks: async (): Promise<Truck[]> => {
    // 1. Fetch Trucks
    const { data: trucks, error: truckError } = await supabase
      .from('trucks')
      .select('*')
      .order('plate_number');

    if (truckError) {
      safeLog('Error fetching trucks:', truckError);
      return [];
    }

    // 2. Fetch Drivers with assignments
    // We cannot join from trucks -> drivers because FK is on drivers table (truck_id)
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, truck_id')
      .not('truck_id', 'is', null);

    if (driverError) {
       safeLog('Error fetching drivers for trucks:', driverError);
    }

    // 3. Map
    // Create a map of truck_id -> driver
    const truckDriverMap = new Map();
    drivers?.forEach((d: any) => {
      truckDriverMap.set(d.truck_id, d);
    });

    return trucks.map((t: any) => {
      const driver = truckDriverMap.get(t.id);
      return {
        ...t,
        driver_id: driver?.id, // For UI selection state
        driver_name: driver?.name // For UI display
      };
    }) as Truck[];
  },

  updateTruckDriverAssignment: async (truckId: string, newDriverId: string | null) => {
    // 1. Unassign any driver currently assigned to this truck to avoid unique constraint issues if 1:1 or just cleanliness
    const { error: clearError } = await supabase
      .from('drivers')
      .update({ truck_id: null })
      .eq('truck_id', truckId);
    
    if (clearError) throw clearError;

    // 2. If newDriverId is present, assign it to the truck
    if (newDriverId) {
       const { error: assignError } = await supabase
         .from('drivers')
         .update({ truck_id: truckId })
         .eq('id', newDriverId);
       
       if (assignError) throw assignError;
    }
  },

  getDrivers: async (): Promise<Driver[]> => {
    // Fetch drivers and join with trucks to get plate number
    const { data, error } = await supabase
      .from('drivers')
      .select('*, trucks:truck_id(plate_number)')
      .order('name');
      
    if (error) {
      safeLog('Error fetching drivers:', error);
      return [];
    }
    
    // Map phone_normalized to phone for UI consistency
    return data.map((d: any) => ({
      ...d,
      phone: d.phone_normalized,
      truck_plate: d.trucks?.plate_number
    })) as Driver[];
  },

  // Settings / Geographic
  getRegions: async (): Promise<Region[]> => {
    const { data } = await supabase.from('regions').select('*').order('name');
    return (data as Region[]) || [];
  },
  
  getDepartments: async (): Promise<Department[]> => {
    const { data } = await supabase.from('departments').select('*').order('name');
    return (data as Department[]) || [];
  },

  getCommunes: async (): Promise<Commune[]> => {
    const { data } = await supabase.from('communes').select('*').order('name');
    return (data as Commune[]) || [];
  },

  getProjects: async (): Promise<Project[]> => {
    // Sort by phase descending since created_at is missing in schema
    const { data: projects, error } = await supabase.from('project').select('*').order('numero_phase', { ascending: false });
    if (error) {
      safeLog('Error fetching projects:', error);
      return [];
    }

    // Calculate total delivered per project
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select(`
        tonnage_loaded,
        allocations!inner (
          project_id
        )
      `);
    
    if (delError) {
       safeLog('Error fetching project delivery stats:', delError);
    }

    const statsMap = new Map<string, number>();
    if (deliveries) {
      deliveries.forEach((d: any) => {
        const pId = d.allocations?.project_id;
        if (pId) {
          const current = statsMap.get(pId) || 0;
          statsMap.set(pId, current + (Number(d.tonnage_loaded) || 0));
        }
      });
    }

    return (projects as any[]).map(p => ({
      ...p,
      total_delivered: statsMap.get(p.id) || 0
    }));
  },

  getUsedProjectIds: async (): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from('allocations')
      .select('project_id');
    
    if (error) {
       safeLog('Error checking project usage:', error);
       return new Set<string>();
    }
    
    // Filter out nulls and create set of IDs
    const ids = new Set<string>((data || []).map((a: any) => a.project_id).filter(Boolean));
    return ids;
  },

  getOperators: async (): Promise<Operator[]> => {
    // Perform Client-Side join to avoid schema cache issues with FKs
    // 1. Fetch raw operators
    const { data: operators, error: opError } = await supabase
      .from('operators')
      .select('*')
      .order('name');
      
    if (opError) {
      safeLog('Error fetching operators:', opError);
      return [];
    }

    // 2. Fetch raw communes to map names
    const { data: communes } = await supabase
      .from('communes')
      .select('id, name');

    // 3. Fetch raw projects to map names
    const { data: projects } = await supabase
      .from('project')
      .select('id, numero_marche, numero_phase');

    // Create Maps for O(1) lookup
    const communeMap = new Map((communes || []).map((c: any) => [c.id, c.name]));
    const projectMap = new Map((projects || []).map((p: any) => [
      p.id, 
      `Phase ${p.numero_phase}${p.numero_marche ? ` - ${p.numero_marche}` : ''}`
    ]));

    // 4. Map data
    return (operators || []).map((op: any) => ({
      ...op,
      commune_name: communeMap.get(op.commune_id) || 'Unknown',
      project_name: op.projet_id ? (projectMap.get(op.projet_id) || 'Unknown Project') : '-',
      is_coop: op.operateur_coop_gie, // Map DB column to frontend prop
      phone: op.contact_info // Direct map since column is varchar column
    })) as Operator[];
  },

  // Views
  getBonLivraisonViews: async (): Promise<BonLivraisonView[]> => {
    const { data, error } = await supabase
      .from('view_bon_livraison')
      .select('*');
    
    if (error) {
      safeLog('Error fetching view_bon_livraison:', error);
      return [];
    }
    return data as BonLivraisonView[];
  },

  getFinDeCessionViews: async (): Promise<FinDeCessionView[]> => {
    const { data, error } = await supabase
      .from('view_fin_de_cession')
      .select('*');
    
    if (error) {
      safeLog('Error fetching view_fin_de_cession:', error);
      return [];
    }
    return data as FinDeCessionView[];
  },

  // Generic CRUD
  createItem: async (table: string, payload: any) => {
    const { data, error } = await supabase.from(table).insert(payload).select('*');
    if (error) throw error;
    return data;
  },

  updateItem: async (table: string, id: string, payload: any) => {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*');
    if (error) throw error;
    return data;
  },

  deleteItem: async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};