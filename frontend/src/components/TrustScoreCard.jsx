const TrustScoreCard = ({ score = 100, showDetails = true }) => {
  const getStatus = (score) => {
    if (score >= 80) return { label: 'Safe', color: 'text-green-500', bg: 'bg-green-500', badge: 'badge-success' };
    if (score >= 50) return { label: 'Risky', color: 'text-orange-500', bg: 'bg-orange-500', badge: 'badge-warning' };
    return { label: 'Unsafe', color: 'text-red-500', bg: 'bg-red-500', badge: 'badge-danger' };
  };

  const status = getStatus(score);

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Trust Score</p>
          <p className={`text-4xl font-bold mt-1 ${status.color}`}>{score}</p>
        </div>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      {/* Gauge */}
      <div className="relative h-32 flex items-end justify-center mb-4">
        <svg viewBox="0 0 200 110" className="w-full max-w-[200px]">
          {/* Background arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#e5e5e5"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Colored segments */}
          <path
            d="M 10 100 A 90 90 0 0 1 55 25"
            fill="none"
            stroke="#ff3b30"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="100 300"
          />
          <path
            d="M 55 25 A 90 90 0 0 1 100 10"
            fill="none"
            stroke="#ff9500"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="50 350"
          />
          <path
            d="M 100 10 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#34c759"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="100 300"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 70 * Math.cos((((score - 0) / (100 - 0)) * 180 - 180) * Math.PI / 180)}
            y2={100 + 70 * Math.sin((((score - 0) / (100 - 0)) * 180 - 180) * Math.PI / 180)}
            stroke="#1d1d1f"
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          {/* Center point */}
          <circle cx="100" cy="100" r="8" fill="#1d1d1f" />
        </svg>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      {showDetails && (
        <>
          <div className="divider"></div>

          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Score Impact</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Temperature Breach</span>
              <span className="text-red-500 font-medium">-30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delay Event</span>
              <span className="text-red-500 font-medium">-20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Route Deviation</span>
              <span className="text-red-500 font-medium">-25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stability Bonus</span>
              <span className="text-green-500 font-medium">+2</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TrustScoreCard;
