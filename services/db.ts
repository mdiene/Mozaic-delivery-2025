import { supabase } from '../lib/supabaseClient';
import { AllocationView, DeliveryView, Truck, Driver, Region, Department, Commune, Project, Operator } from '../types';

export const db = {
  getStats: async () => {
    // 1. Get total target tonnage (Allocations)
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select('id, target_tonnage');
    
    if (allocError) console.error('Error fetching allocations:', allocError);
    const totalTarget = allocations?.reduce((sum, a) => sum + Number(a.target_tonnage), 0) || 0;

    // 2. Get deliveries for calc
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('tonnage_delivered, status, allocation_id');
    
    if (delError) console.error('Error fetching deliveries:', delError);

    const totalDelivered = deliveries
      ?.filter((d: any) => d.status === 'VALIDATED')
      .reduce((sum: number, d: any) => sum + (Number(d.tonnage_delivered) || 0), 0) || 0;

    const activeTrucks = deliveries
      ?.filter((d: any) => ['IN_TRANSIT', 'DRAFT'].includes(d.status)).length || 0;

    // 3. Calc Alerts (Over delivered)
    let alerts = 0;
    if (allocations && deliveries) {
      allocations.forEach((alloc: any) => {
        const deliveredForAlloc = deliveries
          .filter((d: any) => d.allocation_id === alloc.id && d.status === 'VALIDATED')
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
      console.error(error);
      return [];
    }

    // Get delivered sums for progress calculation
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('allocation_id, tonnage_delivered, status');

    return data.map((alloc: any) => {
      const delivered = deliveries
        ?.filter((d: any) => d.allocation_id === alloc.id && d.status === 'VALIDATED')
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
      console.error(error);
      return [];
    }

    return data.map((del: any) => {
      const alloc = del.allocations; // The joined object
      return {
        ...del,
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
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select(`
        tonnage_delivered,
        allocations!inner (
          region_id
        )
      `)
      .eq('status', 'VALIDATED');

    const chartData: Record<string, { name: string; planned: number; delivered: number }> = {};
    
    regions.forEach((r: any) => {
      chartData[r.id] = { name: r.name, planned: 0, delivered: 0 };
    });

    // Sum planned
    allocations?.forEach((a: any) => {
      if (chartData[a.region_id]) {
        chartData[a.region_id].planned += Number(a.target_tonnage);
      }
    });

    // Sum delivered
    deliveries?.forEach((d: any) => {
      const rid = d.allocations.region_id;
      if (chartData[rid]) {
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
    const { data } = await supabase.from('project').select('*').order('created_at', { ascending: false });
    // Map DB fields to TS interface if needed, assuming direct match for now
    return (data as any[]) || [];
  },

  getOperators: async (): Promise<Operator[]> => {
    const { data } = await supabase.from('operators').select('*').order('name');
    return (data as Operator[]) || [];
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