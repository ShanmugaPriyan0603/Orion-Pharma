import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Batch API
export const batchAPI = {
  create: (data) => api.post('/batch/create', data),
  getAll: () => api.get('/batch'),
  getById: (id) => api.get(`/batch/${id}`),
  verify: (id) => api.get(`/batch/verify/${id}`),
  remove: (id) => api.delete(`/batch/${id}`)
};

// Simulation API
export const simulationAPI = {
  temperature: (batchId, options) => api.post('/simulate/temperature', { batchId, ...options }),
  location: (batchId) => api.post('/simulate/location', { batchId }),
  delay: (batchId) => api.post('/simulate/delay', { batchId }),
  spike: (batchId) => api.post('/simulate/spike', { batchId }),
  predict: (batchId) => api.get(`/simulate/predict/${batchId}`),
  trustScore: (batchId) => api.get(`/simulate/trust/${batchId}`)
};

// Alert API
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  getActive: () => api.get('/alerts/active'),
  getStats: () => api.get('/alerts/stats'),
  getByBatch: (batchId, params) => api.get(`/alerts/batch/${batchId}`, { params }),
  resolve: (id) => api.put(`/alerts/${id}/resolve`)
};

// Location API
export const locationAPI = {
  search: (query, limit = 8) => api.get('/location/search', { params: { query, limit } })
};

export default api;
