import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useBatch } from '../context/BatchContext';
import MapView from '../components/MapView';
import Timeline from '../components/Timeline';
import { alertAPI, batchAPI, simulationAPI } from '../services/api';

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

const COLD_CHAIN_RANGE = { min: 2, max: 8 };
const STAGE_ORDER = ['manufacturer', 'warehouse', 'distributor', 'pharmacy'];
const STAGE_LABELS = {
  manufacturer: 'Manufacturing',
  warehouse: 'Warehouse',
  distributor: 'Distribution',
  pharmacy: 'Pharmacy'
};
const STAGE_GROUPS = {
  transport: ['warehouse', 'distributor'],
  storage: ['manufacturer', 'pharmacy']
};
const FLEET_COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5ac8fa'];

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return 'Not available';
  const rounded = Math.max(1, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

const normalizeHistory = (history = []) => {
  return [...history]
    .filter((entry) => entry && entry.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const getTargetRange = (batch) => {
  const min = Number(batch?.targetTempMin);
  const max = Number(batch?.targetTempMax);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return min <= max ? { min, max } : { min: max, max: min };
  }

  return COLD_CHAIN_RANGE;
};

const formatRange = (range) => `${range.min}°C - ${range.max}°C`;

const getTemperatureStatus = (temperature, range = COLD_CHAIN_RANGE) => {
  if (!Number.isFinite(temperature)) {
    return { label: 'No data', tone: 'warning', color: 'text-gray-500' };
  }

  if (temperature < range.min || temperature > range.max) {
    if (
      temperature >= range.min - 0.5 &&
      temperature <= range.max + 0.5
    ) {
      return { label: 'Warning', tone: 'warning', color: 'text-orange-500' };
    }

    return { label: 'Excursion', tone: 'critical', color: 'text-red-600' };
  }

  if (
    temperature <= range.min + 0.5 ||
    temperature >= range.max - 0.5
  ) {
    return { label: 'Warning', tone: 'warning', color: 'text-orange-500' };
  }

  return { label: 'Safe', tone: 'safe', color: 'text-green-600' };
};

const getRiskLabel = (score) => {
  if (score >= 80) return { label: 'Low', tone: 'safe' };
  if (score >= 60) return { label: 'Medium', tone: 'warning' };
  return { label: 'High', tone: 'critical' };
};

const getCorrectiveAction = (alert) => {
  switch (alert.type) {
    case 'temperature_breach':
      return 'Inspect packaging, move stock to cold storage, and verify sensor calibration.';
    case 'predicted_breach':
      return 'Reroute shipment, increase cooling support, and monitor readings every 5 minutes.';
    case 'delay':
      return 'Review transfer time, reseal cargo, and confirm next-hand-off temperature stability.';
    case 'route_deviation':
      return 'Confirm GPS route, check driver notes, and validate route integrity.';
    case 'trust_critical':
      return 'Hold product release until QA and compliance review are complete.';
    default:
      return 'Review shipment conditions and document corrective action.';
  }
};

const downloadTextFile = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const escapeCsv = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
};

const calculateStageSummaries = (batch) => {
  const stages = normalizeHistory(batch.stages || []);
  const temperatureHistory = normalizeHistory(batch.temperatureHistory || []);
  const targetRange = getTargetRange(batch);

  return STAGE_ORDER.map((stage, index) => {
    const stageEntry = stages.find((entry) => entry.location === stage);
    const nextEntry = stages[index + 1];

    if (!stageEntry) {
      return {
        stage,
        label: STAGE_LABELS[stage],
        hasData: false,
        duration: 'Pending',
        min: null,
        max: null,
        average: null,
        excursionCount: 0,
        timestamp: null
      };
    }

    const start = new Date(stageEntry.timestamp);
    const end = nextEntry ? new Date(nextEntry.timestamp) : new Date();
    const durationMinutes = (end - start) / 60000;
    const readings = temperatureHistory.filter((entry) => {
      const readingTime = new Date(entry.timestamp);
      return readingTime >= start && readingTime <= end;
    });
    const temperatures = readings.length
      ? readings.map((entry) => entry.temperature)
      : [stageEntry.temperature].filter((value) => Number.isFinite(value));

    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    const average = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;
    const excursionCount = temperatures.filter(
      (value) => value < targetRange.min || value > targetRange.max
    ).length;

    return {
      stage,
      label: STAGE_LABELS[stage],
      hasData: true,
      duration: formatDuration(durationMinutes),
      min: min.toFixed(1),
      max: max.toFixed(1),
      average: average.toFixed(1),
      excursionCount,
      timestamp: stageEntry.timestamp
    };
  });
};

const calculateBatchCompliance = (batch) => {
  const history = normalizeHistory(batch?.temperatureHistory || []);

  if (!history.length) {
    return 100;
  }

  const targetRange = getTargetRange(batch);
  const safeReadings = history.filter(
    (entry) => entry.temperature >= targetRange.min && entry.temperature <= targetRange.max
  ).length;

  if (safeReadings === history.length) {
    return 100;
  }

  const rangeWidth = Math.max(1, targetRange.max - targetRange.min);
  const excursionPenalty = history.reduce((sum, entry) => {
    if (entry.temperature < targetRange.min) {
      return sum + ((targetRange.min - entry.temperature) / rangeWidth) * 30;
    }

    if (entry.temperature > targetRange.max) {
      return sum + ((entry.temperature - targetRange.max) / rangeWidth) * 30;
    }

    return sum;
  }, 0);

  const volatilityPenalty = history.slice(1).reduce((sum, entry, index) => {
    const previousTemperature = history[index].temperature;
    return sum + (Math.abs(entry.temperature - previousTemperature) / rangeWidth) * 10;
  }, 0);

  const safeRatio = safeReadings / history.length;
  const score = (safeRatio * 100) - excursionPenalty - volatilityPenalty;

  return Math.max(0, Math.min(100, score));
};

const buildSelectedChartData = (batch) => {
  const history = normalizeHistory(batch?.temperatureHistory || []);
  const targetRange = getTargetRange(batch);
  const labels = history.map((entry) => new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }));
  const temperatures = history.map((entry) => entry.temperature);
  const pointColors = temperatures.map((temperature) => {
    if (temperature < targetRange.min || temperature > targetRange.max) {
      return '#ff3b30';
    }
    if (temperature <= targetRange.min + 0.5 || temperature >= targetRange.max - 0.5) {
      return '#ff9500';
    }
    return '#34c759';
  });

  return {
    labels,
    datasets: [
      {
        label: `Safe Min ${targetRange.min}°C`,
        data: labels.map(() => targetRange.min),
        borderColor: 'rgba(52, 199, 89, 0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      },
      {
        label: `Safe Max ${targetRange.max}°C`,
        data: labels.map(() => targetRange.max),
        borderColor: 'rgba(52, 199, 89, 0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(52, 199, 89, 0.08)'
      },
      {
        label: batch ? `${batch.batchId} Temperature` : 'Temperature',
        data: temperatures,
        borderColor: '#0071e3',
        backgroundColor: 'rgba(0, 113, 227, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: pointColors,
        borderWidth: 2,
        spanGaps: true
      }
    ]
  };
};

const alignSeriesToLength = (values, totalLength) => {
  const aligned = new Array(totalLength).fill(null);
  const startIndex = Math.max(0, totalLength - values.length);

  values.forEach((value, index) => {
    aligned[startIndex + index] = value;
  });

  return aligned;
};

const buildFleetChartData = (batches) => {
  const normalizedSeries = batches.map((batch) => ({
    batchId: batch.batchId,
    temperatures: normalizeHistory(batch.temperatureHistory || []).map((entry) => entry.temperature)
  }));
  const maxLength = Math.max(0, ...normalizedSeries.map((series) => series.temperatures.length));
  const labels = Array.from({ length: maxLength }, (_, index) => `Reading ${index + 1}`);

  return {
    labels,
    datasets: [
      {
        label: 'Safe Min 2°C',
        data: labels.map(() => COLD_CHAIN_RANGE.min),
        borderColor: 'rgba(52, 199, 89, 0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Safe Max 8°C',
        data: labels.map(() => COLD_CHAIN_RANGE.max),
        borderColor: 'rgba(52, 199, 89, 0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(52, 199, 89, 0.08)'
      },
      ...normalizedSeries.map((series, index) => ({
        label: series.batchId,
        data: alignSeriesToLength(series.temperatures, maxLength),
        borderColor: FLEET_COLORS[index % FLEET_COLORS.length],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        spanGaps: true
      }))
    ]
  };
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
};

const buildTemperatureHistoryReport = (batches, scopeLabel) => {
  const rows = [
    ['Batch ID', 'Drug Name', 'Timestamp', 'Temperature (C)', 'Status', 'Trust Score']
  ];

  batches.forEach((batch) => {
    normalizeHistory(batch.temperatureHistory || []).forEach((entry) => {
      rows.push([
        batch.batchId,
        batch.medicineName,
        formatDateTime(entry.timestamp),
        entry.temperature,
        batch.status,
        batch.trustScore
      ]);
    });
  });

  return {
    filename: `cold-chain-temperature-history-${scopeLabel}.csv`,
    rows
  };
};

const buildExcursionInvestigationReport = (alerts, batches, scopeLabel) => {
  const batchLookup = new Map(batches.map((batch) => [batch.batchId, batch]));
  const rows = [['Batch ID', 'Drug Name', 'Alert Type', 'Severity', 'Message', 'Corrective Action', 'Created At']];

  alerts.forEach((alert) => {
    const batch = batchLookup.get(alert.batchId);
    rows.push([
      alert.batchId,
      batch?.medicineName || alert.medicineName || 'Unknown',
      alert.type,
      alert.severity,
      alert.message,
      getCorrectiveAction(alert),
      formatDateTime(alert.createdAt)
    ]);
  });

  return {
    filename: `cold-chain-excursion-investigation-${scopeLabel}.csv`,
    rows
  };
};

const buildCertificateText = (batches, selectedBatch, complianceRate, riskLevel) => {
  const batchList = batches.map((batch) => `- ${batch.batchId} (${batch.medicineName})`).join('\n');
  return [
    'Cold Chain Certificate',
    '======================',
    `Scope: ${selectedBatch ? selectedBatch.batchId : 'Fleet overview'}`,
    `Compliance Rate: ${complianceRate.toFixed(1)}%`,
    `Risk Level: ${riskLevel.label}`,
    '',
    'Delivered / Monitored Shipments',
    batchList || '- None',
    '',
    'Audit Note',
    '21 CFR Part 11-style audit readiness is supported by immutable batch logs and blockchain hash recording.'
  ].join('\n');
};

const deriveFailurePoint = (stage) => {
  if (STAGE_GROUPS.transport.includes(stage)) return 'Transport';
  if (STAGE_GROUPS.storage.includes(stage)) return 'Storage';
  return 'Unknown';
};

const ColdChain = () => {
  const { batches, alerts: activeContextAlerts, loading, fetchBatches, fetchAlerts } = useBatch();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [chartMode, setChartMode] = useState('selected');
  const [detailedBatches, setDetailedBatches] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Ensure batches are loaded on mount
  useEffect(() => {
    if (!batches || batches.length === 0) {
      console.log('Fetching batches from backend...');
      fetchBatches();
    }
  }, []);

  // Include in-transit AND delivered batches for comprehensive cold chain monitoring
  const monitoredBatches = useMemo(
    () => batches.filter((batch) => batch && batch.batchId && (batch.status === 'in-transit' || batch.status === 'delivered' || !batch.status)),
    [batches]
  );

  const selectedBatch = useMemo(() => {
    if (selectedBatchId && detailedBatches.length > 0) {
      const found = detailedBatches.find((batch) => batch.batchId === selectedBatchId);
      if (found) return found;
    }
    return detailedBatches[0] || null;
  }, [detailedBatches, selectedBatchId]);
  
  const selectedRange = useMemo(() => getTargetRange(selectedBatch), [selectedBatch]);

  // Auto-select first batch on mount or when list changes
  useEffect(() => {
    if (monitoredBatches.length === 0) {
      setSelectedBatchId('');
      return;
    }
    
    if (!selectedBatchId && monitoredBatches[0]) {
      setSelectedBatchId(monitoredBatches[0].batchId);
    }
  }, [monitoredBatches]);

  useEffect(() => {
    let active = true;

    const loadColdChainData = async () => {
      if (!monitoredBatches.length) {
        setDetailedBatches([]);
        setActiveAlerts([]);
        setResolvedAlerts([]);
        setLoadingDetails(false);
        return;
      }

      setLoadingDetails(true);
      console.log(`Loading cold chain data for ${monitoredBatches.length} batches`);

      try {
        const [batchResults, activeAlertResponse, resolvedAlertResponse] = await Promise.all([
          Promise.all(
            monitoredBatches.map(async (batch) => {
              try {
                const [detailsResponse, predictionResponse] = await Promise.all([
                  batchAPI.getById(batch.batchId),
                  simulationAPI.predict(batch.batchId).catch(() => ({ data: { data: null } }))
                ]);

                const details = detailsResponse?.data?.data || batch;
                const prediction = predictionResponse?.data?.data || null;
                const normalizedStages = (details.stages || batch.stages || []).filter(s => s && s.timestamp);
                const normalizedHistory = (details.temperatureHistory || batch.temperatureHistory || []).filter(h => h && h.timestamp);

                console.log(`Loaded batch ${batch.batchId}: ${normalizedHistory.length} temp readings, ${normalizedStages.length} stages`);

                return {
                  ...batch,
                  ...details,
                  stages: normalizedStages,
                  temperatureHistory: normalizedHistory,
                  prediction,
                  reachedPharmacyAt: normalizedStages.find((stage) => stage.location === 'pharmacy')?.timestamp || null
                };
              } catch (error) {
                console.warn(`Error loading batch details for ${batch.batchId}:`, error.message);
                return {
                  ...batch,
                  temperatureHistory: batch.temperatureHistory || [],
                  stages: batch.stages || [],
                  prediction: null,
                  reachedPharmacyAt: null
                };
              }
            })
          ),
          alertAPI.getAll({ resolved: 'false', limit: 200 }).catch(() => ({ data: { data: [] } })),
          alertAPI.getAll({ resolved: 'true', limit: 200 }).catch(() => ({ data: { data: [] } }))
        ]);

        if (!active) return;

        console.log(`Cold chain data loaded: ${batchResults.length} batches, ${activeAlertResponse.data.data?.length || 0} active alerts`);
        setDetailedBatches(batchResults);
        setActiveAlerts(activeAlertResponse.data.data || []);
        setResolvedAlerts(resolvedAlertResponse.data.data || []);
      } catch (error) {
        console.error('Cold chain data loading failed:', error);
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    };

    loadColdChainData();

    return () => {
      active = false;
    };
  }, [monitoredBatches]);

  useEffect(() => {
    if (!selectedBatchId && detailedBatches[0]) {
      setSelectedBatchId(detailedBatches[0].batchId);
    }
  }, [detailedBatches, selectedBatchId]);

  // Chart data - ensure it updates when batch or mode changes
  const chartBatch = useMemo(() => {
    if (chartMode === 'selected') {
      if (selectedBatchId && detailedBatches.length > 0) {
        const found = detailedBatches.find((b) => b.batchId === selectedBatchId);
        if (found) {
          console.log(`Chart batch selected: ${found.batchId}, temps: ${(found.temperatureHistory || []).length}`);
          return found;
        }
      }
      return detailedBatches[0] || null;
    }
    return detailedBatches[0] || null;
  }, [chartMode, selectedBatchId, detailedBatches]);

  const chartData = useMemo(() => {
    const data = chartMode === 'selected'
      ? buildSelectedChartData(chartBatch)
      : buildFleetChartData(detailedBatches);
    console.log(`Chart data updated: mode=${chartMode}, labels=${data.labels?.length || 0}, series=${data.datasets?.length || 0}`);
    return data;
  }, [chartBatch, chartMode, detailedBatches]);

  const chartTemperatureValues = useMemo(() => {
    const values = chartMode === 'selected'
      ? normalizeHistory(chartBatch?.temperatureHistory || []).map((entry) => entry.temperature)
      : detailedBatches.flatMap((batch) => normalizeHistory(batch.temperatureHistory || []).map((entry) => entry.temperature));

    return values.filter((value) => Number.isFinite(value));
  }, [chartBatch, chartMode, detailedBatches]);

  const yAxisBounds = useMemo(() => {
    if (!chartTemperatureValues.length) {
      return { min: 0, max: 12 };
    }

    const minTemp = Math.min(...chartTemperatureValues, COLD_CHAIN_RANGE.min);
    const maxTemp = Math.max(...chartTemperatureValues, COLD_CHAIN_RANGE.max);
    const span = Math.max(2, maxTemp - minTemp);
    const padding = Math.max(1, span * 0.2);

    const min = Math.max(0, Math.floor(minTemp - padding));
    let max = Math.ceil(maxTemp + padding);

    if (max - min < 6) {
      max = min + 6;
    }

    console.log(`Y-axis: [${min}, ${max}], values: [${minTemp.toFixed(1)}, ${maxTemp.toFixed(1)}]`);
    return { min, max };
  }, [chartTemperatureValues]);

  const activeRange = chartMode === 'selected' && chartBatch ? selectedRange : COLD_CHAIN_RANGE;

  const chartOptions = useMemo(() => ({
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
          padding: 18
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y?.toFixed(1) || '--'}°C`
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
        min: yAxisBounds.min,
        max: yAxisBounds.max
      }
    }
  }), [yAxisBounds.max, yAxisBounds.min]);

  const currentTemperature = chartMode === 'selected'
    ? chartBatch?.temperature ?? null
    : detailedBatches.length > 0
      ? detailedBatches.reduce((sum, batch) => sum + (batch.temperature || 0), 0) / detailedBatches.length
      : null;

  const tempStatus = getTemperatureStatus(currentTemperature, activeRange);
  const avgTrustScore = detailedBatches.length
    ? detailedBatches.reduce((sum, batch) => sum + (batch.trustScore || 0), 0) / detailedBatches.length
    : 0;
  const riskLevel = getRiskLabel(avgTrustScore - (activeAlerts.filter((alert) => alert.severity === 'critical').length * 6));

  const batchComplianceRates = detailedBatches.map((batch) => calculateBatchCompliance(batch));
  const complianceRate = batchComplianceRates.length
    ? batchComplianceRates.reduce((sum, score) => sum + score, 0) / batchComplianceRates.length
    : 100;

  const now = new Date();
  const todayKey = now.toDateString();
  const alertsToday = [...activeAlerts, ...resolvedAlerts].filter(
    (alert) => new Date(alert.createdAt).toDateString() === todayKey
  );
  const criticalToday = alertsToday.filter((alert) => alert.severity === 'critical').length;
  const warningsToday = alertsToday.filter((alert) => alert.severity === 'high' || alert.severity === 'medium').length;

  const predictionValues = detailedBatches
    .filter((batch) => batch.prediction?.prediction)
    .map((batch) => ({
      batchId: batch.batchId,
      confidence: batch.prediction.prediction.confidence || 0,
      recommendation: batch.prediction.recommendation,
      predictedTemp: batch.prediction.prediction.predictedTemp,
      currentTemp: batch.prediction.currentTemperature
    }));

  const highRiskPredictions = predictionValues.filter((entry) => entry.confidence > 70);
  const sortedPredictions = [...predictionValues].sort((a, b) => b.confidence - a.confidence);
  const topPrediction = sortedPredictions[0] || null;

  const stageFailureCounts = detailedBatches.reduce((accumulator, batch) => {
    activeAlerts.forEach((alert) => {
      if (alert.batchId !== batch.batchId) return;
      const stage = deriveFailurePoint(batch.currentStage);
      accumulator[stage] = (accumulator[stage] || 0) + 1;
    });
    return accumulator;
  }, { Transport: 0, Storage: 0, Unknown: 0 });

  const mostCommonFailurePoint = Object.entries(stageFailureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Transport';
  const averageExcursionRate = 100 - complianceRate;

  const selectedJourneyStages = selectedBatch ? calculateStageSummaries(selectedBatch) : [];
  const routeTone = tempStatus.tone === 'critical'
    ? 'critical'
    : topPrediction?.confidence > 70
      ? 'warning'
      : tempStatus.tone;

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    setChartMode('selected');
  };

  const handleSimulateExcursion = async () => {
    const targetBatchId = selectedBatchId || chartBatch?.batchId;
    if (!targetBatchId) return;

    setSimulating(true);
    try {
      await simulationAPI.spike(targetBatchId);
      await Promise.all([fetchBatches(), fetchAlerts()]);
    } finally {
      setSimulating(false);
    }
  };

  const handleDownloadTemperatureHistory = () => {
    const report = buildTemperatureHistoryReport(
      chartMode === 'selected' && chartBatch ? [chartBatch] : detailedBatches,
      chartMode === 'selected' && chartBatch ? chartBatch.batchId.toLowerCase() : 'fleet'
    );
    downloadCsv(report.filename, report.rows);
  };

  const handleDownloadExcursionReport = () => {
    const report = buildExcursionInvestigationReport(
      [...activeAlerts, ...resolvedAlerts],
      detailedBatches,
      chartMode === 'selected' && chartBatch ? chartBatch.batchId.toLowerCase() : 'fleet'
    );
    downloadCsv(report.filename, report.rows);
  };

  const handleDownloadCertificate = () => {
    const scopeBatches = chartMode === 'selected' && chartBatch ? [chartBatch] : detailedBatches;
    const content = buildCertificateText(scopeBatches, chartBatch, complianceRate, riskLevel);
    downloadTextFile(
      `cold-chain-certificate-${chartMode === 'selected' && chartBatch ? chartBatch.batchId.toLowerCase() : 'fleet'}.txt`,
      content
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="nav-blur sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="text-2xl">❄️</div>
              <span className="text-lg font-semibold tracking-tight">Orion-PharmaChain</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
              <Link to="/inventory" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Inventory</Link>
              <Link to="/cold-chain" className="text-sm text-gray-900 font-medium">Cold Chain</Link>
              <Link to="/verify" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Verify</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="section pb-0">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="section-title">Cold Chain Control</h1>
          <p className="section-subtitle">
            Live temperature monitoring, excursion prediction, compliance reporting, and shipment health for refrigerated medicines.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className={`card border-2 ${tempStatus.tone === 'safe' ? 'border-green-500' : tempStatus.tone === 'warning' ? 'border-orange-400' : 'border-red-500'}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500">Current Temperature Status</p>
            <p className={`text-4xl font-bold mt-2 ${tempStatus.color}`}>
              {Number.isFinite(currentTemperature) ? `${currentTemperature.toFixed(1)}°C` : '--'}
            </p>
            <p className={`mt-2 text-sm font-medium ${tempStatus.color}`}>{tempStatus.label}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active Shipments in Cold Chain</p>
            <p className="text-4xl font-bold mt-2 text-gray-900">{monitoredBatches.length}</p>
            <p className="text-sm text-gray-500 mt-2">Batches currently monitored</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">Excursion Risk</p>
            <p className={`text-4xl font-bold mt-2 ${riskLevel.tone === 'safe' ? 'text-green-600' : riskLevel.tone === 'warning' ? 'text-orange-500' : 'text-red-600'}`}>
              {riskLevel.label}
            </p>
            <p className="text-sm text-gray-500 mt-2">Linked to trust score and alert pressure</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">Compliance Rate</p>
            <p className="text-4xl font-bold mt-2 text-green-600">{complianceRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-2">This month</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">Alerts Today</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
              {criticalToday} Critical | {warningsToday} Warnings
            </p>
            <p className="text-sm text-gray-500 mt-2">Latest temperature and prediction events</p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Live Temperature Monitoring</p>
                <h2 className="text-2xl font-semibold mt-1">Temperature Chart</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {chartMode === 'selected' && chartBatch
                    ? `Safe range ${formatRange(selectedRange)}`
                    : 'Fleet view shows all shipments against the default monitoring band.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setChartMode('selected')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${chartMode === 'selected' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Selected Shipment
                </button>
                <button
                  onClick={() => setChartMode('fleet')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${chartMode === 'fleet' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  All Active Shipments
                </button>
                <button
                  onClick={handleDownloadTemperatureHistory}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Temperature History Report
                </button>
              </div>
            </div>

            <div className="h-[380px] mb-4">
              {chartData.labels.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                  Loading temperature data...
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 text-sm">
              {(chartMode === 'selected' ? [chartBatch].filter(Boolean) : detailedBatches).map((batch) => {
                const temp = batch.temperature;
                const status = getTemperatureStatus(temp, getTargetRange(batch));
                return (
                  <div key={batch.batchId} className="rounded-2xl border border-gray-200 p-3 bg-gray-50/80 xl:col-span-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{batch.batchId}</p>
                    <p className={`text-lg font-semibold mt-1 ${status.color}`}>{Number.isFinite(temp) ? `${temp.toFixed(1)}°C` : '--'}</p>
                    <p className="text-xs text-gray-500 mt-1">{batch.medicineName}</p>
                    <p className="text-xs text-gray-500 mt-1">Range: {formatRange(getTargetRange(batch))}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3 text-left">Batch ID</th>
                    <th className="py-3 text-left">Drug Name</th>
                    <th className="py-3 text-left">Current Temp</th>
                    <th className="py-3 text-left">Required Range</th>
                    <th className="py-3 text-left">Location</th>
                    <th className="py-3 text-left">Status</th>
                    <th className="py-3 text-left">Compliance</th>
                    <th className="py-3 text-left">Trust Score Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedBatches.map((batch) => {
                    const impact = 100 - (batch.trustScore || 0);
                    const impactTone = impact > 30 ? 'text-red-600' : impact > 15 ? 'text-orange-500' : 'text-green-600';
                    const batchCompliance = calculateBatchCompliance(batch);
                    const batchRange = getTargetRange(batch);
                    return (
                      <tr key={batch.batchId} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 font-medium">{batch.batchId}</td>
                        <td className="py-3 text-gray-600">{batch.medicineName}</td>
                        <td className="py-3">{batch.temperature?.toFixed(1)}°C</td>
                        <td className="py-3">{batchRange.min}°C - {batchRange.max}°C</td>
                        <td className="py-3 capitalize">{batch.currentStage}</td>
                        <td className="py-3 capitalize">
                          <span className={`badge ${batch.status === 'delivered' ? 'badge-success' : batch.status === 'compromised' ? 'badge-danger' : 'badge-warning'}`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-gray-900">{batchCompliance.toFixed(1)}%</td>
                        <td className={`py-3 font-semibold ${impactTone}`}>
                          -{impact} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Active Alerts & Predictions</h3>
                <button
                  onClick={handleSimulateExcursion}
                  disabled={simulating || !selectedBatchId}
                  className="btn-primary text-xs py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simulating ? 'Simulating...' : 'Simulate Excursion'}
                </button>
              </div>

              <div className="space-y-3 mb-4">
                {detailedBatches.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Focus shipment</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleSelectBatch(e.target.value)}
                      className="input-field py-2 text-sm"
                    >
                      {detailedBatches.map((batch) => (
                        <option key={batch.batchId} value={batch.batchId}>{batch.batchId} - {batch.medicineName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {topPrediction ? (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-orange-600">Risk Prediction</p>
                    <p className="text-lg font-semibold mt-1 text-orange-700">
                      {highRiskPredictions.length} batches have &gt;70% chance of temperature breach in the next 24 hours
                    </p>
                    <p className="text-sm text-orange-700 mt-2">
                      Top concern: {topPrediction.batchId} at {topPrediction.confidence}% confidence.
                    </p>
                    <p className="text-sm text-orange-700 mt-2">
                      Recommendation: {topPrediction.recommendation}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Predictions will appear once history is available.
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <h4 className="text-xs uppercase tracking-wide text-gray-500">Current Alerts</h4>
                {activeAlerts.length === 0 ? (
                  <div className="text-sm text-gray-500">No active cold chain alerts.</div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className={`rounded-2xl border p-3 ${alert.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {alert.severity === 'critical' ? 'Critical' : alert.severity === 'high' ? 'Warning' : 'Alert'}: {alert.type}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">Batch: {alert.batchId}</p>
                        </div>
                        <span className="badge badge-danger text-xs">{alert.severity}</span>
                      </div>
                    </div>
                  ))
                )}

                <h4 className="text-xs uppercase tracking-wide text-gray-500 pt-2">Resolved Alerts</h4>
                {resolvedAlerts.length === 0 ? (
                  <div className="text-sm text-gray-500">No resolved alerts in the current data window.</div>
                ) : (
                  resolvedAlerts.map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{alert.type}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">Resolved: {formatDateTime(alert.resolvedAt || alert.createdAt)}</p>
                          <p className="text-xs text-gray-500 mt-1">Corrective action: {getCorrectiveAction(alert)}</p>
                        </div>
                        <span className="badge badge-success text-xs">Resolved</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="font-semibold mb-4">Shipment Journey with Temperature Overlay</h3>
              {selectedBatch ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 overflow-hidden h-80">
                    <MapView
                      key={selectedBatch.batchId}
                      currentStage={selectedBatch.currentStage}
                      stages={selectedBatch.stages}
                      origin={selectedBatch.origin}
                      destination={selectedBatch.destination}
                      originCoordinates={selectedBatch.originCoordinates}
                      destinationCoordinates={selectedBatch.destinationCoordinates}
                      routeTone={routeTone}
                    />
                  </div>

                  <div className="card bg-gray-50 border border-gray-200">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Journey Timeline</h4>
                    <Timeline
                      stages={selectedBatch.stages}
                      currentStage={selectedBatch.currentStage}
                    />
                  </div>

                  <div className="grid gap-3">
                    {selectedJourneyStages.map((stage) => (
                      <div key={stage.stage} className={`rounded-2xl border p-3 ${stage.hasData ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-gray-50/60 opacity-70'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{stage.label}</p>
                            <p className="text-xs text-gray-500 mt-1">Duration: {stage.duration}</p>
                          </div>
                          <span className="badge badge-info text-xs">{stage.hasData ? 'Monitored' : 'Pending'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3">
                          <p>Min temp: {stage.min !== null ? `${stage.min}°C` : '--'}</p>
                          <p>Max temp: {stage.max !== null ? `${stage.max}°C` : '--'}</p>
                          <p>Avg temp: {stage.average !== null ? `${stage.average}°C` : '--'}</p>
                          <p>Excursions: {stage.excursionCount}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {stage.timestamp ? `Stage recorded at ${formatDateTime(stage.timestamp)}` : 'No stage timestamp available'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No monitored shipment selected.</p>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">Compliance & Reporting</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500">GDP / WHO / CDSCO</p>
                  <p className="text-lg font-semibold mt-1 text-green-600">Compliant</p>
                  <p className="text-xs text-gray-500 mt-1">Temperature records and alerts are tracked for regulatory review.</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Audit Readiness</p>
                  <p className="text-lg font-semibold mt-1 text-green-600">21 CFR Part 11 Ready</p>
                  <p className="text-xs text-gray-500 mt-1">Blockchain-backed logs and tamper-evident tracking support audit evidence.</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleDownloadTemperatureHistory} className="btn-secondary text-xs py-2 px-3">
                  Temperature History Report (CSV)
                </button>
                <button onClick={handleDownloadExcursionReport} className="btn-secondary text-xs py-2 px-3">
                  Excursion Investigation Report (CSV)
                </button>
                <button onClick={handleDownloadCertificate} className="btn-secondary text-xs py-2 px-3">
                  Full Batch Cold Chain Certificate
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mt-4 text-sm">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Historical Trends</p>
                  <p className="text-lg font-semibold mt-1">{averageExcursionRate.toFixed(1)}% excursion rate</p>
                  <p className="text-xs text-gray-500 mt-1">Average readings outside each shipment's safe range</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Most Common Failure Point</p>
                  <p className="text-lg font-semibold mt-1">{mostCommonFailurePoint}</p>
                  <p className="text-xs text-gray-500 mt-1">Based on alert distribution across monitored shipments</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">Predictive Insights</h3>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-600">Trust Score Link</p>
                <p className="text-lg font-semibold mt-1 text-blue-700">
                  Average trust score: {avgTrustScore.toFixed(1)} / 100
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Temperature excursions and predicted breaches directly reduce trust score. High-risk shipments should be rerouted or re-cooled before the score drops further.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mt-4 text-sm">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Recommendations</p>
                  {sortedPredictions.length === 0 ? (
                    <p className="text-gray-500 mt-2">Recommendations will appear after prediction history is available.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {sortedPredictions.slice(0, 3).map((entry) => (
                        <li key={entry.batchId}>
                          <p className="font-medium">{entry.batchId}</p>
                          <p className="text-gray-500 text-xs">{entry.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Fleet Outlook</p>
                  <p className="text-lg font-semibold mt-1">{selectedBatch ? selectedBatch.batchId : 'Fleet'}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {topPrediction
                      ? `${topPrediction.batchId} currently has the highest predicted breach confidence at ${topPrediction.confidence}%`
                      : 'No forecast data yet for monitored shipments.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(loading || loadingDetails) && (
          <div className="text-sm text-gray-500">Refreshing cold chain data...</div>
        )}
      </main>
    </div>
  );
};

export default ColdChain;
