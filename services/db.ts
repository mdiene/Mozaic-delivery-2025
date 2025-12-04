import { supabase } from '../lib/supabaseClient';
import { AllocationView, DeliveryView, Truck, Driver, Region, Department, Commune, Project, Operator } from '../types';

export const db = {
  getStats: async () => {
    // 1. Get total target tonnage (Allocations)
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select('id, target_tonnage');
    
    if (allocError) console.error('Error fetching allocations:', JSON.stringify(allocError));
    const totalTarget = allocations?.reduce((sum, a) => sum + Number(a.target_tonnage), 0) || 0;

    // 2. Get deliveries for calc
    // Fix: Use 'validation_status' instead of 'status'
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('tonnage_delivered, validation_status, allocation_id');
    
    if (delError) console.error('Error fetching deliveries:', JSON.stringify(delError));

    const totalDelivered = deliveries
      ?.filter((d: any) => d.validation_status === 'VALIDATED')
      .reduce((sum: number, d: any) => sum + (Number(d.tonnage_delivered) || 0), 0) || 0;

    const activeTrucks = deliveries
      ?.filter((d: any) => ['IN_TRANSIT', 'DRAFT'].includes(d.validation_status)).length || 0;

    // 3. Calc Alerts (Over delivered)
    let alerts = 0;
    if (allocations && deliveries) {
      allocations.forEach((alloc: any) => {
        const deliveredForAlloc = deliveries
          .filter((d: any) => d.allocation_id === alloc.id && d.validation_status === 'VALIDATED')
          .reduce((sum: number, d: any) => sum + (Number(d.tonnage_delivered) || 0), 0);
        
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
        regions:region_id(name),
        departments:department_id(name),
        communes:commune_id(name),
        operators:operator_id(name)
      `);

    if (error) {
      console.error('Error fetching allocations view:', JSON.stringify(error));
      return [];
    }

    // Get delivered sums for progress calculation
    // Fix: Use 'validation_status'
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('allocation_id, tonnage_delivered, validation_status');

    return data.map((alloc: any) => {
      const delivered = deliveries
        ?.filter((d: any) => d.allocation_id === alloc.id && d.validation_status === 'VALIDATED')
        .reduce((sum: number, d: any) => sum + (Number(d.tonnage_delivered) || 0), 0) || 0;

      return {
        ...alloc,
        region_name: alloc.regions?.name || 'Unknown',
        department_name: alloc.departments?.name || 'Unknown',
        commune_name: alloc.communes?.name || 'Unknown',
        operator_name: alloc.operators?.name || 'Unknown',
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
          operators:operator_id(name),
          regions:region_id(name)
        )
      `);

    if (error) {
      console.error('Error fetching deliveries view:', JSON.stringify(error));
      return [];
    }

    return data.map((del: any) => {
      const alloc = del.allocations; // The joined object
      return {
        ...del,
        status: del.validation_status, // Map DB column 'validation_status' to UI prop 'status'
        operator_name: alloc?.operators?.name || 'Unknown',
        region_name: alloc?.regions?.name || 'Unknown',
        truck_plate: del.trucks?.plate_number || 'Unknown',
        driver_name: del.drivers?.name || 'Unknown'
      };
    });
  },

  getChartData: async () => {
    // Fetch regions
    const { data: regions } = await supabase.from('regions').select('id, name');
    if (!regions) return [];

    const { data: allocations } = await supabase.from('allocations').select('region_id, target_tonnage');
    
    // Fetch validated deliveries joined with allocation to get region
    // Fix: Use 'validation_status' in filter
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select(`
        tonnage_delivered,
        allocations!inner (
          region_id
        )
      `)
      .eq('validation_status', 'VALIDATED');

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
        chartData[rid].delivered += Number(d.tonnage_delivered);
      }
    });

    return Object.values(chartData);
  },

  // Fleet
  getTrucks: async (): Promise<Truck[]> => {
    const { data, error } = await supabase.from('trucks').select('*');
    if (error) return [];
    return data as Truck[];
  },

  getDrivers: async (): Promise<Driver[]> => {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) return [];
    return data as Driver[];
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
    const { data, error } = await supabase.from('project').select('*').order('numero_phase', { ascending: false });
    if (error) {
      console.error('Error fetching projects:', JSON.stringify(error));
      return [];
    }
    return (data as any[]) || [];
  },

  getUsedProjectIds: async (): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from('allocations')
      .select('project_id');
    
    if (error) {
       console.error('Error checking project usage:', error);
       return new Set();
    }
    
    // Filter out nulls and create set of IDs
    const ids = new Set((data || []).map((a: any) => a.project_id).filter(Boolean));
    return ids;
  },

  getOperators: async (): Promise<Operator[]> => {
    const { data, error } = await supabase
      .from('operators')
      .select('*, communes(name)')
      .order('name');
      
    if (error) {
      console.error('Error fetching operators:', error);
      return [];
    }

    return (data || []).map((op: any) => ({
      ...op,
      commune_name: op.communes?.name || 'Unknown',
      is_coop: op.operateur_coop_gie, // Map DB column to frontend prop
      phone: op.contact_info?.phone // Extract phone from jsonb
    })) as Operator[];
  },

  // Generic CRUD
  createItem: async (table: string, payload: any) => {
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) throw error;
    return data;
  },

  updateItem: async (table: string, id: string, payload: any) => {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
    if (error) throw error;
    return data;
  },

  deleteItem: async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};