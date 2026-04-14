import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBatch } from '../context/BatchContext';
import { batchAPI } from '../services/api';

const formatDateTime = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const getReachedPharmacyAt = (batch) => {
  const stages = batch.stages || [];
  const pharmacyStage = [...stages].reverse().find((stage) => stage.location === 'pharmacy');
  return pharmacyStage?.timestamp || batch.updatedAt || batch.createdAt || null;
};

const Inventory = () => {
  const { batches, loading } = useBatch();
  const [inventoryRows, setInventoryRows] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const deliveredBatches = useMemo(() => {
    return batches
      .filter((batch) => batch.status === 'delivered')
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [batches]);

  useEffect(() => {
    let isActive = true;

    const loadInventoryDetails = async () => {
      if (!deliveredBatches.length) {
        setInventoryRows([]);
        return;
      }

      setDetailsLoading(true);

      try {
        const results = await Promise.all(
          deliveredBatches.map(async (batch) => {
            try {
              const response = await batchAPI.getById(batch.batchId);
              return response.data.data;
            } catch {
              return batch;
            }
          })
        );

        if (!isActive) return;

        setInventoryRows(results);
      } finally {
        if (isActive) {
          setDetailsLoading(false);
        }
      }
    };

    loadInventoryDetails();

    return () => {
      isActive = false;
    };
  }, [deliveredBatches]);

  const rows = inventoryRows.length ? inventoryRows : deliveredBatches;

  return (
    <div className="min-h-screen bg-white">
      <nav className="nav-blur sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="text-2xl">💊</div>
              <span className="text-lg font-semibold tracking-tight">Orion-PharmaChain</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
              <Link to="/inventory" className="text-sm text-gray-900 font-medium">Inventory</Link>
              <Link to="/verify" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Verify</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="section pb-0">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="section-title">Inventory</h1>
          <p className="section-subtitle">Delivered batches currently available at the pharmacy.</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Delivered batches</p>
            <h2 className="text-2xl font-semibold mt-1">{deliveredBatches.length}</h2>
          </div>
          <div className="text-sm text-gray-500">
            Showing only batches with status <span className="font-medium text-gray-900">delivered</span>
          </div>
        </div>

        {loading && !batches.length ? (
          <div className="card empty-state">
            <div className="loading-spinner mx-auto"></div>
          </div>
        ) : deliveredBatches.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📦</div>
            <p className="empty-state-title">No delivered batches yet</p>
            <p className="empty-state-text">Once a batch reaches the pharmacy it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {detailsLoading && deliveredBatches.length > 0 && (
              <div className="text-sm text-gray-500 px-1">Loading inventory details...</div>
            )}
            {rows.map((batch) => (
              <div key={batch.batchId} className="card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold">{batch.batchId}</h3>
                      <span className="badge badge-success">Delivered</span>
                      <span className={`badge ${batch.trustScore >= 80 ? 'badge-success' : batch.trustScore >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                        Trust Score: {batch.trustScore}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{batch.medicineName}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Reached Pharmacy</p>
                        <p className="font-medium mt-1">YES</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Quantity in Stock</p>
                        <p className="font-medium mt-1">{batch.quantityInStock ?? batch.stockQuantity ?? 'Not synced'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Destination</p>
                        <p className="font-medium mt-1">{batch.destination}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Current Temperature</p>
                        <p className="font-medium mt-1">{batch.temperature}°C</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link to={`/batch/${batch.batchId}`} className="btn-secondary text-sm py-2 px-4">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Inventory;