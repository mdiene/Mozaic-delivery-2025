# AI Coding Assistant Instructions for MASAE Delivery Tracker

Follow these guidelines strictly to maintain consistency across the Supply Chain and Logistics modules.

## 1. Design System & UI Consistency
*   **Theme:** "Soft UI" / Neumorphism Lite. Use the provided CSS variables for colors and shadows.
*   **Primary Color:** Amber/Orange (`var(--primary)` / `#f59e0b`).
*   **Layout Components:** 
    *   **Filter Ribbon:** Always include a horizontal filter bar at the top of main views (Phase, Search, Status).
    *   **Accordions:** Use the `.accordion` pattern for grouping list items (e.g., by Project Phase or Date).
*   **Production Modals:** Forms in the Production module must use **Color-Coded Sections** (e.g., Blue for General, Amber for Workforce, Emerald for Production Data) to improve scanability.

## 2. Business Logic Rules

### Production Module (Ensachage)
*   **Workforce Calculation:** Total site personnel is the sum of `nombre_elements` (general staff) and `equipe_couture` (sewing staff).
*   **Labor Cost Formula:** The field `total_amount` must be automatically computed as `(nombre_elements + equipe_couture) * daily_wage`.
*   **Tonnage Conversion:** 1 sac (50kg) = 0.05 T. Display tonnage estimates next to bag counts.

### Logistics & Expenses
*   **Internal vs External:** `truck_owner_type === true` indicates "Wague Agro Business". For these trucks, fuel and route fees are tracked. For external trucks, these are usually zeroed or moved to "Forfait" in `other_fees`.
*   **FIFO Status:** A truck entering the queue becomes `ON_SITE`. When a delivery is created, it transitions to `IN_TRANSIT`.

## 3. Database & Services (`services/db.ts`)
*   **Mapping:** Map nested Supabase response objects into flat TypeScript interfaces before passing them to components.
*   **Purchases:** Use the `production_purchases` table for all non-labor site expenses. Categories include: `INTRANTS`, `CARBURANT_SITE`, `MAINTENANCE`, `RESTAURATION`, `DIVERS`.

## 4. Google Gemini API Implementation
*   **Model:** Use `gemini-2.5-flash` for itinerary and routing logic.
*   **Grounding:** Always enable `googleMaps` tool for distance/duration queries.
*   **Origin:** The default site origin for routes is **Amadi Ounare** (GPS: 15.3469, -13.0218).

## 5. Export & Printing
*   **PDF Template:** Use `jspdf` for BL generation. Maintain the "SOMA" corporate identity:
    *   Header: Three colored bars (Orange, Gold, Green).
    *   Table: "Quantité / Tonnes" right-aligned with bold sub-totals.
    *   Footer: Branded stamp "SOCIETE MINIERE AFRICAINE" in Navy Blue.
