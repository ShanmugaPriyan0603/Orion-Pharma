import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { batchAPI, alertAPI } from '../services/api';

const BatchContext = createContext(null);

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within BatchProvider');
  }
  return context;
};

export const BatchProvider = ({ children }) => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all batches
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await batchAPI.getAll();
      setBatches(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch batches');
      console.error('Fetch batches error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await alertAPI.getActive();
      setAlerts(response.data.data || []);
    } catch (err) {
      console.error('Fetch alerts error:', err);
    }
  }, []);

  // Create new batch
  const createBatch = useCallback(async (batchData) => {
    try {
      setLoading(true);
      const response = await batchAPI.create(batchData);
      await fetchBatches();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBatches]);

  // Get batch details
  const getBatchDetails = useCallback(async (batchId) => {
    try {
      const response = await batchAPI.getById(batchId);
      setSelectedBatch(response.data.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch batch details');
      throw err;
    }
  }, []);

  // Verify batch
  const verifyBatch = useCallback(async (batchId) => {
    try {
      const response = await batchAPI.verify(batchId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Batch not found');
      throw err;
    }
  }, []);

  const deleteBatch = useCallback(async (batchId) => {
    try {
      const response = await batchAPI.remove(batchId);
      if (selectedBatch?.batchId === batchId) {
        setSelectedBatch(null);
      }
      await fetchBatches();
      await fetchAlerts();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete batch');
      throw err;
    }
  }, [fetchAlerts, fetchBatches, selectedBatch]);

  // Refresh data periodically
  useEffect(() => {
    fetchBatches();
    fetchAlerts();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchBatches();
      fetchAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchBatches, fetchAlerts]);

  const value = {
    batches,
    selectedBatch,
    alerts,
    loading,
    error,
    fetchBatches,
    fetchAlerts,
    createBatch,
    getBatchDetails,
    verifyBatch,
    deleteBatch,
    setSelectedBatch,
    clearError: () => setError(null)
  };

  return (
    <BatchContext.Provider value={value}>
      {children}
    </BatchContext.Provider>
  );
};
