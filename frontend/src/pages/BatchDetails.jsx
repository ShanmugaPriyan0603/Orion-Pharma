import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBatch } from '../context/BatchContext';
import MapView from '../components/MapView';
import TemperatureChart from '../components/TemperatureChart';
import TrustScoreCard from '../components/TrustScoreCard';
import AlertPanel from '../components/AlertPanel';
import Timeline from '../components/Timeline';
import SimulationControls from '../components/SimulationControls';
import { haversineDistanceKm } from '../utils/routePlanner';

const AVERAGE_ROAD_FACTOR = 1.25;
const AVERAGE_SPEED_KMPH = 70;

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';

  const totalMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

const BatchDetails = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { getBatchDetails, fetchBatches, deleteBatch } = useBatch();
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);

  const routeStats = batchData?.originCoordinates && batchData?.destinationCoordinates
    ? (() => {
        const directDistanceKm = haversineDistanceKm(batchData.originCoordinates, batchData.destinationCoordinates);
        const roadDistanceKm = directDistanceKm * AVERAGE_ROAD_FACTOR;
        const etaMinutes = (roadDistanceKm / AVERAGE_SPEED_KMPH) * 60;

        return {
          roadDistanceKm,
          etaMinutes
        };
      })()
    : null;

  const loadBatch = useCallback(async () => {
    const response = await getBatchDetails(batchId);
    setBatchData(response.data);
    return response.data;
  }, [batchId, getBatchDetails]);

  useEffect(() => {
    const loadBatchData = async () => {
      try {
        await loadBatch();
      } catch (error) {
        console.error('Failed to load batch:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBatchData();

    const interval = setInterval(async () => {
      try {
        await loadBatch();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadBatch]);

  const handleSimulationUpdate = async () => {
    await Promise.all([loadBatch(), fetchBatches()]);
  };

  const handleDeleteBatch = async () => {
    const confirmed = window.confirm(`Delete batch ${batchData.batchId}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteBatch(batchData.batchId);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete batch');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!batchData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-xl font-semibold">Batch Not Found</h2>
          <p className="text-gray-500 mt-1">The batch you're looking for doesn't exist</p>
          <Link to="/" className="inline-block mt-4 btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="nav-blur sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors text-sm">
                ← Back
              </Link>
              <div>
                <h1 className="text-lg font-semibold">{batchData.batchId}</h1>
                <p className="text-xs text-gray-500">{batchData.medicineName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDeleteBatch} className="btn-danger">
                Delete
              </button>
              <span className={`badge ${batchData.trustScore >= 80 ? 'badge-success' : batchData.trustScore >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                Score: {batchData.trustScore}
              </span>
              <span className={`badge ${batchData.status === 'delivered' ? 'badge-success' : batchData.status === 'compromised' ? 'badge-danger' : 'badge-info'}`}>
                {batchData.status}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Map & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="card">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Live Location Tracking</h3>
              <div className="h-72">
                <MapView
                  origin={batchData.origin}
                  destination={batchData.destination}
                  originCoordinates={batchData.originCoordinates}
                  destinationCoordinates={batchData.destinationCoordinates}
                  currentStage={batchData.currentStage}
                  stages={batchData.stages}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-4">Journey Timeline</h3>
              <Timeline
                stages={batchData.stages}
                currentStage={batchData.currentStage}
              />
            </div>

            {/* Temperature Chart */}
            <div className="card">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-4">Temperature History</h3>
              <div className="h-64">
                <TemperatureChart
                  temperatureHistory={batchData.temperatureHistory || []}
                  targetTempRange={batchData.targetTempRange || { min: 15, max: 30 }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Trust Score, Simulation, Alerts */}
          <div className="space-y-6">
            {/* Trust Score */}
            <TrustScoreCard score={batchData.trustScore} />

            {/* Batch Info */}
            <div className="card">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-4">Batch Information</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Origin</span>
                  <span className="font-medium">{batchData.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium">{batchData.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Road Distance</span>
                  <span className="font-medium">
                    {routeStats ? `${routeStats.roadDistanceKm.toFixed(1)} km` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ETA @ 70 km/h</span>
                  <span className="font-medium">
                    {routeStats ? formatDuration(routeStats.etaMinutes) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Stage</span>
                  <span className="font-medium capitalize">{batchData.currentStage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature</span>
                  <span className={`font-medium ${batchData.temperature > 30 || batchData.temperature < 15 ? 'text-red-500' : 'text-green-500'}`}>
                    {batchData.temperature}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Safe Range</span>
                  <span className="font-medium">{batchData.targetTempMin}°C - {batchData.targetTempMax}°C</span>
                </div>
                {batchData.blockchainHash && (
                  <>
                    <div className="divider"></div>
                    <div>
                      <span className="text-gray-500 text-xs">Blockchain Hash</span>
                      <p className="text-xs font-mono text-blue-500 mt-1 break-all">
                        {batchData.blockchainHash}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Simulation Controls */}
            <SimulationControls batchId={batchId} onUpdate={handleSimulationUpdate} />

            {/* Alerts */}
            <AlertPanel
              alerts={batchData.alerts || []}
              compact
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BatchDetails;
