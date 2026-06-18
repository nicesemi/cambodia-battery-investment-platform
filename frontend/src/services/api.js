import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// 资产API
export const assetAPI = {
  getAssets: () => api.get('/assets'),
  getUserAssets: () => api.get('/assets/my'),
  purchaseAsset: (data) => api.post('/assets/purchase', data),
};

// 交易API
export const tradeAPI = {
  createOrder: (data) => api.post('/trades/orders', data),
  getMyOrders: (status) => api.get('/trades/orders', { params: { status } }),
  getOrderBook: (assetId) => api.get(`/trades/orderbook/${assetId}`),
  cancelOrder: (orderId) => api.delete(`/trades/orders/${orderId}`),
};

// 分红API
export const dividendAPI = {
  getMyDividends: (period) => api.get('/dividends/my', { params: { period } }),
  getMarketForecast: () => api.get('/dividends/forecast'),
  calculateDividend: (data) => api.post('/dividends/calculate', data),
};

// 管理员API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (page, limit, search) => api.get('/admin/users', { params: { page, limit, search } }),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  getTrades: (page, limit) => api.get('/admin/trades', { params: { page, limit } }),
  getConfigs: () => api.get('/admin/configs'),
  updateConfig: (configKey, configValue) => api.put(`/admin/configs/${configKey}`, { configValue }),
};

export default api;
