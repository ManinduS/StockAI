import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  register: (userData) => api.post('/auth/register', userData)
};

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getBySku: (sku) => api.get(`/products/sku/${sku}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, adjustment, reason) => api.patch(`/products/${id}/stock`, { adjustment, reason }),
  getLowStock: () => api.get('/products/low-stock'),
  getCategories: () => api.get('/products/categories')
};

export const salesApi = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  getSummary: (params) => api.get('/sales/summary', { params }),
  getByProduct: (params) => api.get('/sales/by-product', { params }),
  getMonthlyStats: (params) => api.get('/sales/stats/monthly', { params }),
  getTopProducts: (params) => api.get('/sales/stats/top-products', { params })
};

export const forecastApi = {
  predict: (data) => api.post('/forecast/predict', data),
  batchPredict: (data) => api.post('/forecast/batch', data),
  predictAllLowStock: () => api.post('/forecast/all-low-stock'),
  getHealth: () => api.get('/forecast/health'),
  getModelInfo: () => api.get('/forecast/model-info'),
  getMLStatus: () => api.get('/forecast/health')
};

export const reorderApi = {
  getPlans: (params) => api.get('/reorder/plans', { params }),
  getPlan: (id) => api.get(`/reorder/plans/${id}`),
  generate: (data) => api.post('/reorder/generate', data),
  export: (id) => `${API_URL}/reorder/export/${id}`,
  updateStatus: (id, status) => api.patch(`/reorder/plans/${id}/status`, { status }),
  delete: (id) => api.delete(`/reorder/plans/${id}`)
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  addHoliday: (data) => api.post('/settings/holidays', data),
  removeHoliday: (index) => api.delete(`/settings/holidays/${index}`),
  addPromo: (data) => api.post('/settings/promos', data),
  removePromo: (index) => api.delete(`/settings/promos/${index}`)
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  testPrediction: (data) => api.post('/admin/test-prediction', data),
  bulkImport: (products) => api.post('/admin/bulk-import', { products }),
  getMlStatus: () => api.get('/admin/ml-status'),
  uploadProducts: (products) => api.post('/admin/upload/products', { products }),
  uploadSales: (sales) => api.post('/admin/upload/sales', { sales }),
  stockAdjust: (data) => api.post('/admin/stock-adjust', data),
  trainModel: (algorithm, salesData) => api.post('/admin/train-model', { algorithm, salesData }),
  factoryReset: (confirm) => api.post('/admin/factory-reset', { confirmReset: confirm })
};

export const aiApi = {
  trainModel: (algorithm) => api.post('/ai/train-model', { algorithm }),
  predictDemand: (data) => api.post('/ai/predict-demand', data),
  getInventoryInsights: () => api.get('/ai/inventory-insights'),
  getReorderPlan: () => api.get('/ai/reorder-plan'),
  getAlerts: () => api.get('/ai/alerts'),
  getModelMetrics: () => api.get('/ai/model-metrics')
};
