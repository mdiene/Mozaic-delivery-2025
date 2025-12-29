import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Allocations } from './pages/Allocations';
import { Logistics } from './pages/Logistics';
import { Fleet } from './pages/Fleet';
import { Settings } from './pages/Settings';
import { Views } from './pages/Views';
import { NetworkPage } from './pages/Network';
import { Itinerary } from './pages/Itinerary';
import { GlobalView } from './pages/GlobalView';
import { Expenses } from './pages/Expenses';
import { TruckFIFO } from './pages/TruckFIFO';
import { ProductionPage } from './pages/Production';
import { ProductionPurchases } from './pages/ProductionPurchases';
import { ProductionScreening } from './pages/ProductionScreening';
import { ProductionExcavation } from './pages/ProductionExcavation';
import { Login } from './pages/Login';
import { useAuth } from './contexts/AuthContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles = ['ADMIN'] }: { children?: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if role is allowed
  if (user && !allowedRoles.includes(user.role as string)) {
    // If driver and tries to access something else, send back to FIFO
    if (user.role === 'DRIVER') {
       return <Navigate to="/logistics/fifo" replace />;
    }
    // If manager and tries to access forbidden area, send to FIFO or Reports
    if (user.role === 'MANAGER') {
       return <Navigate to="/logistics/fifo" replace />;
    }
    // General fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Main App Container */}
        <Route path="/" element={<Layout />}>
          {/* Dashboard is for Admin and Visitor */}
          <Route index element={
            <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="allocations" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
              <Allocations />
            </ProtectedRoute>
          } />
          
          <Route path="production">
            <Route index element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <ProductionPage />
              </ProtectedRoute>
            } />
            <Route path="purchases" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <ProductionPurchases />
              </ProtectedRoute>
            } />
            <Route path="screening" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <ProductionScreening />
              </ProtectedRoute>
            } />
            <Route path="excavation" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <ProductionExcavation />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Logistics Routes */}
          <Route path="logistics">
            <Route index element={<Navigate to="/logistics/fifo" replace />} />
            
            {/* FIFO is accessible to all roles */}
            <Route path="fifo" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DRIVER', 'VISITOR']}>
                <TruckFIFO />
              </ProtectedRoute>
            } />
            
            {/* Dispatch is ADMIN and VISITOR */}
            <Route path="dispatch" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
                <Logistics />
              </ProtectedRoute>
            } />
            
            {/* Expenses is ADMIN, MANAGER, VISITOR */}
            <Route path="expenses" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <Expenses />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="fleet" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
              <Fleet />
            </ProtectedRoute>
          } />
          
          {/* Reports */}
          <Route path="views" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
              <Views />
            </ProtectedRoute>
          } />
          
          <Route path="network">
            <Route index element={<Navigate to="/network/itinerary" replace />} />
            <Route path="map" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
                <NetworkPage />
              </ProtectedRoute>
            } />
            <Route path="itinerary" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'VISITOR']}>
                <Itinerary />
              </ProtectedRoute>
            } />
            <Route path="global" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
                <GlobalView />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']}>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;