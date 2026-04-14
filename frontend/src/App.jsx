import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BatchDetails from './pages/BatchDetails';
import Verify from './pages/Verify';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/batch/:batchId" element={<BatchDetails />} />
      <Route path="/verify" element={<Verify />} />
    </Routes>
  );
}

export default App;
