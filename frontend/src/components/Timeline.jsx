const Timeline = ({ stages = [], currentStage }) => {
  const stageLabels = {
    manufacturer: 'Manufacturer',
    warehouse: 'Warehouse',
    distributor: 'Distributor',
    pharmacy: 'Pharmacy'
  };

  const stageIcons = {
    manufacturer: '🏭',
    warehouse: '📦',
    distributor: '🚚',
    pharmacy: '💊'
  };

  const stageOrder = ['manufacturer', 'warehouse', 'distributor', 'pharmacy'];
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div className="w-full">
      {/* Horizontal timeline */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / stageOrder.length) * 100}%` }}
          />
        </div>

        {/* Stage nodes */}
        <div className="relative flex justify-between">
          {stageOrder.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const stageData = stages.find(s => s.location === stage);

            return (
              <div key={stage} className="flex flex-col items-center">
                {/* Node */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? '✓' : stageIcons[stage]}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p className={`text-xs font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                    {stageLabels[stage]}
                  </p>
                  {stageData && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stageData.temperature?.toFixed(1)}°C
                    </p>
                  )}
                </div>

                {/* Status indicator */}
                {isCurrent && (
                  <div className="absolute -mt-10 animate-bounce">
                    <span className="text-xs">📍</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage details */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {stageOrder.map((stage) => {
          const stageData = stages.find(s => s.location === stage);
          const isCompleted = stageOrder.indexOf(stage) <= currentIndex;

          return (
            <div
              key={stage}
              className={`p-3 rounded-xl transition-all ${isCompleted
                ? 'bg-gray-50'
                : 'bg-gray-50/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{stageIcons[stage]}</span>
                <span className={`text-xs font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                  {stageLabels[stage]}
                </span>
              </div>
              {stageData ? (
                <div className="text-xs text-gray-500">
                  <p>Arrived: {new Date(stageData.timestamp).toLocaleDateString()}</p>
                  <p>Temp: {stageData.temperature?.toFixed(1)}°C</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Pending arrival</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
