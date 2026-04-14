import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TemperatureChart = ({ temperatureHistory = [], targetTempRange = { min: 15, max: 30 } }) => {
  const chartData = {
    labels: temperatureHistory.map((_, index) => {
      const time = new Date(temperatureHistory[index]?.timestamp || Date.now());
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: temperatureHistory.map(log => log.temperature),
        borderColor: temperatureHistory.map(log => {
          const temp = log.temperature;
          if (temp < targetTempRange.min || temp > targetTempRange.max) {
            return '#ff3b30';
          }
          if (temp < targetTempRange.min + 3 || temp > targetTempRange.max - 3) {
            return '#ff9500';
          }
          return '#34c759';
        }),
        backgroundColor: 'rgba(0, 113, 227, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: temperatureHistory.map(log => {
          const temp = log.temperature;
          if (temp < targetTempRange.min || temp > targetTempRange.max) {
            return '#ff3b30';
          }
          return '#0071e3';
        }),
        borderWidth: 2
      },
      {
        label: 'Min Safe Temp',
        data: temperatureHistory.map(() => targetTempRange.min),
        borderColor: '#ff9500',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Max Safe Temp',
        data: temperatureHistory.map(() => targetTempRange.max),
        borderColor: '#ff9500',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#86868b',
          font: { size: 11, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(29, 29, 31, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#f5f5f7',
        borderColor: '#d2d2d7',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        titleFont: { size: 13, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
        bodyFont: { size: 12, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
        cornerRadius: 10,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#f5f5f7',
          drawBorder: false
        },
        ticks: {
          color: '#86868b',
          font: { size: 10, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: '#f5f5f7',
          drawBorder: false
        },
        ticks: {
          color: '#86868b',
          font: { size: 10, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
          callback: (value) => `${value}°C`
        },
        min: Math.max(0, targetTempRange.min - 10),
        max: targetTempRange.max + 10
      }
    }
  };

  const currentTemp = temperatureHistory.length > 0
    ? temperatureHistory[temperatureHistory.length - 1].temperature
    : null;

  const avgTemp = temperatureHistory.length > 0
    ? temperatureHistory.reduce((sum, log) => sum + log.temperature, 0) / temperatureHistory.length
    : null;

  const inRange = currentTemp !== null &&
    currentTemp >= targetTempRange.min &&
    currentTemp <= targetTempRange.max;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 px-1">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
          <p className={`text-2xl font-bold mt-1 ${inRange ? 'text-green-500' : 'text-red-500'}`}>
            {currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Average</p>
          <p className="text-lg font-semibold mt-1 text-gray-900">
            {avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Safe Range</p>
          <p className="text-lg font-semibold mt-1 text-gray-900">
            {targetTempRange.min}°C - {targetTempRange.max}°C
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${inRange ? 'badge-success' : 'badge-danger'}`}>
            {inRange ? 'IN RANGE' : 'BREACH'}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default TemperatureChart;
