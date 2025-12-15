
import { supabase } from '../lib/supabaseClient';
import { 
  DeliveryView, AllocationView, Truck, Driver, Region, Department, Commune, 
  Operator, Project, NetworkHierarchy, GlobalHierarchy, BonLivraisonView, FinDeCessionView, EnrichedPayment, UserPreference 
} from '../types';

const safeLog = (message: string, ...args: any[]) => {
  console.log(message, ...args);
};

export const db = {
  getDeliveriesView: async (): Promise<DeliveryView[]> => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        trucks:truck_id(plate_number, owner_type),
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
      const alloc = del.allocations; 
      const proj = alloc?.project;
      
      const phaseStr = proj 
        ? `Phase ${proj.numero_phase}${proj.numero_marche ? ` - ${proj.numero_marche}` : ''}`
        : 'Phase Non Assignée';

      return {
        ...del,
        operator_name: alloc?.operators?.name || 'Unknown',
        operator_id: alloc?.operator_id,
        region_name: alloc?.regions?.name || 'Unknown',
        commune_name: alloc?.communes?.name || 'Unknown',
        project_phase: phaseStr,
        truck_plate: del.trucks?.plate_number || 'Unknown',
        truck_owner_type: del.trucks?.owner_type,
        driver_name: del.drivers?.name || 'Unknown',
        project_id: alloc?.project_id
      };
    });
  },

  getAllocationsView: async (): Promise<AllocationView[]> => {
    // Note: 'allocations_view' in supabase logic usually aggregates delivered_tonnage
    // Here we simulate it or fetch if view exists. Assuming table 'allocations' plus manual aggregation if needed or View.
    // For simplicity, let's assume we fetch allocations and compute delivered from deliveries or it's a view.
    // If using real backend, usually `create view allocations_view as ...`
    // We will simulate the join logic here if we can't ensure the view exists.
    
    // Fetch raw allocations
    const { data: allocs, error: allocError } = await supabase.from('allocations').select(`
      *,
      project:project_id(numero_phase, numero_marche),
      regions:region_id(name),
      departments:department_id(name),
      communes:commune_id(name),
      operators:operator_id(name)
    `);

    if (allocError) return [];

    // Fetch deliveries to aggregate
    const { data: dels } = await supabase.from('deliveries').select('allocation_id, tonnage_loaded');
    
    const deliveryMap: Record<string, number> = {};
    if (dels) {
       dels.forEach((d: any) => {
          deliveryMap[d.allocation_id] = (deliveryMap[d.allocation_id] || 0) + Number(d.tonnage_loaded);
       });
    }

    return allocs.map((a: any) => {
       const delivered = deliveryMap[a.id] || 0;
       const target = a.target_tonnage || 1; // avoid div by 0
       const progress = (delivered / target) * 100;
       const proj = a.project;
       const phaseStr = proj ? `Phase ${proj.numero_phase}` : 'N/A';

       return {
         ...a,
         delivered_tonnage: delivered,
         operator_name: a.operators?.name || '?',
         region_name: a.regions?.name || '?',
         department_name: a.departments?.name || '?',
         commune_name: a.communes?.name || '?',
         project_phase: phaseStr,
         progress: progress
       };
    });
  },

  getStats: async (projectId: string) => {
     const dels = await db.getDeliveriesView();
     const filteredDels = projectId === 'all' ? dels : dels.filter(d => d.project_id === projectId);
     
     const totalDelivered = filteredDels.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0);
     
     const { data: allocs } = await supabase.from('allocations').select('target_tonnage, project_id');
     let totalTarget = 0;
     if (allocs) {
        totalTarget = allocs
           .filter((a: any) => projectId === 'all' || a.project_id === projectId)
           .reduce((sum: number, a: any) => sum + Number(a.target_tonnage), 0);
     }
     
     // Active trucks: Now counting AVAILABLE trucks as requested
     const { count: truckCount } = await supabase
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'AVAILABLE');
     
     // Calculate Fees
     // We join deliveries -> allocations to filter by project_id
     let feesQuery = supabase.from('payments').select(`
        road_fees, 
        personal_fees, 
        other_fees, 
        overweigh_fees, 
        fuel_cost, 
        loading_cost, 
        unloading_cost,
        deliveries!inner (
            allocation_id,
            allocations!inner (
                project_id
            )
        )
     `);

     if (projectId !== 'all') {
        feesQuery = feesQuery.eq('deliveries.allocations.project_id', projectId);
     }

     const { data: paymentsData } = await feesQuery;
     let totalFees = 0;
     
     if (paymentsData) {
        totalFees = paymentsData.reduce((sum: number, p: any) => {
           return sum + 
              (Number(p.road_fees) || 0) + 
              (Number(p.personal_fees) || 0) + 
              (Number(p.other_fees) || 0) + 
              (Number(p.overweigh_fees) || 0) + 
              (Number(p.fuel_cost) || 0) + 
              (Number(p.loading_cost) || 0) + 
              (Number(p.unloading_cost) || 0);
        }, 0);
     }

     return {
        totalDelivered,
        totalTarget,
        activeTrucks: truckCount || 0,
        totalFees: totalFees
     };
  },

  getChartData: async (projectId: string) => {
     // Return regions completion
     const allocsView = await db.getAllocationsView();
     const filtered = projectId === 'all' ? allocsView : allocsView.filter(a => a.project_id === projectId);
     
     // Group by Region
     const groups: Record<string, { planned: number, delivered: number }> = {};
     filtered.forEach(a => {
        if (!groups[a.region_name]) groups[a.region_name] = { planned: 0, delivered: 0 };
        groups[a.region_name].planned += a.target_tonnage;
        groups[a.region_name].delivered += a.delivered_tonnage;
     });
     
     return Object.entries(groups).map(([name, val]) => ({
        name,
        planned: val.planned,
        delivered: val.delivered
     }));
  },

  getRegions: async (): Promise<Region[]> => {
    const { data } = await supabase.from('regions').select('*');
    return data || [];
  },

  getDepartments: async (): Promise<Department[]> => {
    const { data } = await supabase.from('departments').select('*');
    return data || [];
  },

  getCommunes: async (): Promise<Commune[]> => {
    const { data } = await supabase.from('communes').select('*');
    return data || [];
  },

  getOperators: async (): Promise<Operator[]> => {
    // Join with allocations -> project to deduce project name if needed, or if project_id is on operator
    // Schema suggests operator might be linked to project, or just allocations are.
    // Based on types.ts, operator has optional project_id.
    const { data } = await supabase.from('operators').select(`
       *,
       project:projet_id(numero_phase)
    `);
    
    return (data || []).map((op: any) => ({
       ...op,
       project_id: op.projet_id,
       project_name: op.project ? `Phase ${op.project.numero_phase}` : '-',
       // Map DB columns to Frontend Types
       is_coop: op.operateur_coop_gie,
       phone: op.contact_info
    }));
  },

  getTrucks: async (): Promise<Truck[]> => {
    // Fetch trucks
    const { data: trucks, error } = await supabase.from('trucks').select('*');
    
    if (error) {
      safeLog('Error fetching trucks:', error);
      return [];
    }

    // Fetch drivers who have a truck assigned to map them to trucks
    const { data: drivers } = await supabase.from('drivers').select('id, name, truck_id').not('truck_id', 'is', null);
    
    const truckDriverMap: Record<string, {id: string, name: string}> = {};
    drivers?.forEach((d: any) => {
        if (d.truck_id) truckDriverMap[d.truck_id] = { id: d.id, name: d.name };
    });

    return trucks.map((t: any) => ({
       ...t,
       driver_id: truckDriverMap[t.id]?.id,
       driver_name: truckDriverMap[t.id]?.name
    }));
  },

  getDrivers: async (): Promise<Driver[]> => {
     // Fetch drivers and join their assigned truck info
     const { data, error } = await supabase.from('drivers').select('*, trucks:truck_id(plate_number)');
     
     if (error) {
       safeLog('Error fetching drivers:', error);
       return [];
     }

     return data.map((d: any) => ({
        ...d,
        truck_plate: d.trucks?.plate_number
     }));
  },

  getProjects: async (): Promise<Project[]> => {
    // We also need total_delivered for the table in Settings
    const { data: projects } = await supabase.from('project').select('*');
    if (!projects) return [];
    
    const deliveries = await db.getDeliveriesView();
    
    return projects.map((p: any) => {
       const delivered = deliveries
          .filter(d => d.project_id === p.id)
          .reduce((sum, d) => sum + Number(d.tonnage_loaded), 0);
       return { ...p, total_delivered: delivered };
    });
  },

  getUsedProjectIds: async (): Promise<Set<string>> => {
     const { data } = await supabase.from('allocations').select('project_id');
     const set = new Set<string>();
     data?.forEach((r: any) => set.add(r.project_id));
     return set;
  },

  getPayments: async (): Promise<EnrichedPayment[]> => {
     const { data } = await supabase.from('payments').select(`
        *,
        deliveries:delivery_id (
           bl_number,
           delivery_date,
           trucks:truck_id (plate_number, owner_type),
           drivers:driver_id (name),
           allocations:allocation_id (
              region_id, 
              commune_id, 
              project_id,
              regions(name),
              communes(name)
           )
        )
     `);
     
     if (!data) return [];
     
     return data.map((p: any) => {
        const del = p.deliveries;
        const alloc = del?.allocations;
        return {
           ...p,
           bl_number: del?.bl_number,
           delivery_date: del?.delivery_date,
           truck_plate: del?.trucks?.plate_number,
           truck_owner_type: del?.trucks?.owner_type,
           driver_name: del?.drivers?.name,
           region_name: alloc?.regions?.name,
           commune_name: alloc?.communes?.name,
           project_id: alloc?.project_id
        };
     });
  },

  createItem: async (table: string, payload: any) => {
    const { data, error } = await supabase.from(table).insert([payload]).select();
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
  },

  updateTruckDriverAssignment: async (truckId: string, driverId: string | null) => {
    // 1. Unassign this truck from any driver currently having it (to enforce 1-1 active assignment)
    await supabase.from('drivers').update({ truck_id: null }).eq('truck_id', truckId);
    
    // 2. Assign to new driver if provided
    if (driverId) {
       await supabase.from('drivers').update({ truck_id: truckId }).eq('id', driverId);
    }
  },

  getNetworkHierarchy: async (projectId: string): Promise<NetworkHierarchy> => {
    const allocs = await db.getAllocationsView();
    const filtered = projectId === 'all' ? allocs : allocs.filter(a => a.project_id === projectId);
    const deliveries = await db.getDeliveriesView();
    const filteredDeliveries = projectId === 'all' ? deliveries : deliveries.filter(d => d.project_id === projectId);

    const regionsMap: Record<string, any> = {};

    filtered.forEach(a => {
       if (!regionsMap[a.region_id]) {
          regionsMap[a.region_id] = {
             id: a.region_id,
             name: a.region_name,
             target: 0,
             delivered: 0,
             departments: {}
          };
       }
       const r = regionsMap[a.region_id];
       r.target += a.target_tonnage;
       r.delivered += a.delivered_tonnage;

       if (!r.departments[a.department_id]) {
          r.departments[a.department_id] = {
             id: a.department_id,
             name: a.department_name,
             target: 0,
             delivered: 0,
             communes: {}
          };
       }
       const d = r.departments[a.department_id];
       d.target += a.target_tonnage;
       d.delivered += a.delivered_tonnage;

       if (!d.communes[a.commune_id]) {
          d.communes[a.commune_id] = {
             id: a.commune_id,
             name: a.commune_name,
             delivered: 0,
             deliveries: []
          };
       }
       const c = d.communes[a.commune_id];
       c.delivered += a.delivered_tonnage;
    });

    // Attach active deliveries
    filteredDeliveries.forEach(del => {
       Object.values(regionsMap).forEach((r: any) => {
          if (r.name === del.region_name) {
             Object.values(r.departments).forEach((d: any) => {
                Object.values(d.communes).forEach((c: any) => {
                   if (c.name === del.commune_name) {
                      c.deliveries.push({
                         id: del.id,
                         bl_number: del.bl_number,
                         tonnage: del.tonnage_loaded,
                         truck_plate: del.truck_plate,
                         driver_name: del.driver_name
                      });
                   }
                });
             });
          }
       });
    });

    return Object.values(regionsMap).map((r: any) => ({
       ...r,
       completionRate: r.target > 0 ? (r.delivered / r.target) * 100 : 0,
       departments: Object.values(r.departments).map((d: any) => ({
          ...d,
          communes: Object.values(d.communes)
       }))
    }));
  },

  getGlobalHierarchy: async (projectId: string): Promise<GlobalHierarchy> => {
     // Similar to NetworkHierarchy but with Operators and Allocations
     const allocs = await db.getAllocationsView();
     const filteredAllocs = projectId === 'all' ? allocs : allocs.filter(a => a.project_id === projectId);
     const deliveries = await db.getDeliveriesView();
     
     // Build tree: Region -> Dept -> Commune -> Operator -> Allocation -> Delivery
     const tree: Record<string, any> = {};

     filteredAllocs.forEach(a => {
        if (!tree[a.region_id]) tree[a.region_id] = { id: a.region_id, name: a.region_name, departments: {} };
        const r = tree[a.region_id];

        if (!r.departments[a.department_id]) r.departments[a.department_id] = { id: a.department_id, name: a.department_name, communes: {} };
        const d = r.departments[a.department_id];

        if (!d.communes[a.commune_id]) d.communes[a.commune_id] = { id: a.commune_id, name: a.commune_name, operators: {} };
        const c = d.communes[a.commune_id];

        if (!c.operators[a.operator_id]) c.operators[a.operator_id] = { id: a.operator_id, name: a.operator_name, is_coop: false, allocations: {} }; // We'd need to fetch is_coop properly
        const o = c.operators[a.operator_id];

        if (!o.allocations[a.id]) {
           o.allocations[a.id] = {
              id: a.id,
              allocation_key: a.allocation_key,
              target: a.target_tonnage,
              delivered: a.delivered_tonnage,
              deliveries: []
           };
        }
     });

     // Populate Deliveries
     const allocMap: Record<string, any> = {};
     Object.values(tree).forEach((r: any) => 
        Object.values(r.departments).forEach((d: any) => 
           Object.values(d.communes).forEach((c: any) => 
              Object.values(c.operators).forEach((o: any) => 
                 Object.values(o.allocations).forEach((a: any) => {
                    allocMap[a.id] = a;
                 })
              )
           )
        )
     );

     deliveries.forEach(del => {
        if (allocMap[del.allocation_id]) {
           allocMap[del.allocation_id].deliveries.push({
              id: del.id,
              bl_number: del.bl_number,
              date: del.delivery_date,
              truck_plate: del.truck_plate,
              driver_name: del.driver_name,
              tonnage: del.tonnage_loaded
           });
        }
     });

     // Convert to arrays
     return Object.values(tree).map((r: any) => ({
        ...r,
        departments: Object.values(r.departments).map((d: any) => ({
           ...d,
           communes: Object.values(d.communes).map((c: any) => ({
              ...c,
              operators: Object.values(c.operators).map((o: any) => ({
                 ...o,
                 allocations: Object.values(o.allocations)
              }))
           }))
        }))
     }));
  },

  getBonLivraisonViews: async (): Promise<BonLivraisonView[]> => {
    const dels = await db.getDeliveriesView();
    // Need more details like project bon number, operator contact info, etc.
    const { data: projects } = await supabase.from('project').select('*');
    const projectMap: Record<string, any> = {};
    projects?.forEach((p: any) => projectMap[p.id] = p);

    const { data: operators } = await supabase.from('operators').select('*');
    const opMap: Record<string, any> = {};
    operators?.forEach((o: any) => opMap[o.id] = o);
    
    // Also fetch trucks for trailer number
    const { data: trucks } = await supabase.from('trucks').select('*');
    const truckMap: Record<string, any> = {};
    trucks?.forEach((t: any) => truckMap[t.id] = t);

    return dels.map(d => {
       const proj = d.project_id ? projectMap[d.project_id] : null;
       const op = d.operator_id ? opMap[d.operator_id] : null;
       
       return {
          ...d,
          region: d.region_name,
          department: 'Unknown', // DeliveryView only has region/commune? Update DeliveryView to have Dept.
          commune: d.commune_name,
          project_num_bon: proj?.numero_bon_disposition || 'N/A',
          numero_phase: proj?.numero_phase || 0,
          operator_contact_info: op?.contact_info || '', // Correctly fetched from DB
          operator_coop_name: op?.coop_name,
          truck_plate_number: d.truck_plate,
          truck_trailer_number: d.truck_id ? truckMap[d.truck_id]?.trailer_number : ''
       } as BonLivraisonView;
    });
  },

  getFinDeCessionViews: async (): Promise<FinDeCessionView[]> => {
     const allocs = await db.getAllocationsView();
     // Group by operator and project phase
     // This view is usually per operator per phase
     
     const map: Record<string, FinDeCessionView> = {};
     
     allocs.forEach(a => {
        const key = `${a.operator_id}-${a.project_phase}`;
        if (!map[key]) {
           map[key] = {
              operator_id: a.operator_id,
              operator_name: a.operator_name,
              region: a.region_name,
              department: a.department_name,
              commune: a.commune_name,
              project_phase: Number(a.project_phase.replace('Phase ', '')),
              deliveries_count: 0,
              total_tonnage: 0
           };
        }
        // Allocations view aggregates tonnage already? 
        // Ideally we sum from deliveries. 
        // For 'Fin de cession' we usually sum up actual delivered tonnage.
        map[key].total_tonnage += a.delivered_tonnage;
     });

     // Returning aggregated map
     return Object.values(map);
  },

  getUserPreferences: async (email: string): Promise<UserPreference | null> => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is 'Row not found'
       safeLog('Error fetching preferences:', error);
    }
    return data;
  },

  saveUserPreferences: async (email: string, prefs: Partial<UserPreference>) => {
    // Upsert needs all primary key columns.
    const payload = { ...prefs, user_email: email, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_email' });
    
    if (error) safeLog('Error saving preferences:', error);
  }
};
