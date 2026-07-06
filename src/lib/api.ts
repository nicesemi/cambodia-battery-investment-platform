'use client';

const API_BASE = '/api';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    role: string;
    phone?: string;
    kyc_status?: string;
    is_active?: boolean;
  };
}

// localStorage helpers
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('battery_bank_token');
}

function setToken(token: string) {
  localStorage.setItem('battery_bank_token', token);
}

function removeToken() {
  localStorage.removeItem('battery_bank_token');
}

// Auth headers
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// Auth API
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
  setToken(data.token);
  return data;
}

export async function register(params: { email: string; password: string; username: string; full_name: string; role?: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
  setToken(data.token);
  return data;
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/auth/profile`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to get profile');
  return res.json();
}

export function logout() {
  removeToken();
  if (typeof window !== 'undefined') window.location.reload();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// Assets API
export async function getAssets() {
  const res = await fetch(`${API_BASE}/assets`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function getMyAssets() {
  const res = await fetch(`${API_BASE}/assets/my`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch my assets');
  return res.json();
}

export async function purchaseAsset(assetId: string, units: number) {
  const res = await fetch(`${API_BASE}/assets/purchase`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ asset_id: assetId, units }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Purchase failed');
  return data;
}

// Trades API
export async function getOrders(params?: { status?: string; assetId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.assetId) query.set('asset_id', params.assetId);
  const res = await fetch(`${API_BASE}/trades/orders?${query}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function createOrder(params: { assetId: string; orderType: 'buy' | 'sell'; price: number; units: number }) {
  const res = await fetch(`${API_BASE}/trades/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ asset_id: params.assetId, order_type: params.orderType, price: params.price, units: params.units }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order creation failed');
  return data;
}

export async function cancelOrder(orderId: string) {
  const res = await fetch(`${API_BASE}/trades/orders/${orderId}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Cancel failed');
  return data;
}

export async function getOrderbook(assetId: string) {
  const res = await fetch(`${API_BASE}/trades/orderbook/${assetId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch orderbook');
  return res.json();
}

// Dividends API
export async function getMyDividends() {
  const res = await fetch(`${API_BASE}/dividends/my`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch dividends');
  return res.json();
}

export async function getDividendForecast() {
  const res = await fetch(`${API_BASE}/dividends/forecast`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

// Admin API
export async function getDashboard() {
  const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function getAdminAssets() {
  const res = await fetch(`${API_BASE}/admin/assets`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch admin assets');
  return res.json();
}

export async function createAdminAsset(data: any) {
  const res = await fetch(`${API_BASE}/admin/assets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create asset');
  return json;
}

export async function updateAdminAsset(assetId: string, data: any) {
  const res = await fetch(`${API_BASE}/admin/assets/${assetId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update asset');
  return json;
}

export async function deleteAdminAsset(assetId: string) {
  const res = await fetch(`${API_BASE}/admin/assets/${assetId}`, { method: 'DELETE', headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete asset');
  return json;
}

export async function getUsers(page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/admin/users?page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getTrades(page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/admin/trades?page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

export async function getConfigs() {
  const res = await fetch(`${API_BASE}/admin/configs`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch configs');
  return res.json();
}

// Stores API (static data for now)
export const STORE_DATA: Array<{
  id: number;
  name: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  lng: number;
  lat: number;
  batteryCount: number;
  status: string;
  type: string;
  description: string;
}> = [
  { id: 1, name: '金边旗舰店', country: '柬埔寨', city: '金边', address: 'No. 128, Monivong Blvd, Phnom Penh', phone: '+855 23 456 7890', lng: 104.917, lat: 11.556, batteryCount: 86, status: 'active', type: '旗舰店', description: '柬埔寨首家换电旗舰店，配备智能换电柜50台，服务外卖骑手超5000人' },
  { id: 2, name: '暹粒换电站', country: '柬埔寨', city: '暹粒', address: 'Sivatha Blvd, Krong Siem Reap', phone: '+855 63 963 8521', lng: 103.856, lat: 13.363, batteryCount: 45, status: 'active', type: '标准站', description: '旅游城市换电站，服务游客租赁电摩' },
  { id: 3, name: '西哈努克港站', country: '柬埔寨', city: '西哈努克', address: 'Ekareach St, Sihanoukville', phone: '+855 34 852 7410', lng: 103.523, lat: 10.626, batteryCount: 38, status: 'active', type: '标准站', description: '港口城市换电站，覆盖物流车队' },
  { id: 4, name: '马德望换电站', country: '柬埔寨', city: '马德望', address: 'Street 1, Battambang', phone: '+855 53 741 9630', lng: 103.200, lat: 13.096, batteryCount: 22, status: 'active', type: '社区站', description: '社区级换电站，服务本地居民日常出行' },
  { id: 5, name: '达卡 Mirpur 站', country: '孟加拉', city: '达卡', address: 'Mirpur Road, Dhaka 1216', phone: '+880 2 901 2345', lng: 90.367, lat: 23.804, batteryCount: 52, status: 'active', type: '旗舰店', description: '孟加拉最大换电站，日换电量超3000次' },
  { id: 6, name: '达卡 Gulshan 站', country: '孟加拉', city: '达卡', address: 'Gulshan Avenue, Dhaka 1212', phone: '+880 2 882 5678', lng: 90.412, lat: 23.793, batteryCount: 35, status: 'active', type: '标准站', description: '高端商务区换电站' },
  { id: 7, name: '吉大港中心站', country: '孟加拉', city: '吉大港', address: 'Agrabad C/A, Chittagong', phone: '+880 31 712 3456', lng: 91.812, lat: 22.338, batteryCount: 28, status: 'active', type: '标准站', description: '港口城市换电中心' },
  { id: 8, name: '库尔纳站', country: '孟加拉', city: '库尔纳', address: 'KDA Avenue, Khulna', phone: '+880 41 723 8901', lng: 89.567, lat: 22.846, batteryCount: 18, status: 'active', type: '社区站', description: '西南重镇换电站' },
  { id: 9, name: '胡志明市旗舰店', country: '越南', city: '胡志明市', address: '123 Nguyen Hue, District 1, HCMC', phone: '+84 28 3829 1234', lng: 106.702, lat: 10.776, batteryCount: 48, status: 'active', type: '旗舰店', description: '越南首家换电中心，覆盖第一郡核心区域' },
  { id: 10, name: '河内换电站', country: '越南', city: '河内', address: '45 Ba Trieu, Hoan Kiem, Hanoi', phone: '+84 24 3825 6789', lng: 105.854, lat: 21.029, batteryCount: 32, status: 'active', type: '标准站', description: '首都换电站' },
  { id: 11, name: '岘港海滨站', country: '越南', city: '岘港', address: '88 Bach Dang, Da Nang', phone: '+84 236 3812 3456', lng: 108.220, lat: 16.054, batteryCount: 20, status: 'active', type: '标准站', description: '中部旅游城市换电站' },
  { id: 12, name: '雅加达中心站', country: '印尼', city: '雅加达', address: 'Jl. MH Thamrin No.1, Jakarta', phone: '+62 21 390 1234', lng: 106.827, lat: -6.175, batteryCount: 30, status: 'active', type: '旗舰店', description: '印尼旗舰换电站' },
  { id: 13, name: '万隆换电站', country: '印尼', city: '万隆', address: 'Jl. Asia Afrika, Bandung', phone: '+62 22 423 5678', lng: 107.610, lat: -6.917, batteryCount: 18, status: 'active', type: '标准站', description: '万隆市中心换电站' },
  { id: 14, name: '马尼拉 Makati 站', country: '菲律宾', city: '马尼拉', address: 'Ayala Ave, Makati, Manila', phone: '+63 2 8812 3456', lng: 121.024, lat: 14.555, batteryCount: 22, status: 'active', type: '旗舰店', description: '马尼拉金融区换电站' },
  { id: 15, name: '宿务换电站', country: '菲律宾', city: '宿务', address: 'Colon St, Cebu City', phone: '+63 32 412 7890', lng: 123.886, lat: 10.315, batteryCount: 15, status: 'active', type: '标准站', description: '中部群岛换电站' },
];
