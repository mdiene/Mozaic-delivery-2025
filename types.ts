
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
  chassis_camion?: string | null;
  owner_type?: boolean; // true = internal, false/null = external
  driver_id?: string;
  driver_name?: string;
  qrcode_content?: string | null;
  updated_at?: string; // Used for FIFO ordering
  truck_type?: string | null;
  truck_marque?: string | null;
  Trucks_proprietaire?: string | null;
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
  truck_trailer?: string;
  truck_chassis?: string;
  driver_name: string;
  driver_license?: string;
  driver_phone?: string;
  project_id?: string;
  truck_owner_type?: boolean;
  truck_owner?: string;
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
  is_accounted?: boolean;
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
  project_description?: string;
  numero_phase: number;
  export_statut?: boolean;
  operator_coop_name?: string;
  operateur_coop_gie?: boolean;
  operator_contact_info?: string;
  truck_plate_number?: string;
  truck_trailer_number?: string;
  truck_chassis?: string;
  Trucks_proprietaire?: string;
  driver_license?: string;
  driver_phone?: string;
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

// HQSE Types
export interface EquipmentType {
  id: string;
  label: string;
  code: string;
  description?: string;
  icon_name?: string;
  is_regulatory_subject: boolean;
  default_frequency_days?: number;
  available_stock_quantity: number;
  total_stock_quantity: number;
  renewal_cycle_days?: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  ref_code: string;
  name: string;
  category?: string;
  serial_number?: string;
  location?: string;
  commissioning_date?: string;
  status: 'Actif' | 'Inactif' | 'Maintenance';
  responsible_user_id?: string;
  type_id?: string;
  quantite_dispo?: number;
  created_at: string;
  // Enriched fields
  type_label?: string;
  responsible_name?: string;
}

export interface HQSEInspection {
  id: string;
  equipment_id: string;
  inspector_name?: string;
  inspection_date: string;
  verdict: 'OK' | 'NON-CONFORME';
  report?: string;
  comments?: string;
  created_at: string;
  id_employe?: string;
  // Enriched fields
  equipment_name?: string;
  equipment_ref?: string;
  employee_name?: string;
}

export interface HQSEInspectionPlan {
  id: string;
  equipment_id: string;
  inspection_type: string;
  frequency_days: number;
  last_inspection_date?: string;
  next_due_date?: string;
  // Enriched fields
  equipment_name?: string;
  equipment_ref?: string;
  equipment_type?: string;
}

export interface HQSENonConformity {
  id: string;
  inspection_id?: string;
  equipment_id?: string;
  description: string;
  severity: 'Mineure' | 'Majeure' | 'Critique';
  status: string;
  declared_at: string;
  // Enriched fields
  equipment_name?: string;
  equipment_ref?: string;
}

export interface HQSECorrectiveAction {
  id: string;
  nc_id?: string;
  action_plan: string;
  assigned_to?: string;
  target_date?: string;
  completion_date?: string;
  status: 'A faire' | 'En cours' | 'Terminé';
  created_at: string;
  // Enriched fields
  nc_description?: string;
  assigned_person_name?: string;
}

export interface HQSEEmployeeAllocation {
  id: string;
  employee_id: string;
  equipment_id: string;
  quantity_allocated: number;
  allocation_date: string;
  expected_renewal_date?: string;
  condition_at_allocation?: string;
  is_returned: boolean;
  return_date?: string;
  comments?: string;
  created_at: string;
  // Enriched fields
  employee_name?: string;
  employee_matricule?: string;
  equipment_name?: string;
  equipment_ref?: string;
}

export interface EmployeeEndowment {
  id: string;
  employee_id: string;
  equipment_type_id: string;
  assigned_date: string;
  expected_renewal_date: string;
  status: 'Actif' | 'Rendu' | 'Perdu' | 'Détérioré';
  created_at: string;
  // Enriched fields
  employee_name?: string;
  equipment_type_label?: string;
}

export interface HQSESafetyAudit {
  id: string;
  employee_id: string;
  auditor_id: string;
  audit_date: string;
  equipment_id?: string;
  number_of_items: number;
  is_usage_respected: boolean;
  observation_notes?: string;
  has_loss_occurred: boolean;
  has_deteriorated_equipment: boolean;
  corrective_action_required?: string;
  created_at: string;
  // Enriched fields
  employee_name?: string;
  auditor_name?: string;
  equipment_name?: string;
  equipment_ref?: string;
}

export interface HQSESignalement {
  id: string;
  register: 'accident' | 'sante' | 'danger' | 'qualite' | 'environnement';
  origin: 'materiel' | 'humain' | 'organisationnel' | 'externe';
  equipment_id?: string;
  employee_concerned_id?: string;
  event_date: string;
  severity: 'Mineure' | 'Majeure' | 'Critique';
  reason_description: string;
  measures_to_take?: string;
  status: string;
  reported_by: string;
  created_at: string;
  // Enriched fields
  equipment_name?: string;
  equipment_ref?: string;
  employee_name?: string;
  reporter_name?: string;
}
