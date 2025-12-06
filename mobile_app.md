# MASAE Delivery Tracker - Mobile Application PRD

## 1. Project Overview
**Product Name:** MASAE Delivery Tracker Mobile
**Description:** A mobile companion application for the MASAE platform to manage agricultural resource allocation, logistics dispatch, and delivery tracking in Senegal. The app mirrors the functionality of the web dashboard but is optimized for field usage by logistics coordinators and operators.

**Primary Goal:** Enable real-time tracking, BL (Bon de Livraison) generation, and fleet management from mobile devices, ensuring data consistency with the web platform via a shared Supabase backend.

---

## 2. Technical Architecture
**Recommended Stack:**
*   **Framework:** React Native (via Expo)
*   **Language:** TypeScript
*   **Backend/Database:** Supabase (Shared with Web App)
*   **State Management:** React Query (TanStack Query) for offline caching
*   **UI Library:** React Native Paper or Tamagui (to match "Soft UI" aesthetic)

---

## 3. Connectivity & Credentials
The mobile app must connect to the existing Supabase instance used by the web application.

**Supabase Configuration:**
*   **API URL:** `https://ndzjirmrfdeheuljjvxb.supabase.co`
*   **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kemppcm1yZmRlaGV1bGpqdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mjk4ODQsImV4cCI6MjA4MDEwNTg4NH0.KurTQrTjwUJM9aA5M0OVw7bZa7radpy0EDx1q9lKf1A`

**Permissions:**
*   Add `internet` permission in `app.json` / `AndroidManifest.xml`.
*   Ensure RLS (Row Level Security) policies on Supabase allow access if authentication is implemented (currently utilizing anonymous/public access based on provided keys).

---

## 4. Feature Specifications & Workflows

### A. Dashboard (Home Screen)
**Objective:** Provide a quick snapshot of campaign performance.
*   **UI Layout:** Scrollable view with "Soft UI" Card components.
*   **Data Points:**
    *   **KPI Cards:** Total Delivered (T), Target Tonnage (T), Active Trucks, Alerts.
    *   **Completion Rate:** Circular progress bar or linear bar showing `%` of Target met.
    *   **Recent Activity:** List of last 5 deliveries (BL Number, Time).
*   **Logic:** Reuse `db.getStats()` logic.
    *   Sum `allocations.target_tonnage`.
    *   Sum `deliveries.tonnage_loaded`.

### B. Allocations Management
**Objective:** Manage regional quotas and operator assignments.
*   **List View:**
    *   Filter by Project Phase (Horizontal Scroll Pill headers).
    *   Card item: Operator Name, Region, Progress Bar (Delivered/Target), Status Badge (Open/Closed).
*   **Detail/Edit View (Modal):**
    *   Fields: Project (Dropdown), Operator (Dropdown with Auto-fill Loc), Region, Department, Commune, Target Tonnage.
    *   **Action:** "Create Allocation" FAB (Floating Action Button).
*   **Logic:** Reuse `db.getAllocationsView()`.

### C. Logistics & Dispatch (Core Feature)
**Objective:** Record shipments and generate BLs.
*   **List View:**
    *   Grouped by Project Phase or Date.
    *   Card item: BL Number, Truck Plate, Driver Name, Load (T), Destination.
*   **Create Delivery Flow:**
    1.  **Select Allocation:** Searchable dropdown of Operators.
        *   *Display:* Target vs Delivered stats for context.
    2.  **Select Truck:** Dropdown of available trucks.
        *   *Auto-fill:* Driver assigned to truck.
    3.  **Input Load:** Numeric input for Tonnage.
    4.  **Confirm:** Auto-generate BL Number (e.g., BL25000X).
*   **Logic:** Reuse `db.getDeliveriesView()` and `db.createItem('deliveries', ...)`.

### D. Fleet Management
**Objective:** Manage trucks and drivers.
*   **Tabs:** Trucks | Drivers.
*   **Trucks List:**
    *   Card item: Plate Number, Capacity, Status Badge (Available/Transit/Maintenance).
    *   Quick Action: Call Driver (if assigned).
*   **Drivers List:**
    *   Card item: Name, Phone, License.
    *   Action: Assign to Truck.

### E. Views & Reports
**Objective:** Read-only reference of consolidated data.
*   **Tabs:** Bon de Livraison | Bon de Fin de Cession.
*   **Bon de Livraison:** List view of all BLs with search.
*   **Bon de Fin de Cession:**
    *   Aggregate view based on `view_fin_de_cession`.
    *   Display: Operator, Project Phase, Delivery Count, Total Tonnage.
*   **Logic:** Fetch from `view_bon_livraison` and `view_fin_de_cession`.

### F. Settings
**Objective:** Manage reference data (Geo, Projects, Operators).
*   **Navigation:** List of categories (Geographic, Projects, Operators).
*   **Operators:** Add/Edit Operators (Name, Type: Coop/Indiv, Commune).
*   **Projects:** Add/Edit Projects (Phase, Market #, Tonnage).
*   **Geographic:** Manage hierarchy (Region -> Dept -> Commune).

---

## 5. Data Models (TypeScript Interfaces)

Reuse the existing `types.ts` structure to ensure compatibility.

```typescript
// Core Entities
interface Project { id: string; numero_phase: number; tonnage_total: number; ... }
interface Operator { id: string; name: string; is_coop: boolean; ... }
interface Allocation { id: string; target_tonnage: number; status: 'OPEN' | 'CLOSED'; ... }
interface Delivery { id: string; bl_number: string; tonnage_loaded: number; ... }
interface Truck { id: string; plate_number: string; ... }

// View Models
interface FinDeCessionView {
  region: string;
  operator_name: string;
  project_phase: number;
  deliveries_count: number;
  total_tonnage: number;
}
```

---

## 6. UX/UI Guidelines (Mobile Adaptation)

*   **Navigation:** Bottom Tab Bar (Dashboard, Allocations, Logistics, Fleet, Menu).
*   **Input Methods:**
    *   Use numeric keyboards for Tonnage.
    *   Use date pickers for Date fields.
    *   Use Searchable Bottom Sheets for selecting Operators/Communes instead of native `<select>` dropdowns.
*   **Styling (Soft UI):**
    *   **Cards:** White background, `borderRadius: 16`, Shadow `0px 4px 12px rgba(0,0,0,0.05)`.
    *   **Primary Color:** Amber/Orange (from Web Design).
    *   **Typography:** Inter (or system sans-serif), large headings for readability in sunlight.

## 7. Development Roadmap

1.  **Setup:** Init Expo project, install `@supabase/supabase-js`, `react-native-paper`.
2.  **Data Layer:** Port `services/db.ts` to mobile project.
3.  **Auth/Connection:** Implement Supabase client with provided credentials.
4.  **Screens Implementation:**
    *   Build Dashboard with Recharts alternative (e.g., `react-native-chart-kit`).
    *   Build Lists (FlatList) for Allocations/Logistics.
    *   Build Forms (React Hook Form).
5.  **Testing:** Test data synchronization between Web and Mobile.
