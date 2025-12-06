# MASAE Delivery Tracker - Modern Web App PRD

## 1. Executive Summary
**Product Name:** MASAE Delivery Tracker (Web V2)
**Description:** A comprehensive SaaS platform for managing agricultural resource allocation, logistics dispatching, and real-time delivery tracking in Senegal. The system connects administrative planning (Allocations) with field operations (Logistics/Fleet), utilizing a shared data layer to ensure transparency and efficiency.

**Core Value:** Digital transformation of manual delivery notes (BL) and cession forms into a real-time, data-driven dashboard.

---

## 2. Technical Stack
**Frontend Architecture:**
*   **Framework:** React 19 (via Vite)
*   **Routing:** React Router DOM v7
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Custom "Soft UI" Theme)
*   **Icons:** Lucide React
*   **Charts:** Recharts

**Backend Services:**
*   **Platform:** Supabase (BaaS)
*   **Database:** PostgreSQL
*   **Authentication:** Supabase Auth (or Public/Anon access for internal tools)
*   **Real-time:** Supabase Realtime (optional for dashboard updates)

---

## 3. Backend & Connectivity
The application relies on a specific Supabase instance.

**Connection Credentials:**
*   **API URL:** `https://ndzjirmrfdeheuljjvxb.supabase.co`
*   **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kemppcm1yZmRlaGV1bGpqdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mjk4ODQsImV4cCI6MjA4MDEwNTg4NH0.KurTQrTjwUJM9aA5M0OVw7bZa7radpy0EDx1q9lKf1A`

**Environment Variables:**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://ndzjirmrfdeheuljjvxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kemppcm1yZmRlaGV1bGpqdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mjk4ODQsImV4cCI6MjA4MDEwNTg4NH0.KurTQrTjwUJM9aA5M0OVw7bZa7radpy0EDx1q9lKf1A
```

---

## 4. Database Schema Specification
The following tables and relationships must be implemented to support the application workflows.

### Core Tables

**1. Projects (`project`)**
*   `id` (UUID, PK)
*   `numero_marche` (String): Contract number.
*   `numero_bon_disposition` (String): Authorization document ID.
*   `numero_phase` (Int): Phase number (1, 2, 3...).
*   `tonnage_total` (Numeric): Total tonnage for this project.
*   `date_mise_disposition` (Date).

**2. Geographic Data (`regions`, `departments`, `communes`)**
*   `regions`: `id`, `name`, `code`.
*   `departments`: `id`, `name`, `code`, `region_id` (FK).
*   `communes`: `id`, `name`, `code`, `department_id` (FK).

**3. Actors (`operators`)**
*   `id` (UUID, PK)
*   `name` (String)
*   `commune_id` (FK -> communes)
*   `projet_id` (FK -> project): The project phase this operator belongs to.
*   `contact_info` (String): Phone number.
*   `operateur_coop_gie` (Boolean): True if Cooperative/GIE.
*   `coop_name` (String, Optional).

**4. Fleet (`trucks`, `drivers`)**
*   `trucks`:
    *   `id` (PK)
    *   `plate_number` (String, Unique)
    *   `capacity_tonnes` (Numeric)
    *   `status` (Enum: AVAILABLE, IN_TRANSIT, MAINTENANCE)
    *   `trailer_number` (String, Optional)
*   `drivers`:
    *   `id` (PK)
    *   `name` (String)
    *   `phone_normalized` (String)
    *   `license_number` (String)
    *   `status` (Enum: ACTIVE, INACTIVE)
    *   `truck_id` (FK -> trucks, Nullable, Unique constraint usually applies): Current assignment.

**5. Allocations (`allocations`)**
*   `id` (UUID, PK)
*   `allocation_key` (String, Unique): e.g., "PH1-DK-OP-1234".
*   `project_id` (FK -> project)
*   `operator_id` (FK -> operators)
*   `region_id` (FK -> regions)
*   `department_id` (FK -> departments)
*   `commune_id` (FK -> communes)
*   `target_tonnage` (Numeric): Quota assigned.
*   `status` (Enum: OPEN, IN_PROGRESS, CLOSED, OVER_DELIVERED)
*   `responsible_name` (String): Name of person in charge.
*   `responsible_phone_raw` (String).

**6. Deliveries / Logistics (`deliveries`)**
*   `id` (UUID, PK)
*   `allocation_id` (FK -> allocations)
*   `bl_number` (String, Unique): Generated BL ID.
*   `truck_id` (FK -> trucks)
*   `driver_id` (FK -> drivers)
*   `tonnage_loaded` (Numeric)
*   `delivery_date` (Date)
*   `created_at` (Timestamp)

### SQL Views
**1. `view_bon_livraison`**
*   Joins `deliveries` -> `allocations` -> `operators`, `projects`, `locations`.
*   Used for the "Bon de Livraison" report tab.

**2. `view_fin_de_cession`**
*   Aggregates `deliveries` by `operator` and `project_phase`.
*   Calculates `count(deliveries)` and `sum(tonnage_loaded)`.
*   Used for the "Bon de Fin de Cession" report tab.

---

## 5. Functional Workflows

### A. Dashboard & Analytics
**Goal:** Provide high-level visibility into campaign progress.
1.  **KPI Calculation:**
    *   Fetch all Allocations -> Sum `target_tonnage`.
    *   Fetch all Deliveries -> Sum `tonnage_loaded`.
    *   Completion Rate = (Total Delivered / Total Target) * 100.
2.  **Visualizations:**
    *   **Bar/Area Chart:** Group Allocations (Planned) and Deliveries (Realized) by `Region`.
    *   **Filters:** Allow filtering chart data by `Project Phase`.

### B. Allocation Management
**Goal:** Assign quotas to operators before shipping.
1.  **Creation Flow:**
    *   Select `Project` (Phase).
    *   Select `Operator`. *Logic:* Filter operators belonging to the selected project phase.
    *   Select `Commune`. *Logic:* Auto-fill Region/Department based on Commune.
    *   Input `Target Tonnage`.
    *   Auto-generate `Allocation Key`.
2.  **Status Automation:**
    *   If `Delivered >= Target`, system can suggest or auto-set status to `CLOSED` or `OVER_DELIVERED`.
    *   If `Delivered > 0` and status is `OPEN`, auto-set to `IN_PROGRESS`.

### C. Logistics Dispatch (The "Bon de Livraison" Process)
**Goal:** Create a shipment record.
1.  **Selection Context:**
    *   User selects an existing `Allocation` (Operator/Location).
    *   System displays "Remaining Tonnage" (Target - Sum of previous deliveries).
2.  **Transport Assignment:**
    *   User selects `Truck`.
    *   System **Auto-fills `Driver`** associated with that truck in the `drivers` table.
3.  **Validation:**
    *   `Tonnage Loaded` > 0.
    *   `BL Number` generation (BL + Year + Random).
4.  **Output:**
    *   Creates a `delivery` record.
    *   Updates Dashboard stats immediately.

### D. Fleet Management
**Goal:** Maintain resource availability.
1.  **Truck/Driver Linking:**
    *   When creating/editing a Truck, allow selecting a Driver.
    *   Update `drivers` table: set `truck_id` = selected truck.
    *   Ensure 1:1 relationship handling (unassign driver from previous truck if needed).

### E. Settings & Configuration
**Goal:** CRUD operations for master data.
*   **Geographic:** Hierarchy management (Region -> Dept -> Commune).
*   **Projects:** Define new phases. *Constraint:* Project IDs are used to filter Operators.
*   **Operators:** Define actors. *Constraint:* Must link to a specific Project Phase.

---

## 6. UX/UI Specifications
**Design System:** "Amber Soft UI"
**Principles:**
*   **Primary Color:** Amber/Orange (`#f59e0b` / `oklch(0.769 0.188 70.08)`).
*   **Aesthetics:** High border radius (`1rem`), diffused shadows (`shadow-soft-xl`), minimal borders.
*   **Dark Mode:** Fully supported using Slate-900 backgrounds and Amber accents.

**Key Components:**
*   **Sidebar:** Collapsible, dark slate in light mode (contrast), icons only when collapsed.
*   **Cards:** White background, elevated with shadows, no outlines.
*   **Inputs:** Large touch targets, filled style (`bg-muted/50`).

## 7. Migration / Rebuild Steps
1.  **Initialize Project:** Setup Vite + React + TypeScript + Tailwind.
2.  **Integrate Design System:** Copy `tailwind.config.js` theme extensions and CSS variables.
3.  **Service Layer:** Implement `services/db.ts` using the Supabase JS client and the credentials provided above.
4.  **Page Implementation:**
    *   Build `Dashboard.tsx` with Recharts.
    *   Build `Allocations.tsx` with filtering and modal forms.
    *   Build `Logistics.tsx` with Truck/Driver auto-association logic.
    *   Build `Views.tsx` connecting to SQL views.
5.  **Testing:** Verify data flow (Create Allocation -> Create Delivery -> Check Dashboard Stats -> Check Views).
