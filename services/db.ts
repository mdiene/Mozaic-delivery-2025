
import { supabase } from '../lib/supabaseClient';
import { AllocationView, DeliveryView, Truck, Driver, Region, Department, Commune, Project, Operator, BonLivraisonView, FinDeCessionView, RegionPerformance, NetworkHierarchy, NetworkRegion, NetworkDeliveryNode } from '../types';

// Helper to stringify errors safely
const safeLog = (prefix: string, error: any) => {
  try {
    console.error(prefix, JSON.stringify(error, null, 2));
  } catch (e) {
    console.error(prefix, error);
  }
};

export const db = {
  getStats: async (projectId?: string) => {
    // 1. Get total target tonnage (Allocations)
    let allocQuery = supabase.from('allocations').select('id, target_tonnage');
    if (projectId && projectId !== 'all') {
      allocQuery = allocQuery.eq('project_id', projectId);
    }
    const { data: allocations, error: allocError } = await allocQuery;
    
    if (allocError) safeLog('Error fetching allocations:', allocError);
    const totalTarget = allocations?.reduce((sum, a) => sum + Number(a.target_tonnage), 0) || 0;

    // 2. Get deliveries for calc
    let delQuery = supabase
      .from('deliveries')
      .select(`
        tonnage_loaded,
        allocation_id,
        allocations!inner (
          project_id
        )
      `);
      
    if (projectId && projectId !== 'all') {
       delQuery = delQuery.eq('allocations.project_id', projectId);
    }

    const { data: deliveries, error: delError } = await delQuery;
    
    if (delError) safeLog('Error fetching deliveries:', delError);

    // Sum all deliveries (assuming all existing records are valid)
    const totalDelivered = deliveries
      ?.reduce((sum: number, d: any) => {
        const val = Number(d.tonnage_loaded) || 0;
        return sum + val;
      }, 0) || 0;

    // 3. Get Active Trucks (Global count, as trucks move between projects)
    // We only show this context if looking at global view or we accept it represents fleet status
    const { count: activeTrucksCount } = await supabase
      .from('trucks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'IN_TRANSIT');

    const activeTrucks = activeTrucksCount || 0;

    // 4. Calc Alerts (Over delivered)
    let alerts = 0;
    if (allocations && deliveries) {
      // Map deliveries by allocation_id for faster lookup
      const deliveryMap = new Map<string, number>();
      deliveries.forEach((d: any) => {
        const current = deliveryMap.get(d.allocation_id) || 0;
        deliveryMap.set(d.allocation_id, current + (Number(d.tonnage_loaded) || 0));
      });

      allocations.forEach((alloc: any) => {
        const deliveredForAlloc = deliveryMap.get(alloc.id) || 0;
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
          project_id,
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
        driver_name: del.drivers?.name || 'Unknown',
        project_id: alloc?.project_id
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

  getTruckStats: async (projectId?: string) => {
    let query = supabase
      .from('deliveries')
      .select(`
        tonnage_loaded,
        trucks ( plate_number ),
        allocations!inner ( project_id )
      `);
    
    if (projectId && projectId !== 'all') {
      query = query.eq('allocations.project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      safeLog('Error fetching truck stats:', error);
      return [];
    }

    const stats: Record<string, number> = {};
    data?.forEach((d: any) => {
      const plate = d.trucks?.plate_number || 'Inconnu';
      stats[plate] = (stats[plate] || 0) + (Number(d.tonnage_loaded) || 0);
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  },

  getRegionPerformance: async (projectId?: string): Promise<RegionPerformance[]> => {
    // 1. Fetch base data: Regions
    const { data: regions } = await supabase.from('regions').select('id, name');
    if (!regions) return [];

    // 2. Fetch Allocations (to get target and link to projects)
    let allocQuery = supabase.from('allocations').select('region_id, target_tonnage, project_id');
    if (projectId && projectId !== 'all') {
      allocQuery = allocQuery.eq('project_id', projectId);
    }
    const { data: allocations } = await allocQuery;

    // 3. Fetch Deliveries (to get realized tonnage and counts)
    let delQuery = supabase
      .from('deliveries')
      .select(`
        id,
        tonnage_loaded,
        allocations!inner (
          region_id,
          project_id
        )
      `);
      
    if (projectId && projectId !== 'all') {
      delQuery = delQuery.eq('allocations.project_id', projectId);
    }
    const { data: deliveries } = await delQuery;

    // 4. Aggregate
    const stats: Record<string, RegionPerformance> = {};
    
    // Initialize
    regions.forEach((r: any) => {
      stats[r.id] = {
        regionId: r.id,
        regionName: r.name,
        targetTonnage: 0,
        deliveredTonnage: 0,
        deliveryCount: 0,
        completionRate: 0
      };
    });

    // Aggregate Targets
    allocations?.forEach((a: any) => {
      if (stats[a.region_id]) {
        stats[a.region_id].targetTonnage += Number(a.target_tonnage);
      }
    });

    // Aggregate Deliveries
    deliveries?.forEach((d: any) => {
      const rid = d.allocations?.region_id;
      if (rid && stats[rid]) {
        stats[rid].deliveredTonnage += Number(d.tonnage_loaded) || 0;
        stats[rid].deliveryCount += 1;
      }
    });

    // Calculate Rates and Format
    return Object.values(stats)
      .filter(s => s.targetTonnage > 0 || s.deliveredTonnage > 0) // Only return active regions
      .map(s => ({
        ...s,
        completionRate: s.targetTonnage > 0 ? (s.deliveredTonnage / s.targetTonnage) * 100 : 0
      }));
  },

  getNetworkHierarchy: async (projectId?: string): Promise<NetworkHierarchy> => {
    // 1. Fetch Allocations (Source of Truth for Targets & Hierarchy)
    // We join all the way down to get names
    let allocQuery = supabase.from('allocations')
      .select(`
        id,
        target_tonnage,
        region:regions(id, name),
        department:departments(id, name),
        commune:communes(id, name),
        project_id
      `);

    if (projectId && projectId !== 'all') {
      allocQuery = allocQuery.eq('project_id', projectId);
    }
    const { data: allocations, error: allocError } = await allocQuery;
    if (allocError) {
      safeLog('Error fetching allocations for network:', allocError);
      return [];
    }

    // 2. Fetch Deliveries (Realized Data) with detailed truck/driver info
    let delQuery = supabase.from('deliveries')
      .select(`
        id,
        tonnage_loaded,
        bl_number,
        trucks(plate_number),
        drivers(name),
        allocation:allocations!inner(
          id,
          region_id,
          department_id,
          commune_id,
          project_id
        )
      `);
    
    if (projectId && projectId !== 'all') {
      delQuery = delQuery.eq('allocation.project_id', projectId);
    }
    const { data: deliveries, error: delError } = await delQuery;
    if (delError) {
      safeLog('Error fetching deliveries for network:', delError);
    }

    // 3. Construct Hierarchy Tree
    // Structure: RegionID -> { ...data, depts: { DeptID -> { ...data, communes: { CommuneID -> ... } } } }
    const tree: Record<string, {
      name: string,
      target: number,
      delivered: number,
      depts: Record<string, {
        name: string,
        target: number,
        delivered: number,
        communes: Record<string, {
          name: string,
          target: number,
          delivered: number,
          deliveries: NetworkDeliveryNode[]
        }>
      }>
    }> = {};

    // Populate Structure & Targets from Allocations
    allocations?.forEach((a: any) => {
      const rId = a.region?.id;
      const dId = a.department?.id;
      const cId = a.commune?.id;

      if (!rId || !dId || !cId) return; // Skip invalid

      // Init Region
      if (!tree[rId]) tree[rId] = { name: a.region.name, target: 0, delivered: 0, depts: {} };
      
      // Init Dept
      if (!tree[rId].depts[dId]) tree[rId].depts[dId] = { name: a.department.name, target: 0, delivered: 0, communes: {} };
      
      // Init Commune
      if (!tree[rId].depts[dId].communes[cId]) tree[rId].depts[dId].communes[cId] = { name: a.commune.name, target: 0, delivered: 0, deliveries: [] };

      const t = Number(a.target_tonnage) || 0;
      
      // Add Targets
      tree[rId].target += t;
      tree[rId].depts[dId].target += t;
      tree[rId].depts[dId].communes[cId].target += t;
    });

    // Populate Delivered from Deliveries
    deliveries?.forEach((d: any) => {
      const a = d.allocation;
      if (!a) return;

      const rId = a.region_id;
      const dId = a.department_id;
      const cId = a.commune_id;
      const val = Number(d.tonnage_loaded) || 0;

      // Only add if hierarchy exists (it should if allocation exists)
      if (tree[rId]) {
        tree[rId].delivered += val;
        if (tree[rId].depts[dId]) {
          tree[rId].depts[dId].delivered += val;
          if (tree[rId].depts[dId].communes[cId]) {
            tree[rId].depts[dId].communes[cId].delivered += val;
            
            // Push detailed delivery node
            tree[rId].depts[dId].communes[cId].deliveries.push({
              id: d.id,
              bl_number: d.bl_number,
              tonnage: val,
              truck_plate: d.trucks?.plate_number || 'Inconnu',
              driver_name: d.drivers?.name || 'Inconnu'
            });
          }
        }
      }
    });

    // 4. Flatten to Interface
    const hierarchy: NetworkHierarchy = Object.entries(tree).map(([rId, r]) => ({
      id: rId,
      name: r.name,
      target: r.target,
      delivered: r.delivered,
      completionRate: r.target > 0 ? (r.delivered / r.target) * 100 : 0,
      departments: Object.entries(r.depts).map(([dId, d]) => ({
        id: dId,
        name: d.name,
        target: d.target,
        delivered: d.delivered,
        communes: Object.entries(d.communes).map(([cId, c]) => ({
          id: cId,
          name: c.name,
          target: c.target,
          delivered: c.delivered,
          deliveries: c.deliveries
        }))
      }))
    }));

    return hierarchy;
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
