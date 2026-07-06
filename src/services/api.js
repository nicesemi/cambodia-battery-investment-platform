const API_URL = '/api';

async function request(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && url.startsWith('/auth') && !url.startsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

// 认证API
export const authAPI = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/auth/profile'),
  getStoreHierarchy: () => request('/auth/store-hierarchy'),
  rechargeWallet: (amount) => request('/wallet/recharge', { method: 'POST', body: JSON.stringify({ amount }) }),
  getWalletTransactions: (limit = 20) => request(`/wallet/transactions?limit=${limit}`),
};

// 资产API
export const assetAPI = {
  getAssets: (locale) => request('/assets?locale=' + (locale || 'zh-CN')),
  getUserAssets: () => request('/assets/my'),
  purchaseAsset: (data) => request('/assets/purchase', { method: 'POST', body: JSON.stringify(data) }),
};

// 交易API
export const tradeAPI = {
  createOrder: (data) => request('/trades/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: (status) => request(`/trades/orders${status ? `?status=${status}` : ''}`),
  getOrderBook: (assetId) => request(`/trades/orderbook/${assetId}`),
  cancelOrder: (orderId) => request(`/trades/orders/${orderId}`, { method: 'DELETE' }),
  previewBuyback: (unitId) => request(`/trades/sell-to-platform?unitId=${unitId}`),
  sellToPlatform: (unitIds) => request('/trades/sell-to-platform', { method: 'POST', body: JSON.stringify({ unitIds }) }),
};

// 分红API
export const dividendAPI = {
  getMyDividends: (period) => request(`/dividends/my${period ? `?period=${period}` : ''}`),
  getMarketForecast: () => request('/dividends/forecast'),
  calculateDividend: (data) => request('/dividends/calculate', { method: 'POST', body: JSON.stringify(data) }),
};

// 管理员API
export const adminAPI = {
  getDashboard: () => request('/admin/dashboard'),
  getUsers: (page, limit, search) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (search) params.set('search', search);
    return request(`/admin/users?${params}`);
  },
  updateUser: (userId, data) => request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  getTrades: (page, limit) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return request(`/admin/trades?${params}`);
  },
  getConfigs: () => request('/admin/configs'),
  updateConfig: (configKey, configValue) => request(`/admin/configs/${configKey}`, { method: 'PUT', body: JSON.stringify({ configValue }) }),
  getAssets: () => request('/admin/assets'),
  createAsset: (data) => request('/admin/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (assetId, data) => request(`/admin/assets/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAssetStatus: (assetId, status) => request(`/admin/assets/${assetId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAsset: (assetId) => request(`/admin/assets/${assetId}`, { method: 'DELETE' }),
  getStores: () => request('/admin/stores'),
  createStore: (data) => request('/admin/stores', { method: 'POST', body: JSON.stringify(data) }),
  updateStore: (storeId, data) => request(`/admin/stores/${storeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStoreStatus: (storeId, status) => request(`/admin/stores/${storeId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteStore: (storeId) => request(`/admin/stores/${storeId}`, { method: 'DELETE' }),
  // 代理/加盟商审批
  getApplications: () => request('/admin/applications'),
  reviewApplication: (applicationId, data) => request(`/admin/applications?id=${applicationId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAgentApplications: (status) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return request(`/admin/agent-applications?${params}`);
  },
  reviewAgentApplication: (applicationId, data) => request(`/admin/agent-applications?id=${applicationId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // 已审批代理管理
  getManagedAgents: (type) => request(`/admin/managed-agents${type ? '?type=' + encodeURIComponent(type) : ''}`),
  updateManagedAgent: (id, data) => request('/admin/managed-agents', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteManagedAgent: (id) => request(`/admin/managed-agents?id=${id}`, { method: 'DELETE' }),
  getFranchiseeApplications: (status) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return request(`/admin/franchisee-applications?${params}`);
  },
  reviewFranchiseeApplication: (applicationId, data) => request(`/admin/franchisee-applications/${applicationId}/review`, { method: 'PUT', body: JSON.stringify(data) }),
  // 电池类型维护
  getBatteryTypes: () => request('/admin/battery-types'),
  createBatteryType: (data) => request('/admin/battery-types', { method: 'POST', body: JSON.stringify(data) }),
  updateBatteryType: (typeId, data) => request(`/admin/battery-types/${typeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatteryType: (typeId) => request(`/admin/battery-types/${typeId}`, { method: 'DELETE' }),
  // 已售电池监控
  getSoldBatteries: (page = 1, limit = 20, sortKey = '', sortDirection = 'asc') => {
    let url = `/admin/sold-batteries?page=${page}&limit=${limit}`;
    if (sortKey) url += `&sortKey=${encodeURIComponent(sortKey)}&sortDirection=${sortDirection}`;
    return request(url);
  },
  // 传感器数据管理
  getBatteryUnits: (assetId) => request(`/admin/battery-units?asset_id=${assetId}`),
  batchUpdateSensor: (assetId, data) => request(`/admin/battery-sensor-import`, { method: 'POST', body: JSON.stringify({ asset_id: assetId, ...data }) }),
  // 提现审批
  getWithdrawals: () => request('/admin/withdrawals'),
  reviewWithdrawal: (id, data) => request(`/admin/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  // 实名审核
  getKycList: (status) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return request(`/admin/kyc-list?${params}`);
  },
  reviewKyc: (userId, data) => request(`/admin/kyc/${userId}/review`, { method: 'PUT', body: JSON.stringify(data) }),
  // 工人管理
  getWorkers: () => request('/admin/workers'),
  createWorker: (data) => request('/admin/workers', { method: 'POST', body: JSON.stringify(data) }),
  updateWorker: (id, data) => request('/admin/workers', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteWorker: (id) => request(`/admin/workers?id=${id}`, { method: 'DELETE' }),
  // 仓库管理
  getWarehouses: () => request('/admin/warehouses'),
  createWarehouse: (data) => request('/admin/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id, data) => request(`/admin/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWarehouse: (id) => request(`/admin/warehouses/${id}`, { method: 'DELETE' }),

  // 站点类型管理
  getSiteTypes: () => request('/admin/site-types'),
  createSiteType: (data) => request('/admin/site-types', { method: 'POST', body: JSON.stringify(data) }),
  updateSiteType: (typeId, data) => request(`/admin/site-types/${typeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSiteType: (typeId) => request(`/admin/site-types/${typeId}`, { method: 'DELETE' }),
  // 运营站点管理
  getOperationSites: () => request('/admin/operation-sites'),
  createOperationSite: (data) => request('/admin/operation-sites', { method: 'POST', body: JSON.stringify(data) }),
  updateOperationSite: (siteId, data) => request(`/admin/operation-sites/${siteId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOperationSite: (siteId) => request(`/admin/operation-sites/${siteId}`, { method: 'DELETE' }),
  // 派工单
  dispatchBatteries: (data) => request('/admin/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  getWorkOrders: (status) => request(`/admin/dispatch${status ? '?status=' + encodeURIComponent(status) : ''}`),
  updateWorkOrder: (id, data) => request('/admin/dispatch', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
};

export const chatbotAPI = {
  ask: (query) => request('/chatbot/ask', { method: 'POST', body: JSON.stringify({ query }) }),
};

// 加盟商API（更新版）
export const franchiseeAPI = {
  getMyStores: () => request('/franchisee/stores'),
  addStore: (data) => request('/franchisee/stores', { method: 'POST', body: JSON.stringify(data) }),
  getStoreDetail: (storeId) => request(`/franchisee/stores/${storeId}`),
  getStorePerformance: (storeId) => request(`/franchisee/stores/${storeId}/performance`),
  getStoreOrders: () => request('/franchisee/store-orders'),
  getMyApplications: () => request('/franchisee/applications'),
  submitApplication: (data) => request('/franchisee/applications', { method: 'POST', body: JSON.stringify(data) }),
  staffRegisterInvestor: (data) => request('/franchisee/staff-register-investor', { method: 'POST', body: JSON.stringify(data) }),
  getAgentOptions: (region, city) => request(`/franchisee/agent-options?region=${encodeURIComponent(region)}&city=${encodeURIComponent(city)}`),
};

// 门店列表API（投资者/加盟商可访问已审批门店）
export const storesAPI = {
  getApprovedStores: () => request('/stores/approved'),
};

// 电池类型公开API（首页动态获取）
export const batteryTypesAPI = {
  getList: () => request('/battery-types'),
};

// 代理申请API
export const agentAPI = {
  apply: (data) => request('/agent/apply', { method: 'POST', body: JSON.stringify(data) }),
  getMyApplications: () => request('/agent/applications'),
  getApproved: () => request('/agent/approved'),
  checkStatus: () => request('/agent/status'),
  getClaimedCities: (region) => request(`/agent/claimed-cities?region=${encodeURIComponent(region)}`),
  getReviewList: () => request('/agent/review'),
  reviewApplication: (applicationId, data) => request(`/agent/review?id=${applicationId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getManaged: (type, search) => request(`/agent/managed?type=${type}${search ? '&search=' + encodeURIComponent(search) : ''}`),
  getEarnings: () => request('/agent/earnings'),
};

// 投资者订单API（门店业绩归属）
export const orderAPI = {
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: (page = 1, limit = 50) => request(`/orders?page=${page}&limit=${limit}`),
  getMyBinding: () => request('/orders'),
};
