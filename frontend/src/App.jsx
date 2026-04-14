import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BatchDetails from './pages/BatchDetails';
import ColdChain from './pages/ColdChain';
import Inventory from './pages/Inventory';
import Verify from './pages/Verify';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/cold-chain" element={<ColdChain />} />
      <Route path="/batch/:batchId" element={<BatchDetails />} />
      <Route path="/verify" element={<Verify />} />
    </Routes>
  );
}

export default App;
