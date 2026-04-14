import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBatch } from '../context/BatchContext';
import MapView from '../components/MapView';
import TrustScoreCard from '../components/TrustScoreCard';
import AlertPanel from '../components/AlertPanel';
import SimulationControls from '../components/SimulationControls';
import LocationAutocomplete from '../components/LocationAutocomplete';

const Dashboard = () => {
  const { batches, alerts, loading, createBatch, fetchBatches } = useBatch();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [formData, setFormData] = useState({
    batchId: '',
    medicineName: '',
    origin: '',
    destination: '',
    originCoordinates: null,
    destinationCoordinates: null,
    quantityInStock: '',
    temperature: 22
  });

  const activeAlertBatchIds = useMemo(
    () => new Set(alerts.filter((alert) => !alert.resolved).map((alert) => alert.batchId)),
    [alerts]
  );

  const filteredBatches = useMemo(() => {
    if (activeFilter === 'all') return batches;
    if (activeFilter === 'alerts') {
      return batches.filter((batch) => activeAlertBatchIds.has(batch.batchId));
    }
    if (activeFilter === 'in-transit') {
      return batches.filter((batch) => batch.status === 'in-transit');
    }
    if (activeFilter === 'delivered') {
      return batches.filter((batch) => batch.status === 'delivered');
    }
    return batches;
  }, [activeAlertBatchIds, activeFilter, batches]);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.originCoordinates || !formData.destinationCoordinates) {
      alert('Please choose origin and destination from search suggestions.');
      return;
    }

    try {
      await createBatch(formData);
      setShowCreateForm(false);
      setFormData({
        batchId: '',
        medicineName: '',
        origin: '',
        destination: '',
        originCoordinates: null,
        destinationCoordinates: null,
        quantityInStock: '',
        temperature: 22
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create batch');
    }
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
  };

  const handleSimulationUpdate = () => {
    fetchBatches();
    if (selectedBatch) {
      // Refresh selected batch data
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="nav-blur sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="text-2xl">💊</div>
              <span className="text-lg font-semibold tracking-tight">Orion-PharmaChain</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-900 font-medium">Dashboard</Link>
              <Link to="/inventory" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Inventory</Link>
              <Link to="/verify" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Verify</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="section pb-0">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="section-title">Supply Chain Intelligence</h1>
          <p className="section-subtitle">Real-time monitoring, predictive analytics, and blockchain verification for pharmaceutical shipments.</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setActiveFilter('all')}
            className={`stat-card text-left ${activeFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="stat-label">Total Batches</p>
            <p className="stat-value mt-2">{batches.length}</p>
          </button>
          <button
            onClick={() => setActiveFilter('alerts')}
            className={`stat-card text-left ${activeFilter === 'alerts' ? 'ring-2 ring-red-500' : ''}`}
          >
            <p className="stat-label">Active Alerts</p>
            <p className="stat-value mt-2 text-red-500">{alerts.filter(a => !a.resolved).length}</p>
          </button>
          <button
            onClick={() => setActiveFilter('in-transit')}
            className={`stat-card text-left ${activeFilter === 'in-transit' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="stat-label">In Transit</p>
            <p className="stat-value mt-2 text-blue-500">{batches.filter(b => b.status === 'in-transit').length}</p>
          </button>
          <button
            onClick={() => setActiveFilter('delivered')}
            className={`stat-card text-left ${activeFilter === 'delivered' ? 'ring-2 ring-green-500' : ''}`}
          >
            <p className="stat-label">Delivered</p>
            <p className="stat-value mt-2 text-green-500">{batches.filter(b => b.status === 'delivered').length}</p>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Batches */}
          <div className="lg:col-span-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Batches</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="btn-primary text-sm py-2 px-4"
              >
                New Batch
              </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreate} className="card bg-gray-50 mb-4 space-y-4">
                <input
                  type="text"
                  placeholder="Batch ID"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value.toUpperCase() })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="Medicine Name"
                  value={formData.medicineName}
                  onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                  className="input-field"
                  required
                />
                <LocationAutocomplete
                  id="origin"
                  label="Origin"
                  placeholder="Search origin city"
                  value={formData.origin}
                  onChange={(value) => setFormData({ ...formData, origin: value, originCoordinates: null })}
                  onSelect={(location) => setFormData((prev) => ({
                    ...prev,
                    origin: location.display || location.name,
                    originCoordinates: { lat: location.lat, lng: location.lng }
                  }))}
                  required
                />
                <LocationAutocomplete
                  id="destination"
                  label="Destination"
                  placeholder="Search destination city"
                  value={formData.destination}
                  onChange={(value) => setFormData({ ...formData, destination: value, destinationCoordinates: null })}
                  onSelect={(location) => setFormData((prev) => ({
                    ...prev,
                    destination: location.display || location.name,
                    destinationCoordinates: { lat: location.lat, lng: location.lng }
                  }))}
                  required
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Quantity in Stock"
                  value={formData.quantityInStock}
                  onChange={(e) => setFormData({ ...formData, quantityInStock: e.target.value })}
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 text-sm py-2">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary text-sm py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Batches List */}
            <div className="space-y-2">
              {loading && !batches.length ? (
                <div className="empty-state">
                  <div className="loading-spinner mx-auto"></div>
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <p className="empty-state-title">No batches</p>
                  <p className="empty-state-text">Create your first batch to get started</p>
                </div>
              ) : (
                filteredBatches.map((batch) => (
                  <button
                    key={batch.batchId}
                    onClick={() => handleBatchSelect(batch)}
                    className={`w-full card text-left ${selectedBatch?.batchId === batch.batchId ? 'ring-2 ring-blue-500' : ''} card-hover`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-base">{batch.batchId}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{batch.medicineName}</p>
                      </div>
                      <span className={`badge ${batch.trustScore >= 80 ? 'badge-success' : batch.trustScore >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                        {batch.trustScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                      <span className="capitalize">{batch.currentStage}</span>
                      <span>{batch.temperature}°C</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Middle & Right Columns */}
          <div className="lg:col-span-2 space-y-6">
            {selectedBatch ? (
              <>
                {/* Map */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedBatch.batchId}</h3>
                      <p className="text-sm text-gray-500">{selectedBatch.medicineName}</p>
                    </div>
                    <Link to={`/batch/${selectedBatch.batchId}`} className="btn-secondary text-sm py-2 px-4">
                      View Details
                    </Link>
                  </div>
                  <div className="h-64 mb-4">
                    <MapView
                      currentStage={selectedBatch.currentStage}
                      stages={selectedBatch.stages}
                      origin={selectedBatch.origin}
                      destination={selectedBatch.destination}
                      originCoordinates={selectedBatch.originCoordinates}
                      destinationCoordinates={selectedBatch.destinationCoordinates}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                      <p className={`text-xl font-semibold mt-1 ${selectedBatch.temperature > 30 || selectedBatch.temperature < 15 ? 'text-red-500' : 'text-green-500'}`}>
                        {selectedBatch.temperature}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                      <p className="text-lg font-semibold mt-1 capitalize">{selectedBatch.currentStage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <p className={`text-lg font-semibold mt-1 capitalize ${selectedBatch.status === 'delivered' ? 'text-green-500' : selectedBatch.status === 'compromised' ? 'text-red-500' : 'text-blue-500'}`}>
                        {selectedBatch.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulation Controls */}
                <SimulationControls batchId={selectedBatch.batchId} onUpdate={handleSimulationUpdate} />

                {/* Alerts */}
                <AlertPanel alerts={alerts} compact={false} />
              </>
            ) : (
              <div className="card empty-state">
                <div className="empty-state-icon">🗺️</div>
                <h3 className="text-lg font-semibold">Select a batch</h3>
                <p className="text-gray-500 mt-1">Choose a batch to view its details and run simulations</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
