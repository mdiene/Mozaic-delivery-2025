


export type AllocationStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVER_DELIVERED';

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
}

export interface Operator {
  id: string;
  name: string;
  commune_id: string;
  commune_name?: string;
  is_coop: boolean;
  coop_name?: string;
  phone?: string;
  projet_id?: string;
  project_name?: string;
}

export interface Truck {
  id: string;
  plate_number: string;
  capacity_tonnes: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE';
  driver_id?: string;
  driver_name?: string;
  trailer_number?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_number: string;
  status: 'ACTIVE' | 'INACTIVE';
  truck_id?: string;
  truck_plate?: string;
}

export interface Project {
  id: string;
  numero_marche: string;
  numero_bon_disposition: string;
  numero_phase: number;
  date_mise_disposition: string;
  tonnage_total: number;
  total_delivered?: number;
}

export interface Allocation {
  id: string;
  allocation_key: string; // e.g., PHASE1-REG-001
  region_id: string;
  department_id: string;
  commune_id: string;
  operator_id: string;
  target_tonnage: number;
  status: AllocationStatus;
  phase?: string; // Optional in type, derived from project in UI, not in DB
  created_at: string;
  project_id?: string;
  // Responsible Person fields matching DB schema
  responsible_name: string;
  responsible_phone_raw?: string;
  responsible_phone_normalized?: string;
}

export interface Delivery {
  id: string;
  allocation_id: string;
  bl_number: string;
  truck_id: string;
  driver_id: string;
  tonnage_loaded: number;
  tonnage_delivered?: number | null; // Nullable based on schema
  delivery_date: string;
  // Status removed as per schema update
  created_at: string;
}

// Joined types for UI display
export interface AllocationView extends Allocation {
  operator_name: string;
  region_name: string;
  department_name: string;
  commune_name: string;
  delivered_tonnage: number;
  progress: number;
  project_phase?: string; // Added for display/grouping
}

export interface DeliveryView extends Delivery {
  operator_name: string;
  region_name: string;
  commune_name: string;
  project_phase: string;
  truck_plate: string;
  driver_name: string;
}

// Database Views
export interface BonLivraisonView {
  bl_number: string;
  tonnage_loaded: number;
  delivery_date: string;
  allocation_key: string;
  target_tonnage: number;
  operator_name: string;
  operator_coop_name?: string;
  operator_contact_info?: string;
  commune: string;
  department: string;
  region: string;
  project_num_bon: string;
  numero_phase: number;
}

export interface FinDeCessionView {
  region: string;
  department: string;
  commune: string;
  operator_name: string;
  operator_coop_name?: string;
  operator_contact_info?: string;
  project_phase: number;
  deliveries_count: number;
  total_tonnage: number;
}

// Graph Data Interface
export interface RegionPerformance {
  regionId: string;
  regionName: string;
  targetTonnage: number;
  deliveredTonnage: number;
  deliveryCount: number;
  completionRate: number;
}