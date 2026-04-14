import { useState } from 'react';
import { simulationAPI } from '../services/api';

const SimulationControls = ({ batchId, onUpdate }) => {
  const [loading, setLoading] = useState({});
  const [customTemp, setCustomTemp] = useState('');

  const handleSimulation = async (action, params = {}) => {
    if (!batchId) return;

    setLoading({ [action]: true });

    try {
      let response;
      switch (action) {
        case 'normal':
          response = await simulationAPI.temperature(batchId, {});
          break;
        case 'breach':
          response = await simulationAPI.temperature(batchId, { breach: true });
          break;
        case 'spike':
          response = await simulationAPI.spike(batchId);
          break;
        case 'location':
          response = await simulationAPI.location(batchId);
          break;
        case 'delay':
          response = await simulationAPI.delay(batchId);
          break;
        case 'custom':
          if (customTemp) {
            response = await simulationAPI.temperature(batchId, { value: parseFloat(customTemp) });
          }
          break;
        default:
          break;
      }

      if (response?.data) {
        await onUpdate?.(response.data);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      alert(error.response?.data?.error || 'Simulation failed');
    } finally {
      setLoading({ [action]: false });
    }
  };

  const handleCustomTemp = (e) => {
    e.preventDefault();
    if (customTemp) {
      handleSimulation('custom');
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Simulation Controls</h3>

      {/* Temperature Controls */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Temperature</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSimulation('normal')}
            disabled={loading.normal}
            className="simulation-btn"
          >
            {loading.normal ? <span className="animate-pulse-subtle">⏳</span> : '🌡️'} Normal
          </button>
          <button
            onClick={() => handleSimulation('breach')}
            disabled={loading.breach}
            className="simulation-btn simulation-btn-warning"
          >
            {loading.breach ? <span className="animate-pulse-subtle">⏳</span> : '⚠️'} Breach
          </button>
        </div>

        {/* Custom temperature */}
        <form onSubmit={handleCustomTemp} className="flex gap-2 mt-2">
          <input
            type="number"
            value={customTemp}
            onChange={(e) => setCustomTemp(e.target.value)}
            placeholder="Custom °C"
            className="input-field text-sm py-2"
          />
          <button
            type="submit"
            disabled={!customTemp || loading.custom}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          >
            Set
          </button>
        </form>
      </div>

      {/* Critical Actions */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Critical Events</p>
        <button
          onClick={() => handleSimulation('spike')}
          disabled={loading.spike}
          className="simulation-btn simulation-btn-critical w-full"
        >
          {loading.spike ? <span className="animate-pulse-subtle">⏳</span> : '🚨'} Temperature Spike (Critical)
        </button>
      </div>

      {/* Logistics Controls */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Logistics</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSimulation('location')}
            disabled={loading.location}
            className="simulation-btn"
          >
            {loading.location ? <span className="animate-pulse-subtle">⏳</span> : '📍'} Move Stage
          </button>
          <button
            onClick={() => handleSimulation('delay')}
            disabled={loading.delay}
            className="simulation-btn simulation-btn-warning"
          >
            {loading.delay ? <span className="animate-pulse-subtle">⏳</span> : '⏱️'} Simulate Delay
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500">
          💡 Use these controls to simulate real-world scenarios and observe how the system responds with trust score changes and alerts.
        </p>
      </div>
    </div>
  );
};

export default SimulationControls;
