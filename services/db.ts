
import { supabase } from '../lib/supabaseClient';
import { 
  DeliveryView, AllocationView, Truck, Driver, Region, Department, Commune, 
  Operator, Project, NetworkHierarchy, GlobalHierarchy, BonLivraisonView, FinDeCessionView, EnrichedPayment, UserPreference, ProductionView,
  AdminCategoryDepense, AdminModePaiement, AdminCodeAnalytique, AdminPoste, AdminPersonnel, AdminDepense
} from '../types';

const safeLog = (message: string, ...args: any[]) => {
  console.log(message, ...args);
};

export const db = {
  getDeliveriesView: async (onlyVisible: boolean = true): Promise<DeliveryView[]> => {
    let query = supabase
      .from('deliveries')
      .select(`
        *,
        trucks:truck_id(plate_number, owner_type),
        drivers:driver_id(name),
        allocations:allocation_id!inner (
          operator_id,
          region_id,
          department_id,
          project_id,
          operators(name),
          regions(name),
          departments(name),
          communes(name),
          project:project_id!inner(numero_phase, numero_marche, project_visibility)
        )
      `);

    if (onlyVisible) {
      query = query.eq('allocations.project.project_visibility', true);
    }

    const { data, error } = await query;

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
        declaration_code: del.declaration_code,
        operator_name: alloc?.operators?.name || 'Unknown',
        operator_id: alloc?.operator_id,
        region_name: alloc?.regions?.name || 'Unknown',
        department_name: alloc?.departments?.name || 'Unknown',
        commune_name: alloc?.communes?.name || 'Unknown',
        project_phase: phaseStr,
        truck_plate: del.trucks?.plate_number || 'Unknown',
        truck_owner_type: del.trucks?.owner_type,
        driver_name: del.drivers?.name || 'Unknown',
        project_id: alloc?.project_id
      };
    });
  },

  getAllocationsView: async (onlyVisible: boolean = true): Promise<AllocationView[]> => {
    let query = supabase.from('allocations').select(`
      *,
      project:project_id!inner(numero_phase, numero_marche, project_visibility, tonnage_total),
      regions:region_id(name),
      departments:department_id(name),
      communes:commune_id(name),
      operators:operator_id(name, coop_name, operateur_coop_gie, contact_info)
    `);

    if (onlyVisible) {
      query = query.eq('project.project_visibility', true);
    }

    const { data: allocs, error: allocError } = await query;

    if (allocError) return [];

    const { data: dels } = await supabase.from('deliveries').select('allocation_id, tonnage_loaded');
    
    const deliveryMap: Record<string, number> = {};
    if (dels) {
       dels.forEach((d: any) => {
          deliveryMap[d.allocation_id] = (deliveryMap[d.allocation_id] || 0) + Number(d.tonnage_loaded);
       });
    }

    return allocs.map((a: any) => {
       const delivered = deliveryMap[a.id] || 0;
       const target = a.target_tonnage || 1; 
       const progress = (delivered / target) * 100;
       const proj = a.project;
       const phaseStr = proj ? `Phase ${proj.numero_phase}` : 'N/A';

       return {
         ...a,
         delivered_tonnage: delivered,
         operator_name: a.operators?.name || '?',
         coop_name: a.operators?.coop_name,
         is_coop: a.operators?.operateur_coop_gie,
         operator_phone: a.operators?.contact_info,
         region_name: a.regions?.name || '?',
         department_name: a.departments?.name || '?',
         commune_name: a.communes?.name || '?',
         project_phase: phaseStr,
         progress: progress,
         project_total_tonnage: proj?.tonnage_total
       };
    });
  },

  getStats: async (projectId: string) => {
     // Statistics should always respect project visibility
     const dels = await db.getDeliveriesView(true);
     const filteredDels = projectId === 'all' ? dels : dels.filter(d => d.project_id === projectId);
     
     const totalDelivered = filteredDels.reduce((sum, d) => sum + Number(d.tonnage_loaded), 0);
     
     let allocsQuery = supabase.from('allocations').select('target_tonnage, project:project_id!inner(id, project_visibility)');
     allocsQuery = allocsQuery.eq('project.project_visibility', true);

     const { data: allocs } = await allocsQuery;
     let totalTarget = 0;
     if (allocs) {
        totalTarget = allocs
           .filter((a: any) => projectId === 'all' || a.project.id === projectId)
           .reduce((sum: number, a: any) => sum + Number(a.target_tonnage), 0);
     }
     
     const { count: truckCount } = await supabase
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'AVAILABLE');
     
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
                project:project_id!inner (id, project_visibility)
            )
        )
     `).eq('deliveries.allocations.project.project_visibility', true);

     if (projectId !== 'all') {
        feesQuery = feesQuery.eq('deliveries.allocations.project.id', projectId);
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

     // Production Stats
     let prodQuery = supabase.from('production').select('tonnage, project:project_id!inner(id, project_visibility)').eq('project.project_visibility', true);
     if (projectId !== 'all') {
       prodQuery = prodQuery.eq('project.id', projectId);
     }
     const { data: prodData } = await prodQuery;
     const totalProduced = prodData?.reduce((sum, p) => sum + Number(p.tonnage || 0), 0) || 0;

     return {
        totalDelivered,
        totalTarget,
        activeTrucks: truckCount || 0,
        totalFees: totalFees,
        totalProduced: totalProduced
     };
  },

  getProductions: async (onlyVisible: boolean = true): Promise<ProductionView[]> => {
    let query = supabase
      .from('production')
      .select(`
        *,
        project:project_id!inner(numero_phase, project_visibility)
      `);
    
    if (onlyVisible) {
      query = query.eq('project.project_visibility', true);
    }
    
    const { data, error } = await query.order('production_date', { ascending: false });

    if (error) {
      safeLog('Error fetching production:', error);
      return [];
    }

    return data.map((p: any) => ({
      ...p,
      project_phase: p.project ? `Phase ${p.project.numero_phase}` : 'N/A'
    }));
  },

  getChartData: async (projectId: string) => {
     // Respect visibility
     const allocsView = await db.getAllocationsView(true);
     const filtered = projectId === 'all' ? allocsView : allocsView.filter(a => a.project_id === projectId);
     
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

  getOperators: async (onlyVisible: boolean = true): Promise<Operator[]> => {
    let query = supabase.from('operators').select(`
       *,
       project:projet_id!inner(numero_phase, project_visibility)
    `);

    if (onlyVisible) {
      query = query.eq('project.project_visibility', true);
    }

    const { data } = await query;
    
    return (data || []).map((op: any) => ({
       ...op,
       project_id: op.projet_id,
       project_name: op.project ? `Phase ${op.project.numero_phase}` : '-',
       is_coop: op.operateur_coop_gie,
       phone: op.contact_info
    }));
  },

  getTrucks: async (): Promise<Truck[]> => {
    const { data: trucks, error } = await supabase.from('trucks').select('*');
    
    if (error) {
      safeLog('Error fetching trucks:', error);
      return [];
    }

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

  getProjects: async (onlyVisible: boolean = false): Promise<Project[]> => {
    let query = supabase.from('project').select('*');
    if (onlyVisible) {
      query = query.eq('project_visibility', true);
    }
    const { data: projects } = await query;
    if (!projects) return [];
    
    const deliveries = await db.getDeliveriesView(onlyVisible);
    
    return projects.map((p: any) => {
       const delivered = deliveries
          .filter(d => d.project_id === p.id)
          .reduce((sum, d) => sum + Number(d.tonnage_loaded), 0);
       return { 
         ...p, 
         total_delivered: delivered,
         export_statut: !!p.export_statut 
       };
    });
  },

  // Admin Parameters
  getAdminCategories: async (): Promise<AdminCategoryDepense[]> => {
    const { data } = await supabase.from('admin_categories_depense').select('*');
    return data || [];
  },

  getAdminModesPaiement: async (): Promise<AdminModePaiement[]> => {
    const { data } = await supabase.from('admin_modes_paiement').select('*');
    return data || [];
  },

  getAdminCodesAnalytiques: async (): Promise<AdminCodeAnalytique[]> => {
    const { data } = await supabase.from('admin_codes_analytiques').select('*');
    return data || [];
  },

  getAdminPostes: async (): Promise<AdminPoste[]> => {
    const { data } = await supabase.from('admin_postes').select('*');
    return data || [];
  },

  getAdminPersonnel: async (): Promise<AdminPersonnel[]> => {
    const { data } = await supabase.from('admin_personnel').select(`
      *,
      admin_postes(titre_poste)
    `);
    return (data || []).map((p: any) => ({
      ...p,
      poste_titre: p.admin_postes?.titre_poste || '-'
    }));
  },

  getAdminDepenses: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('admin_depenses')
      .select(`
        *,
        admin_categories_depense(nom_categorie),
        admin_modes_paiement(nom_mode),
        admin_codes_analytiques(code),
        admin_personnel(nom, prenom)
      `)
      .order('date_operation', { ascending: false });

    if (error) {
      safeLog('Error fetching admin expenses:', error);
      return [];
    }

    return (data || []).map((d: any) => ({
      ...d,
      nom_categorie: d.admin_categories_depense?.nom_categorie || '-',
      nom_mode: d.admin_modes_paiement?.nom_mode || '-',
      code_analytique: d.admin_codes_analytiques?.code || '-',
      responsable_nom: d.admin_personnel ? `${d.admin_personnel.prenom} ${d.admin_personnel.nom}` : '-'
    }));
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
        deliveries:delivery_id!inner (
           bl_number,
           delivery_date,
           trucks:truck_id (plate_number, owner_type),
           drivers:driver_id (name),
           allocations:allocation_id!inner (
              region_id, 
              commune_id, 
              project_id,
              regions(name),
              communes(name),
              project:project_id!inner (project_visibility)
           )
        )
     `).eq('deliveries.allocations.project.project_visibility', true);
     
     if (!data) return [];
     
     return data.map((p: any) => {
        const del = p.deliveries;
        const alloc = del?.allocations;
        return {
           ...p,
           bl_number: del?.bl_number,
           delivery_date: del?.delivery_date,
           truck_plate: del?.truck_plate,
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
    // Map primary key name based on table
    let pk = 'id';
    if (table === 'admin_categories_depense') pk = 'id_categorie';
    if (table === 'admin_modes_paiement') pk = 'id_mode';
    if (table === 'admin_codes_analytiques') pk = 'id_code';
    if (table === 'admin_postes') pk = 'id_poste';
    if (table === 'admin_personnel') pk = 'id_personnel';
    if (table === 'admin_depenses') pk = 'id_depense';

    const { data, error } = await supabase.from(table).update(payload).eq(pk, id).select();
    if (error) throw error;
    return data;
  },

  deleteItem: async (table: string, id: string) => {
    let pk = 'id';
    if (table === 'admin_categories_depense') pk = 'id_categorie';
    if (table === 'admin_modes_paiement') pk = 'id_mode';
    if (table === 'admin_codes_analytiques') pk = 'id_code';
    if (table === 'admin_postes') pk = 'id_poste';
    if (table === 'admin_personnel') pk = 'id_personnel';
    if (table === 'admin_depenses') pk = 'id_depense';

    const { error } = await supabase.from(table).delete().eq(pk, id);
    if (error) throw error;
    return true;
  },

  updateTruckDriverAssignment: async (truckId: string, driverId: string | null) => {
    await supabase.from('drivers').update({ truck_id: null }).eq('truck_id', truckId);
    if (driverId) {
       await supabase.from('drivers').update({ truck_id: truckId }).eq('id', driverId);
    }
  },

  getNetworkHierarchy: async (projectId: string): Promise<NetworkHierarchy> => {
    const allocs = await db.getAllocationsView(true);
    const filtered = projectId === 'all' ? allocs : allocs.filter(a => a.project_id === projectId);
    const deliveries = await db.getDeliveriesView(true);
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
     const allocs = await db.getAllocationsView(true);
     const filteredAllocs = projectId === 'all' ? allocs : allocs.filter(a => a.project_id === projectId);
     const deliveries = await db.getDeliveriesView(true);
     
     const tree: Record<string, any> = {};

     filteredAllocs.forEach(a => {
        if (!tree[a.region_id]) tree[a.region_id] = { id: a.region_id, name: a.region_name, departments: {} };
        const r = tree[a.region_id];

        if (!r.departments[a.department_id]) r.departments[a.department_id] = { id: a.department_id, name: a.department_name, communes: {} };
        const d = r.departments[a.department_id];

        if (!d.communes[a.commune_id]) d.communes[a.commune_id] = { id: a.commune_id, name: a.commune_name, operators: {} };
        const c = d.communes[a.commune_id];

        if (!c.operators[a.operator_id]) c.operators[a.operator_id] = { id: a.operator_id, name: a.operator_name, is_coop: false, allocations: {} }; 
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
    const dels = await db.getDeliveriesView(true);
    const { data: projects } = await supabase.from('project').select('*').eq('project_visibility', true);
    const projectMap: Record<string, any> = {};
    projects?.forEach((p: any) => projectMap[p.id] = p);

    const { data: operators } = await supabase.from('operators').select('*');
    const opMap: Record<string, any> = {};
    operators?.forEach((o: any) => opMap[o.id] = o);
    
    const { data: trucks } = await supabase.from('trucks').select('*');
    const truckMap: Record<string, any> = {};
    trucks?.forEach((t: any) => truckMap[t.id] = t);

    return dels.map(d => {
       const proj = d.project_id ? projectMap[d.project_id] : null;
       const op = d.operator_id ? opMap[d.operator_id] : null;
       
       return {
          ...d,
          region: d.region_name,
          department: d.department_name || 'Unknown',
          commune: d.commune_name,
          project_num_bon: proj?.numero_bon_disposition || 'N/A',
          numero_phase: proj?.numero_phase || 0,
          operator_contact_info: op?.contact_info || '', 
          operator_coop_name: op?.coop_name,
          truck_plate_number: d.truck_plate,
          truck_trailer_number: d.truck_id ? truckMap[d.truck_id]?.trailer_number : ''
       } as BonLivraisonView;
    });
  },

  getFinDeCessionViews: async (): Promise<FinDeCessionView[]> => {
     const allocs = await db.getAllocationsView(true);
     const map: Record<string, FinDeCessionView> = {};
     
     allocs.forEach(a => {
        const key = `${a.operator_id}-${a.project_phase}`;
        if (!map[key]) {
           map[key] = {
              operator_id: a.operator_id,
              operator_name: a.operator_name,
              operator_coop_name: a.coop_name || '',
              operator_phone: a.operator_phone || '',
              region: a.region_name,
              department: a.department_name,
              commune: a.commune_name,
              project_phase: Number(a.project_phase.replace('Phase ', '')),
              deliveries_count: 0,
              total_tonnage: 0
           };
        }
        map[key].total_tonnage += a.delivered_tonnage;
        // Count unique deliveries based on delivery logs if needed, but for now we aggregate tonnage
        // Usually, deliveries_count is calculated by looking at delivery logs
     });
     
     // Correct deliveries count by checking delivery data
     const allDeliveries = await db.getDeliveriesView(true);
     Object.values(map).forEach(fc => {
        fc.deliveries_count = allDeliveries.filter(d => 
           d.operator_id === fc.operator_id && 
           Number(d.project_phase.replace('Phase ', '').split(' - ')[0]) === fc.project_phase
        ).length;
     });

     return Object.values(map);
  },

  getUserPreferences: async (email: string): Promise<UserPreference | null> => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();
    
    if (error) {
       safeLog('Error fetching preferences:', error);
    }
    return data;
  },

  authenticateUser: async (email: string | null, pswd: string): Promise<UserPreference | null> => {
    let query = supabase.from('user_preferences').select('*');
    
    if (email) {
      query = query.eq('user_email', email);
    } else {
      // Password-only login for Manager role
      query = query.eq('user_right_level', 2);
    }
    
    const { data, error } = await query
      .eq('user_pswd', pswd)
      .maybeSingle();

    if (error) {
      safeLog('Auth error:', error);
      return null;
    }
    return data;
  },

  createUserAccount: async (payload: Partial<UserPreference>): Promise<UserPreference | null> => {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert([{
        ...payload,
        user_id: crypto.randomUUID(), // Mock user_id for the FK constraint in this sandbox env
        user_statut: false, // Default status is false (pending validation)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      safeLog('Create user error:', error);
      throw error;
    }
    return data;
  },

  saveUserPreferences: async (email: string, prefs: Partial<UserPreference>) => {
    const { error } = await supabase
      .from('user_preferences')
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq('user_email', email);
    
    if (error) safeLog('Error saving preferences:', error);
  }
};
