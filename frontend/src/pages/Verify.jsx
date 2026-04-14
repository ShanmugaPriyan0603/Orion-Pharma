import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBatch } from '../context/BatchContext';
import TrustScoreCard from '../components/TrustScoreCard';
import Timeline from '../components/Timeline';
import TemperatureChart from '../components/TemperatureChart';

const Verify = () => {
  const { verifyBatch } = useBatch();
  const [batchId, setBatchId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!batchId.trim()) return;

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const response = await verifyBatch(batchId.trim());
      setVerificationResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Batch not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="nav-blur sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="text-2xl">💊</div>
              <div>
                <span className="text-lg font-semibold">PharmaChain</span>
                <p className="text-xs text-gray-500">Verification Portal</p>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
              <Link to="/verify" className="text-sm text-gray-900 font-medium">Verify</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="section-title text-3xl md:text-4xl">Verify Medicine Authenticity</h1>
          <p className="section-subtitle text-gray-500 mt-3">
            Enter a batch ID to verify the authenticity and safety of your pharmaceutical product
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleVerify} className="mb-10">
          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value.toUpperCase())}
              placeholder="Enter Batch ID (e.g., BATCH001)"
              className="input-field flex-1 text-base"
            />
            <button
              type="submit"
              disabled={loading || !batchId.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="alert alert-critical max-w-xl mx-auto">
            <span className="text-xl">❌</span>
            <div>
              <p className="text-sm font-medium text-red-600">{error}</p>
              <p className="text-xs text-red-500 mt-0.5">Please check the batch ID and try again</p>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Banner */}
            <div className={`card border-2 ${verificationResult.trustStatus === 'SAFE'
              ? 'border-green-500 bg-green-50'
              : verificationResult.trustStatus === 'RISKY'
                ? 'border-orange-500 bg-orange-50'
                : 'border-red-500 bg-red-50'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Verification Status</p>
                  <p className={`text-2xl font-bold mt-1 ${verificationResult.trustStatus === 'SAFE'
                    ? 'text-green-600'
                    : verificationResult.trustStatus === 'RISKY'
                      ? 'text-orange-600'
                      : 'text-red-600'
                    }`}>
                    {verificationResult.trustStatus === 'SAFE' ? '✅ Verified Safe' :
                      verificationResult.trustStatus === 'RISKY' ? '⚠️ Use Caution' :
                        '🚨 Potentially Compromised'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Trust Score</p>
                  <p className={`text-4xl font-bold mt-1 ${verificationResult.trustScore >= 80
                    ? 'text-green-500'
                    : verificationResult.trustScore >= 50
                      ? 'text-orange-500'
                      : 'text-red-500'
                    }`}>
                    {verificationResult.trustScore}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="card">
              <h3 className="text-sm font-semibold mb-4">Product Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Batch ID</p>
                  <p className="font-mono text-base mt-0.5">{verificationResult.batchId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Medicine</p>
                  <p className="font-medium mt-0.5">{verificationResult.medicineName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Origin</p>
                  <p className="font-medium mt-0.5">{verificationResult.origin}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Destination</p>
                  <p className="font-medium mt-0.5">{verificationResult.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Current Location</p>
                  <p className="font-medium capitalize mt-0.5">{verificationResult.currentStage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                  <p className={`font-semibold mt-0.5 ${verificationResult.temperature > verificationResult.targetTempRange.max || verificationResult.temperature < verificationResult.targetTempRange.min
                    ? 'text-red-500'
                    : 'text-green-500'
                  }`}>
                    {verificationResult.temperature}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Blockchain Verification */}
            {verificationResult.verified && (
              <div className="card bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔗</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-700">Blockchain Verified</p>
                    <p className="text-xs text-blue-600 mt-1">
                      This batch has been recorded on the blockchain for tamper-proof verification
                    </p>
                    <p className="text-xs font-mono text-blue-600 mt-2 break-all">
                      Hash: {verificationResult.blockchainHash}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Journey Timeline */}
            <div className="card">
              <h3 className="text-sm font-semibold mb-4">Journey History</h3>
              <Timeline
                stages={verificationResult.journey.map(j => ({
                  location: j.location,
                  timestamp: j.timestamp,
                  temperature: j.temperature
                }))}
                currentStage={verificationResult.currentStage}
              />
            </div>

            {/* Active Alerts */}
            {verificationResult.activeAlerts > 0 && (
              <div className="alert alert-critical">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-600">{verificationResult.activeAlerts} Active Alert(s)</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    This batch has unresolved alerts. Exercise caution when handling this product.
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card text-center">
                <p className="stat-label">Total Logs</p>
                <p className="stat-value mt-1">{verificationResult.totalLogs}</p>
              </div>
              <div className="stat-card text-center">
                <p className="stat-label">Journey Stages</p>
                <p className="stat-value mt-1">{verificationResult.journey.length}</p>
              </div>
              <div className="stat-card text-center">
                <p className="stat-label">Safe Range</p>
                <p className="stat-value mt-1 text-base">{verificationResult.targetTempRange.min}°C - {verificationResult.targetTempRange.max}°C</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!verificationResult && !error && (
          <div className="text-center py-16">
            <div className="empty-state-icon">🔍</div>
            <h3 className="text-lg font-semibold">Enter a Batch ID to Verify</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Our verification system checks blockchain records, temperature history, and trust score to ensure product authenticity
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>PharmaChain Intelligence System — Ensuring pharmaceutical supply chain integrity</p>
          <p className="mt-1 text-xs">Powered by blockchain technology for tamper-proof verification</p>
        </div>
      </footer>
    </div>
  );
};

export default Verify;
