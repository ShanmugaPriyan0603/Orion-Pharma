import { useState } from 'react';

const AlertPanel = ({ alerts = [], onResolve, compact = false }) => {
  const [filter, setFilter] = useState('all');

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      temperature_breach: 'Temperature Breach',
      predicted_breach: 'Predicted Breach',
      delay: 'Delay',
      route_deviation: 'Route Deviation',
      trust_critical: 'Trust Critical'
    };
    return labels[type] || type;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.resolved;
    if (filter === 'resolved') return alert.resolved;
    return true;
  });

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && a.severity === 'critical').length;

  if (compact) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Active Alerts</h3>
          <span className={`badge ${activeCount > 0 ? 'badge-danger' : 'badge-info'}`}>
            {activeCount}
          </span>
        </div>

        {activeCount === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-gray-500 mt-2">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.filter(a => !a.resolved).slice(0, 5).map((alert, index) => (
              <div
                key={alert.id || index}
                className={`alert ${alert.severity === 'critical' ? 'alert-critical' : alert.severity === 'high' ? 'alert-warning' : 'alert-info'}`}
              >
                <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getTypeLabel(alert.type)}</p>
                  <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Alert Feed</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'active' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <div className="alert alert-critical mb-4">
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-600">Critical Alerts Active</p>
            <p className="text-xs text-red-500 mt-0.5">{criticalCount} critical alert{criticalCount > 1 ? 's' : ''} require immediate attention</p>
          </div>
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">📭</span>
            <p className="text-sm text-gray-500 mt-2">No alerts to display</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={alert.id || index}
              className={`alert ${alert.severity === 'critical' ? 'alert-critical' : alert.severity === 'high' ? 'alert-warning' : 'alert-info'} ${alert.resolved ? 'opacity-50' : ''}`}
            >
              <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">{getTypeLabel(alert.type)}</span>
                  {alert.resolved && (
                    <span className="badge badge-success text-xs py-0.5 px-2">Resolved</span>
                  )}
                </div>
                <p className="text-sm">{alert.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  {alert.batchId && (
                    <span>Batch: {alert.batchId}</span>
                  )}
                </div>
              </div>
              {!alert.resolved && onResolve && (
                <button
                  onClick={() => onResolve(alert.id)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
