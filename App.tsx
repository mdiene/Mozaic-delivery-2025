
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/allocations" element={<Allocations />} />
          
          {/* Logistics Routes */}
          <Route path="/logistics" element={<Navigate to="/logistics/dispatch" replace />} />
          <Route path="/logistics/fifo" element={<TruckFIFO />} />
          <Route path="/logistics/dispatch" element={<Logistics />} />
          <Route path="/logistics/expenses" element={<Expenses />} />
          
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/views" element={<Views />} />
          
          {/* Network Sub-routes */}
          <Route path="/network" element={<Navigate to="/network/map" replace />} />
          <Route path="/network/map" element={<NetworkPage />} />
          <Route path="/network/itinerary" element={<Itinerary />} />
          <Route path="/network/global" element={<GlobalView />} />
          
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
