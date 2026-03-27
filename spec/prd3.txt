# Product Requirements Document (PRD) - Masae Delivery Tracker

## 1. Project Overview
Masae Delivery Tracker is a full-stack logistics and operations management system designed to track large-scale resource distribution (e.g., mining, agriculture). It manages the entire lifecycle from production and fleet management to delivery tracking, expense accounting, and payroll.

## 2. Core Modules & Features

### 2.1. Dashboard & Analytics
- **KPI Overview**: Real-time display of active trucks, total tonnage delivered, number of trips, and project progress.
- **Visualizations**: Charts for delivery trends, tonnage by region, and operator performance.
- **Project Selection**: Ability to filter all data by specific project phases.

### 2.2. Global View (Network Visualization)
- **Geographic Hierarchy**: Drill down from Region -> Department -> Commune -> Operator.
- **Performance Tracking**: Visual indicators of completion rates for each geographic node.
- **Sharing**: Generate public shareable links for specific transport owners or geographic views.
- **Bilan Transport**: Detailed summary of transport owner performance including tonnage, trips, and phase targets.

### 2.3. Fleet & Logistics Management
- **Truck Management**: Track plate numbers, capacities, status (Available, In Transit, Maintenance, On Site), and ownership (Internal/External).
- **Driver Management**: Track driver details, licenses, and assigned trucks.
- **Truck FIFO**: Queue management for trucks waiting to load.
- **Itinerary Tracking**: (Planned/Basic) Tracking of truck routes.

### 2.4. Production Tracking
- **Extraction/Processing**: Record daily production data including bags deployed, bags filled (50kg), total tonnage, and team performance.
- **Project Linking**: Associate production batches with specific project phases.

### 2.5. Allocations & Deliveries
- **Target Setting**: Define tonnage targets (Allocations) for specific Operators within the geographic hierarchy.
- **Delivery Recording**: Log individual deliveries (Bon de Livraison) with truck, driver, and tonnage details.
- **Progress Monitoring**: Real-time tracking of delivered tonnage vs. target tonnage.

### 2.6. HQSE (Health, Quality, Safety, Environment)
- **Equipment Inventory**: Track safety gear and operational equipment.
- **Inspections**: Schedule and record equipment inspections with pass/fail verdicts.
- **Non-Conformities & Corrective Actions**: Log safety issues and track their resolution.
- **Safety Audits**: Conduct audits on employee equipment usage.
- **Signalements**: Report accidents, health issues, or environmental dangers.

### 2.7. Expenses & Accounting
- **Delivery Expenses**: Track road fees, fuel costs, and personal fees for every delivery.
- **General Expenses**: Log operational costs categorized by type, payment mode, and analytical code.
- **Financial Reporting**: Summarize costs by project, category, or time period.

### 2.8. Payroll Management
- **Personnel Records**: Manage employee data and job titles.
- **Contracts**: Define contract types (CDI, CDD, etc.) and base salaries.
- **Payroll Processing**: Calculate monthly gains and deductions to generate pay slips (Bulletins de Paie).

### 2.9. Administration & Settings
- **User Management**: Role-based access control (Admin, Manager, Driver).
- **Parameter Config**: Manage categories for expenses, payment modes, and geographic data.
- **System Settings**: Theme customization (Light/Dark) and language settings.

## 3. Data Models (Key Entities)
- **Project**: Represents a phase of operation with a total tonnage target.
- **Region/Department/Commune**: Geographic hierarchy for distribution.
- **Operator**: The destination entity (e.g., a cooperative or site) receiving resources.
- **Allocation**: A specific target assigned to an Operator for a Project.
- **Delivery (BL)**: A record of a single truckload delivered against an Allocation.
- **Truck/Driver**: The logistics units performing the deliveries.
- **Production**: Daily output from the source site.
- **Expense/Payment**: Financial records linked to operations.
- **HQSE Entities**: Equipment, Inspections, Non-Conformities, Audits, Signalements.
- **Payroll Entities**: Personnel, Contracts, Rubrics, Bulletins.

## 4. Technical Stack
- **Frontend**: React (TypeScript), Vite, Tailwind CSS, Lucide React (Icons), Framer Motion (Animations), Recharts (Charts).
- **Backend/Database**: Supabase (PostgreSQL) for data storage and authentication.
- **State Management**: React Hooks (useState, useMemo, useEffect) and Context API.
- **Deployment**: Render/Cloud Run (Containerized).

## 5. User Workflows

### 5.1. Operational Setup
1. Admin configures geographic data (Regions, Communes).
2. Admin registers Operators and Fleet (Trucks, Drivers).
3. Admin creates a new Project Phase and sets Allocations for Operators.

### 5.2. Daily Operations
1. Production team logs daily output.
2. Logistics team assigns trucks to Allocations.
3. Drivers/Operators log deliveries (BL) upon arrival.
4. Accounting logs expenses related to each trip.

### 5.3. Monitoring & Safety
1. Managers review the Dashboard and Global View for progress.
2. HQSE officers perform regular equipment inspections and safety audits.
3. Any incidents are reported via Signalements and tracked through Corrective Actions.

### 5.4. Month-End
1. Admin reviews all expenses and production data.
2. Payroll manager processes employee salaries and generates pay slips.

---

## 6. Guidelines for Rebuilding the App

### 6.1. Environment Setup
1. **Node.js**: Ensure Node.js 18+ is installed.
2. **Supabase**: Create a new Supabase project.
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.

### 6.2. Database Initialization
1. Execute SQL scripts to create tables for all entities defined in `types.ts`.
2. Set up Row Level Security (RLS) policies in Supabase to match the user roles (Admin, Manager, Driver).
3. Populate initial geographic data (Regions of Senegal/target area).

### 6.3. Frontend Implementation Priority
1. **Authentication**: Implement the Login page and AuthContext.
2. **Core Services**: Port the `services/db.ts` to handle Supabase interactions.
3. **Base Layout**: Implement the Sidebar and Navigation.
4. **Module 1: Logistics**: Fleet and Driver management.
5. **Module 2: Operations**: Projects, Allocations, and Deliveries.
6. **Module 3: Analytics**: Dashboard and Global View.
7. **Module 4: HQSE & Accounting**: Safety and Expense tracking.
8. **Module 5: Payroll**: HR and Salary processing.

### 6.4. Key Implementation Details
- **Data Fetching**: Use `useMemo` for heavy data transformations (e.g., building hierarchies).
- **Real-time**: Use Supabase real-time subscriptions for the Truck FIFO and Dashboard if needed.
- **Responsiveness**: Ensure all tables and cards use Tailwind's responsive classes.
- **Icons**: Strictly use `lucide-react`.
- **Animations**: Use `framer-motion` for page transitions and modals.
