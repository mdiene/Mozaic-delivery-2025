
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
          {/* Dashboard is only for Admin */}
          <Route index element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="allocations" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Allocations />
            </ProtectedRoute>
          } />
          
          <Route path="production" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ProductionPage />
            </ProtectedRoute>
          } />
          
          {/* Logistics Routes */}
          <Route path="logistics">
            <Route index element={<Navigate to="/logistics/fifo" replace />} />
            
            {/* FIFO is accessible to all roles */}
            <Route path="fifo" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DRIVER']}>
                <TruckFIFO />
              </ProtectedRoute>
            } />
            
            {/* Dispatch is ADMIN only */}
            <Route path="dispatch" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Logistics />
              </ProtectedRoute>
            } />
            
            {/* Expenses is ADMIN and MANAGER */}
            <Route path="expenses" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <Expenses />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="fleet" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Fleet />
            </ProtectedRoute>
          } />
          
          {/* Reports: BL is for Manager, Fin de Cession usually Admin only but we allow the page for both and filter inside */}
          <Route path="views" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Views />
            </ProtectedRoute>
          } />
          
          <Route path="network">
            <Route index element={<Navigate to="/network/itinerary" replace />} />
            <Route path="map" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <NetworkPage />
              </ProtectedRoute>
            } />
            <Route path="itinerary" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <Itinerary />
              </ProtectedRoute>
            } />
            <Route path="global" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GlobalView />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
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
