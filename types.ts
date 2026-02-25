
export interface Region {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  region_id: string;
  name: string;
  code: string;
}

export interface Commune {
  id: string;
  department_id: string;
  name: string;
  code: string;
  distance_mine?: number | null;
}

export interface Operator {
  id: string;
  name: string;
  commune_id: string;
  is_coop: boolean;
  coop_name?: string | null;
  phone?: string;
  projet_id?: string;
  project_id?: string; // UI alias
  project_name?: string;
}

export interface Project {
  id: string;
  numero_phase: number;
  numero_marche: string;
  numero_bon_disposition: string;
  date_mise_disposition: string;
  tonnage_total: number;
  project_visibility: boolean;
  project_description?: string;
  export_statut?: boolean;
  total_delivered?: number;
}

export interface Truck {
  id: string;
  plate_number: string;
  capacity_tonnes: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'ON_SITE';
  trailer_number?: string;
  owner_type?: boolean; // true = internal, false/null = external
  driver_id?: string;
  driver_name?: string;
  qrcode_content?: string | null;
  updated_at?: string; // Used for FIFO ordering
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_number: string;
  status: 'ACTIVE' | 'INACTIVE';
  truck_id?: string;
  truck_plate?: string;
  phone_normalized?: string;
}

export interface Allocation {
  id: string;
  allocation_key: string;
  project_id: string;
  region_id: string;
  department_id: string;
  commune_id: string;
  operator_id: string;
  target_tonnage: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVER_DELIVERED';
  phase?: string;
  created_at: string;
  responsible_name?: string;
  responsible_phone_raw?: string;
  delivered_tonnage: number;
}

export interface AllocationView extends Allocation {
  operator_name: string;
  coop_name?: string;
  is_coop?: boolean;
  operator_phone?: string;
  region_name: string;
  department_name: string;
  commune_name: string;
  project_phase: string;
  progress: number;
  delivered_tonnage: number;
  project_total_tonnage?: number;
}

export interface Delivery {
  id: string;
  allocation_id: string;
  bl_number: string;
  truck_id?: string;
  driver_id?: string;
  tonnage_loaded: number;
  tonnage_delivered?: number | null;
  delivery_date: string;
  created_at: string;
  declaration_code?: string | null;
}

export interface DeliveryView extends Delivery {
  operator_name: string;
  region_name: string;
  department_name?: string;
  commune_name: string;
  project_phase: string;
  truck_plate: string;
  driver_name: string;
  project_id?: string;
  truck_owner_type?: boolean;
  operator_id?: string;
}

export interface Payment {
  id: string;
  delivery_id: string;
  truck_id: string;
  road_fees: number;
  personal_fees: number;
  other_fees: number;
  other_fees_label?: string;
  overweigh_fees: number;
  fuel_quantity: number;
  fuel_cost: number;
  loading_cost?: number;
  unloading_cost?: number;
  date_updated: string;
}

export interface EnrichedPayment extends Payment {
  bl_number: string;
  truck_plate: string;
  driver_name: string;
  commune_name: string;
  region_name: string;
  project_id: string;
  truck_owner_type: boolean;
  delivery_date: string;
}

export interface UserPreference {
  id?: string;
  user_id?: string;
  user_email: string;
  theme_mode: 'light' | 'dark';
  theme_color: string;
  theme_name?: string;
  sidebar_pinned: boolean;
  language: string;
  created_at?: string;
  updated_at?: string;
  user_right_level: number; // 3: Admin, 2: Manager, 1: Driver
  user_pswd?: string;
  user_statut?: boolean;
}

export interface Production {
  id: string;
  project_id: string;
  production_date: string;
  bags_deployed: number;
  bags_filled_50kg: number;
  tonnage: number;
  nombre_elements: number; 
  equipe_couture: number;
  total_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionView extends Production {
  project_phase: string;
}

// Admin / Parameters Types
export interface AdminCategoryDepense {
  id_categorie: string;
  nom_categorie: string;
}

export interface AdminModePaiement {
  id_mode: string;
  nom_mode: string;
}

export interface AdminCodeAnalytique {
  id_code: string;
  code: string;
  description: string;
}

export interface AdminPoste {
  id_poste: string;
  titre_poste: string;
  categorie_poste: string;
}

export interface AdminPersonnel {
  id_personnel: string;
  nom: string;
  prenom: string;
  id_poste: string;
  telephone: string;
  poste_titre?: string;
}

export interface AdminDepense {
  id_depense: string;
  date_operation: string;
  libelle: string;
  montant: number;
  id_categorie: string;
  id_mode_paiement: string;
  id_code_analytique: string;
  id_responsable: string;
  reference_piece: string;
  created_at: string;
  updated_at: string;
}

export type NetworkHierarchy = Array<{
  id: string;
  name: string;
  target: number;
  delivered: number;
  completionRate: number;
  departments: Array<{
    id: string;
    name: string;
    target: number;
    delivered: number;
    communes: Array<{
      id: string;
      name: string;
      delivered: number;
      deliveries: Array<{
        id: string;
        bl_number: string;
        tonnage: number;
        truck_plate: string;
        driver_name: string;
      }>
    }>
  }>
}>;

export interface BonLivraisonView extends DeliveryView {
  region: string;
  department: string;
  commune: string;
  project_num_bon: string;
  numero_phase: number;
  operator_coop_name?: string;
  operator_contact_info?: string;
  truck_plate_number?: string;
  truck_trailer_number?: string;
}

export interface FinDeCessionView {
  operator_id: string;
  operator_name: string;
  operator_coop_name?: string;
  operator_phone?: string;
  region: string;
  department: string;
  commune: string;
  project_phase: number;
  deliveries_count: number;
  total_tonnage: number;
}

/**
 * Fix: Corrected GlobalHierarchy type definition to match the structure returned by the database service.
 * The hierarchy follows the structure: Region -> Department -> Commune -> Operator -> Allocation -> Delivery.
 */
export type GlobalHierarchy = Array<{
  id: string;
  name: string;
  departments: Array<{
    id: string;
    name: string;
    communes: Array<{
      id: string;
      name: string;
      operators: Array<{
        id: string;
        name: string;
        is_coop: boolean;
        allocations: Array<{
          id: string;
          allocation_key: string;
          target: number;
          delivered: number;
          deliveries: Array<{
            id: string;
            bl_number: string;
            date: string;
            truck_plate: string;
            driver_name: string;
            tonnage: number;
          }>
        }>
      }>
    }>
  }>
}>;
