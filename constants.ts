
import { Region, Department, Commune, Operator, Truck, Driver, Allocation, Delivery } from './types';

export const APP_NAME = "MASAE Tracker";
export const CURRENT_USER_EMAIL = "admin@masae.sn";

// --- Mock Geographic Data ---
export const MOCK_REGIONS: Region[] = [
  { id: 'reg_1', name: 'Dakar', code: 'DK' },
  { id: 'reg_2', name: 'Thiès', code: 'TH' },
  { id: 'reg_3', name: 'Kaolack', code: 'KL' },
  { id: 'reg_4', name: 'Saint-Louis', code: 'SL' },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dept_1', region_id: 'reg_1', name: 'Dakar', code: 'DK' },
  { id: 'dept_2', region_id: 'reg_2', name: 'Thiès', code: 'TH' },
  { id: 'dept_3', region_id: 'reg_2', name: 'Mbour', code: 'MB' },
  { id: 'dept_4', region_id: 'reg_3', name: 'Kaolack', code: 'KL' },
];

export const MOCK_COMMUNES: Commune[] = [
  { id: 'com_1', department_id: 'dept_2', name: 'Thiès Nord', code: 'THN' },
  { id: 'com_2', department_id: 'dept_2', name: 'Fandène', code: 'FND' },
  { id: 'com_3', department_id: 'dept_3', name: 'Saly', code: 'SLY' },
  { id: 'com_4', department_id: 'dept_4', name: 'Kaolack', code: 'KLK' },
];

// --- Mock Actors ---
export const MOCK_OPERATORS: Operator[] = [
  { id: 'op_1', name: 'GIE And Suxali', commune_id: 'com_1', is_coop: true, coop_name: 'Union Thiès' },
  { id: 'op_2', name: 'Moussa Diop', commune_id: 'com_2', is_coop: false },
  { id: 'op_3', name: 'Coopérative Saloum', commune_id: 'com_4', is_coop: true, coop_name: 'Saloum Agri' },
];

// --- Mock Fleet ---
export const MOCK_TRUCKS: Truck[] = [
  { id: 'tr_1', plate_number: 'DK-2045-BB', capacity_tonnes: 40, status: 'AVAILABLE' },
  { id: 'tr_2', plate_number: 'TH-9921-AA', capacity_tonnes: 50, status: 'IN_TRANSIT' },
  { id: 'tr_3', plate_number: 'KL-1002-XX', capacity_tonnes: 35, status: 'MAINTENANCE' },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'dr_1', name: 'Amadou Fall', phone: '770001122', license_number: 'B-12345', status: 'ACTIVE' },
  { id: 'dr_2', name: 'Cheikh Ndiaye', phone: '762223344', license_number: 'C-98765', status: 'ACTIVE' },
];

// --- Mock Allocations ---
export const MOCK_ALLOCATIONS: Allocation[] = [
  {
    id: 'all_1',
    allocation_key: 'PH1-TH-001',
    project_id: 'proj_mock_1',
    region_id: 'reg_2',
    department_id: 'dept_2',
    commune_id: 'com_1',
    operator_id: 'op_1',
    target_tonnage: 500,
    status: 'IN_PROGRESS',
    phase: 'Phase 1',
    created_at: '2023-10-01T10:00:00Z',
    responsible_name: 'Moussa Diop',
    responsible_phone_raw: '77 123 45 67',
    delivered_tonnage: 40
  },
  {
    id: 'all_2',
    allocation_key: 'PH1-KL-002',
    project_id: 'proj_mock_1',
    region_id: 'reg_3',
    department_id: 'dept_4',
    commune_id: 'com_4',
    operator_id: 'op_3',
    target_tonnage: 1000,
    status: 'OPEN',
    phase: 'Phase 1',
    created_at: '2023-10-02T14:30:00Z',
    responsible_name: 'Fatou Ndiaye',
    responsible_phone_raw: '76 987 65 43',
    delivered_tonnage: 0
  }
];

// --- Mock Deliveries ---
export const MOCK_DELIVERIES: Delivery[] = [
  {
    id: 'del_1',
    allocation_id: 'all_1',
    bl_number: 'BL250001',
    truck_id: 'tr_1',
    driver_id: 'dr_1',
    tonnage_loaded: 40,
    tonnage_delivered: 40,
    delivery_date: '2023-10-05T09:00:00Z',
    created_at: '2023-10-05T08:00:00Z'
  },
  {
    id: 'del_2',
    allocation_id: 'all_1',
    bl_number: 'BL250002',
    truck_id: 'tr_2',
    driver_id: 'dr_2',
    tonnage_loaded: 50,
    tonnage_delivered: null, // Still in transit
    delivery_date: '2023-10-06T10:00:00Z',
    created_at: '2023-10-06T09:00:00Z'
  }
];
