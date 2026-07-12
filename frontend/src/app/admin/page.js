'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI, batteryTypesAPI } from '../../services/api';
import { useRouter } from 'next/navigation';

import { Users, TrendingUp, DollarSign, BarChart3, Settings, Battery, Store, ClipboardList, Check, X, Eye, Shield, MapPin, Building2, Plus, Edit, Trash2, Loader2, Zap, BadgeCheck, Percent, Cpu, Camera, Phone, FileText, User, CheckSquare, Square, LayoutList, BatteryCharging } from 'lucide-react';
import { formatCurrency, localeCurrency, fetchRates } from '../../lib/currency';

const API_BASE = '/api';

const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'km', label: 'ខ្មែរ' },
];
const EMPTY_I18N = { 'zh-CN': '', 'zh-TW': '', 'en': '', 'bn': '', 'km': '' };

function computeBatteryHealth(soc, temp, cycles) {
  function sensorHealth(val, g, y, o, gt) {
    if (val == null) return null;
    if (gt) { if (val > g) return 'green'; if (val > y) return 'yellow'; if (val > o) return 'orange'; return 'red'; }
    else { if (val < g) return 'green'; if (val < y) return 'yellow'; if (val < o) return 'orange'; return 'red'; }
  }
  const socH = sensorHealth(soc, 50, 30, 10, true);
  let tempH = null;
  if (temp != null) {
    if (temp < 0 || temp > 45) tempH = 'red';
    else if (temp < 25) tempH = 'green';
    else if (temp < 35) tempH = 'yellow';
    else tempH = 'orange';
  }
  const cycH = sensorHealth(cycles, 300, 500, 1000, false);
  const hs = [socH, tempH, cycH].filter(Boolean);
  if (hs.includes('red')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('orange')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('yellow')) return { status: 'warning', color: '#F59E0B' };
  return { status: 'normal', color: '#10B981' };
}

export default function Admin() {
  const { t, i18n } = useTranslation();

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stores, setStores] = useState([]);
  const [applications, setApplications] = useState([]);
  const [agentApplications, setAgentApplications] = useState([]);
  const [managedAgents, setManagedAgents] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [batteryTypes, setBatteryTypes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [kycUsers, setKycUsers] = useState([]);
  const [rejectingKycUser, setRejectingKycUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // 站点类型管理
  const [siteTypes, setSiteTypes] = useState([]);
  const [siteTypesLoading, setSiteTypesLoading] = useState(false);
  const [showSiteTypeForm, setShowSiteTypeForm] = useState(false);
  const [siteTypeForm, setSiteTypeForm] = useState({ id: '', name: '', name_i18n: { ...EMPTY_I18N } });
  const [isEditingSiteType, setIsEditingSiteType] = useState(false);
  const [selectedSiteTypeLang, setSelectedSiteTypeLang] = useState('zh-CN');
  const [siteTypeSubmitting, setSiteTypeSubmitting] = useState(false);

  // 表格排序配置 - 每个tab独立管理排序状态
  const [sortConfigs, setSortConfigs] = useState({});

  const handleSort = (tab, key) => {
    setSortConfigs(prev => {
      const current = prev[tab] || { key: null, direction: 'asc' };
      if (tab === 'sold-batteries') {
        const newConfig = {
          key: current.key === key && current.direction === 'asc' ? key : key,
          direction: current.key === key ? (current.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        };
        const next = { ...prev, [tab]: newConfig };
        setSoldPage(1);
        setTimeout(async () => {
          try {
            const r = await adminAPI.getSoldBatteries(1, 20, newConfig.key, newConfig.direction);
            setSoldBatteries(r.batteries || []);
            setSoldTotal(r.total || 0);
          } catch (e) {}
        }, 0);
        return next;
      }
      const next = current.key === key
        ? { ...prev, [tab]: { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } }
        : { ...prev, [tab]: { key, direction: 'asc' } };
      return next;
    });
  };

  const getSortIndicator = (tab, key) => {
    const config = sortConfigs[tab];
    const indicator = (!config || config.key !== key) ? '' : (config.direction === 'asc' ? ' ▲' : ' ▼');
    // 只对当前激活 tab 打印，避免刷屏
    if (tab === (typeof activeTab !== 'undefined' ? activeTab : '')) {
      return indicator;
    }
    return indicator;
  };

  const sortedAssets = [...assets].sort((a, b) => {
    const config = sortConfigs['assets'];
    if (!config || !config.key) return 0;
    const key = config.key;
    let valA, valB;
    switch (key) {
      case 'asset_code':
        valA = (a.asset_code || '').toLowerCase();
        valB = (b.asset_code || '').toLowerCase();
        break;
      case 'battery_type':
        valA = (a.battery_type || '').toLowerCase();
        valB = (b.battery_type || '').toLowerCase();
        break;
      case 'unit_price':
        valA = a.battery_type_unit_price ?? a.unit_price ?? 0;
        valB = b.battery_type_unit_price ?? b.unit_price ?? 0;
        break;
      case 'monthly_rent':
        valA = a.battery_type_monthly_rent ?? a.monthly_rent ?? 0;
        valB = b.battery_type_monthly_rent ?? b.monthly_rent ?? 0;
        break;
      case 'annualized_return':
        valA = a.battery_type_annualized_return ?? a.expected_roi ?? 0;
        valB = b.battery_type_annualized_return ?? b.expected_roi ?? 0;
        break;
      case 'status':
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
        break;
      case 'warehouse':
        valA = (a.warehouse_name || a.location || '').toLowerCase();
        valB = (b.warehouse_name || b.location || '').toLowerCase();
        break;
      default:
        return 0;
    }
    if (valA < valB) return config.direction === 'asc' ? -1 : 1;
    if (valA > valB) return config.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // 通用排序辅助函数
  const sortByConfig = (data, tab, getVal) => {
    const config = sortConfigs[tab];
    if (!config || !config.key) return data;
    const key = config.key;
    return [...data].sort((a, b) => {
      const { valA, valB } = getVal(a, b, key);
      if (valA < valB) return config.direction === 'asc' ? -1 : 1;
      if (valA > valB) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // 各模块排序后数据
  const sortedStores = sortByConfig(stores, 'stores', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'store_code': valA = (a.store_code || '').toLowerCase(); valB = (b.store_code || '').toLowerCase(); break;
      case 'name': valA = (a.name || '').toLowerCase(); valB = (b.name || '').toLowerCase(); break;
      case 'city': valA = (a.city || '').toLowerCase(); valB = (b.city || '').toLowerCase(); break;
      case 'address': valA = (a.address || '').toLowerCase(); valB = (b.address || '').toLowerCase(); break;
      case 'owner': valA = (a.owner?.username || '').toLowerCase(); valB = (b.owner?.username || '').toLowerCase(); break;
      case 'battery_count': valA = a.battery_count ?? a.total_batteries ?? 0; valB = b.battery_count ?? b.total_batteries ?? 0; break;
      case 'revenue_share': valA = a.revenue_share ?? 0; valB = b.revenue_share ?? 0; break;
      case 'monthly_sales': valA = a.performance?.monthly_sales ?? 0; valB = b.performance?.monthly_sales ?? 0; break;
      case 'total_sales': valA = a.performance?.total_sales ?? 0; valB = b.performance?.total_sales ?? 0; break;
      case 'status': valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase(); break;
      case 'created_at': valA = a.created_at || ''; valB = b.created_at || ''; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });

  const sortedApplications = sortByConfig(applications, 'applications', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'store_name': valA = (a.store_name || '').toLowerCase(); valB = (b.store_name || '').toLowerCase(); break;
      case 'franchisee_code': valA = (a.franchisee_code || '').toLowerCase(); valB = (b.franchisee_code || '').toLowerCase(); break;
      case 'city': valA = (a.city || '').toLowerCase(); valB = (b.city || '').toLowerCase(); break;
      case 'phone': valA = (a.phone || '').toLowerCase(); valB = (b.phone || '').toLowerCase(); break;
      case 'applicant': valA = (a.user?.username || '').toLowerCase(); valB = (b.user?.username || '').toLowerCase(); break;
      case 'status': valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase(); break;
      case 'created_at': valA = a.created_at || ''; valB = b.created_at || ''; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });

  const sortedAgentApplications = sortByConfig(agentApplications, 'agent-applications', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'full_name': valA = (a.full_name || '').toLowerCase(); valB = (b.full_name || '').toLowerCase(); break;
      case 'agent_code': valA = (a.agent_code || '').toLowerCase(); valB = (b.agent_code || '').toLowerCase(); break;
      case 'phone': valA = (a.phone || '').toLowerCase(); valB = (b.phone || '').toLowerCase(); break;
      case 'region': valA = (a.region || '').toLowerCase(); valB = (b.region || '').toLowerCase(); break;
      case 'city': valA = (a.city || '').toLowerCase(); valB = (b.city || '').toLowerCase(); break;
      case 'applicant': valA = (a.applicant?.username || '').toLowerCase(); valB = (b.applicant?.username || '').toLowerCase(); break;
      case 'status': valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase(); break;
      case 'created_at': valA = a.created_at || ''; valB = b.created_at || ''; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });

  const sortedManagedAgents = sortByConfig(managedAgents, 'managed-agents', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'full_name': valA = (a.full_name || a.applicant?.full_name || a.applicant?.username || '').toLowerCase(); valB = (b.full_name || b.applicant?.full_name || b.applicant?.username || '').toLowerCase(); break;
      case 'agent_code': valA = (a.agent_code || '').toLowerCase(); valB = (b.agent_code || '').toLowerCase(); break;
      case 'agent_type': valA = (a.agent_type || '').toLowerCase(); valB = (b.agent_type || '').toLowerCase(); break;
      case 'phone': valA = (a.applicant?.phone || '').toLowerCase(); valB = (b.applicant?.phone || '').toLowerCase(); break;
      case 'email': valA = (a.applicant?.email || '').toLowerCase(); valB = (b.applicant?.email || '').toLowerCase(); break;
      case 'region': valA = (a.region || '').toLowerCase(); valB = (b.region || '').toLowerCase(); break;
      case 'city': valA = (a.city || '').toLowerCase(); valB = (b.city || '').toLowerCase(); break;
      case 'commission': valA = a.commission ?? 0; valB = b.commission ?? 0; break;
      case 'revenue_share': valA = a.revenue_share ?? 0; valB = b.revenue_share ?? 0; break;
      case 'store_count': valA = a.store_count ?? 0; valB = b.store_count ?? 0; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });

  const sortedKycUsers = sortByConfig(kycUsers, 'kyc', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'username': valA = (a.full_name || a.username || '').toLowerCase(); valB = (b.full_name || b.username || '').toLowerCase(); break;
      case 'email': valA = (a.email || '').toLowerCase(); valB = (b.email || '').toLowerCase(); break;
      case 'phone': valA = (a.phone || '').toLowerCase(); valB = (b.phone || '').toLowerCase(); break;
      case 'role': valA = (a.role || '').toLowerCase(); valB = (b.role || '').toLowerCase(); break;
      case 'certification_status': valA = (a.certification_status || '').toLowerCase(); valB = (b.certification_status || '').toLowerCase(); break;
      case 'created_at': valA = a.created_at || ''; valB = b.created_at || ''; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });


  // 电池资产管理表单
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedAssetLang, setSelectedAssetLang] = useState('zh-CN');
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetForm, setAssetForm] = useState({
    asset_code: '', name: '', description: '', battery_type: 'swap', battery_type_id: '',
    total_units: '', unit_price_rmb: '', expected_roi: '', monthly_rent: '', location: '', station_id: '', warehouse_id: ''});
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  // JSON批量上传
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [jsonImporting, setJsonImporting] = useState(false);

  // 传感器JSON导入
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [sensorTargetAsset, setSensorTargetAsset] = useState(null);
  const [sensorJsonText, setSensorJsonText] = useState('');
  const [sensorImporting, setSensorImporting] = useState(false);

  // 门店编辑表单
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '', city: '', address: '', phone: '', owner_id: '', total_batteries: '', revenue_share: ''
  });
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [deleteStoreConfirm, setDeleteStoreConfirm] = useState(null);
  const [franchiseeUsers, setFranchiseeUsers] = useState([]);
  // 代理编辑表单
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [agentForm, setAgentForm] = useState({ commission: '', revenue_share: '', region: '', city: '' });
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  // 已售电池
  const [soldStats, setSoldStats] = useState(null);
  const [soldBatteries, setSoldBatteries] = useState([]);
  const [soldOrders, setSoldOrders] = useState([]);
  const [soldPage, setSoldPage] = useState(1);
  const [soldTotal, setSoldTotal] = useState(0);

  const sortedSoldBatteries = sortByConfig(soldBatteries, 'sold-batteries', (a, b, key) => {
    let valA, valB;
    switch (key) {
      case 'unit_code': valA = (a.unit_code || '').toLowerCase(); valB = (b.unit_code || '').toLowerCase(); break;
      case 'asset_name': valA = (a.asset_name || '').toLowerCase(); valB = (b.asset_name || '').toLowerCase(); break;
      case 'investor_name': valA = (a.investor_name || '').toLowerCase(); valB = (b.investor_name || '').toLowerCase(); break;
      case 'brand_model': valA = (a.battery_assets?.battery_type || '').toLowerCase(); valB = (b.battery_assets?.battery_type || '').toLowerCase(); break;
      case 'site_name': valA = (a.site_name || a.site_code || '').toLowerCase(); valB = (b.site_name || b.site_code || '').toLowerCase(); break;
      case 'battery_level': valA = a.sensor_battery_level != null ? a.sensor_battery_level : -1; valB = b.sensor_battery_level != null ? b.sensor_battery_level : -1; break;
      case 'gps': valA = (a.sensor_latitude != null ? `${a.sensor_latitude},${a.sensor_longitude}` : '').toLowerCase(); valB = (b.sensor_latitude != null ? `${b.sensor_latitude},${b.sensor_longitude}` : '').toLowerCase(); break;
      case 'health_status': {
        const ha = computeBatteryHealth(a.sensor_battery_level, a.sensor_temperature, a.sensor_cycle_count).status;
        const hb = computeBatteryHealth(b.sensor_battery_level, b.sensor_temperature, b.sensor_cycle_count).status;
        valA = ha; valB = hb;
        break;
      }
      case 'sold_price': valA = a.battery_assets?.unit_price ?? 0; valB = b.battery_assets?.unit_price ?? 0; break;
      case 'created_at': valA = a.created_at || ''; valB = b.created_at || ''; break;
      default: return { valA: 0, valB: 0 };
    }
    return { valA, valB };
  });

  // 我的资产
  const [myWorkers, setMyWorkers] = useState([]);
  const [myWorkersLoading, setMyWorkersLoading] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [isEditingWorker, setIsEditingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({ id: '', name: '', age: '', id_number: '', phone: '', photo_url: '' });
  const [workerSubmitting, setWorkerSubmitting] = useState(false);

  // 我的仓库
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [selectedWarehouseLang, setSelectedWarehouseLang] = useState('zh-CN');
  const [isEditingWarehouse, setIsEditingWarehouse] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ id: '', warehouse_code: '', name: '', address: '', manager_id: '' });
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [assetSubTab, setAssetSubTab] = useState('workers'); // 'workers' | 'warehouses' | 'siteTypes'

  // 已售电池列表中的单个派工弹窗
  const [dispatchBattery, setDispatchBattery] = useState(null);
  const [dispatchWorkerId, setDispatchWorkerId] = useState('');
  const [dispatchWorkers, setDispatchWorkers] = useState([]);
  const [dispatchSiteId, setDispatchSiteId] = useState('');
  const [dispatchSites, setDispatchSites] = useState([]);
  const [dispatchSingleSubmitting, setDispatchSingleSubmitting] = useState(false);
  // 已售电池批量派工
  const [selectedBatteryIds, setSelectedBatteryIds] = useState([]);
  const [showBatchDispatch, setShowBatchDispatch] = useState(false);
  const [batchDispatchSiteId, setBatchDispatchSiteId] = useState('');
  const [batchDispatchWorkerId, setBatchDispatchWorkerId] = useState('');
  const [batchDispatchSites, setBatchDispatchSites] = useState([]);
  const [batchDispatchWorkers, setBatchDispatchWorkers] = useState([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  // 派工数据缓存（模块级 ref，避免每次弹窗重新请求站点+工人）
  const dispatchCacheRef = useRef({ sites: null, workers: null });

  const toggleBatterySelection = (unitId) => {
    setSelectedBatteryIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const toggleAllBatteries = () => {
    if (selectedBatteryIds.length === soldBatteries.length) {
      setSelectedBatteryIds([]);
    } else {
      setSelectedBatteryIds(soldBatteries.map(b => b.id));
    }
  };

  // 预加载派工所需的站点+工人数据（页面级缓存，避免每次弹窗重新请求）
  // 使用 ?fields=dispatch 精简查询字段，大幅降低 API 响应体积
  const preloadDispatchData = async () => {
    if (dispatchCacheRef.current.sites && dispatchCacheRef.current.workers) return;
    try {
      const token = localStorage.getItem('token');
      const [sitesRes, workersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/operation-sites?fields=dispatch`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/admin/workers?fields=dispatch`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      ]);
      dispatchCacheRef.current = {
        sites: sitesRes || [],
        workers: workersRes || []};
    } catch (e) {
      // silent — 弹窗打开时回退到实时请求
    }
  };

  // 从缓存获取站点，缓存缺失时实时请求
  const getDispatchSites = async (batteryTypes) => {
    const getAllSites = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/operation-sites?fields=dispatch`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          dispatchCacheRef.current.sites = data || [];
          return data || [];
        }
      } catch (e) { /* fall through */ }
      return dispatchCacheRef.current.sites || [];
    };
    const sites = dispatchCacheRef.current.sites || await getAllSites();
    return sites;
  };

  // 从缓存获取工人，缓存缺失时实时请求
  const getDispatchWorkers = async () => {
    if (dispatchCacheRef.current.workers) return dispatchCacheRef.current.workers;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/workers?fields=dispatch`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        dispatchCacheRef.current.workers = data || [];
        return data || [];
      }
    } catch (e) {
      return dispatchCacheRef.current.workers || [];
    }
  };

  const openBatteryBatchDispatch = async () => {
    if (selectedBatteryIds.length === 0) return;
    // 先打开弹窗，数据异步加载到下拉框
    setShowBatchDispatch(true);
    setBatchDispatchSiteId('');
    setBatchDispatchWorkerId('');
    setBatchDispatchSites([]);
    setBatchDispatchWorkers([]);
    try {
      const selected = soldBatteries.filter(b => selectedBatteryIds.includes(b.id));
      const types = Array.from(new Set(selected.map(b => b.battery_assets?.battery_type).filter(Boolean)));
      const [sites, workers] = await Promise.all([
        getDispatchSites(types),
        getDispatchWorkers(),
      ]);
      setBatchDispatchSites(sites);
      setBatchDispatchWorkers(workers);
    } catch (e) {
      setBatchDispatchSites([]);
      setBatchDispatchWorkers([]);
    }
  };

  const handleBatteryBatchDispatch = async () => {
    if (!batchDispatchSiteId || !batchDispatchWorkerId || selectedBatteryIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      const selectedSite = batchDispatchSites.find(s => s.id == batchDispatchSiteId);
      const siteName = selectedSite ? (selectedSite.name || selectedSite.site_code || '') : '';
      const r = await adminAPI.dispatchBatteries({
        battery_ids: selectedBatteryIds,
        worker_id: batchDispatchWorkerId,
        site_id: batchDispatchSiteId
      });
      const wecomHint = r.webhook_sent ? '企业微信通知已发送' : '（企业微信Webhook未配置，仅记录）';
      alert(`批量派发成功！${r.dispatched_count} 个电池已派给 ${r.worker_name || ''}，派往站点：${siteName}。${wecomHint}`);
      // 更新缓存中站点剩余数量
      if (dispatchCacheRef.current.sites) {
        dispatchCacheRef.current.sites = dispatchCacheRef.current.sites.map(s =>
          s.id == batchDispatchSiteId ? { ...s, remaining: Math.max(0, (s.remaining ?? s.battery_count ?? 0) - selectedBatteryIds.length) } : s
        );
      }
      setShowBatchDispatch(false);
      setSelectedBatteryIds([]);
      setBatchDispatchSiteId('');
      setBatchDispatchWorkerId('');
      // 刷新已售电池列表
      try { const r2 = await adminAPI.getSoldBatteries(soldPage); setSoldBatteries(r2.batteries || []); setSoldTotal(r2.total || 0); } catch (e) {}
    } catch (e) {
      alert(e.message || '批量派发失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadData();
    loadBatteryTypes();
  }, [user, activeTab]);

  const loadBatteryTypes = async () => {
    try {
      const res = await batteryTypesAPI.getList();
      setBatteryTypes((res.battery_types || res.types || []).filter(t => t.is_active !== false));
    } catch (e) { /* silent */ }
  };

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'dashboard': setStats(await adminAPI.getDashboard()); break;
        case 'users': { const r = await adminAPI.getUsers(1, 100); setUsers(r.users || []); } break;
        case 'assets': { const r = await adminAPI.getAssets(); setAssets(r.assets || []); try { const wh = await adminAPI.getWarehouses(); setWarehouses(wh || []); } catch(e){} } break;
        case 'stores': { const r = await adminAPI.getStores(); setStores(r.stores || []); } break;
        case 'applications': { const r = await adminAPI.getApplications(); setApplications(r.applications || []); } break;
        case 'agent-applications': { const r = await adminAPI.getAgentApplications(); setAgentApplications(r.applications || []); } break;
        case 'managed-agents': { const r = await adminAPI.getManagedAgents(); setManagedAgents(r.agents || []); } break;
        case 'sold-batteries': { const config = sortConfigs['sold-batteries']; const sortKey = config?.key || ''; const sortDirection = config?.direction || 'asc'; const r = await adminAPI.getSoldBatteries(1, 20, sortKey, sortDirection); setSoldStats(r.stats); setSoldBatteries(r.batteries || []); setSoldOrders(r.recent_orders || []); setSoldTotal(r.total || 0); preloadDispatchData(); } break;
        case 'my-workers':
          setMyWorkersLoading(true);
          setWarehousesLoading(true);
          setSiteTypesLoading(true);
          try {
            const [workersData, whData] = await Promise.all([
              adminAPI.getWorkers(),
              adminAPI.getWarehouses(),
            ]);
            setMyWorkers(workersData || []);
            setWarehouses(whData || []);
            setEmployeeOptions(workersData || []);
          } catch (e) { /* silent */ }
          finally {
            setMyWorkersLoading(false);
            setWarehousesLoading(false);
          }
          // siteTypes 独立加载，不阻塞页面渲染
          adminAPI.getSiteTypes()
            .then(stData => setSiteTypes(stData?.site_types || []))
            .catch(() => {})
            .finally(() => setSiteTypesLoading(false));
          break;
        case 'configs': { const r = await adminAPI.getConfigs(); setConfigs(r.configs || []); } break;
        case 'withdrawals': { const r = await adminAPI.getWithdrawals(); setWithdrawals(r.withdrawals || []); } break;
        case 'kyc': { const r = await adminAPI.getKycList(); setKycUsers(r.users || []); } break;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReviewApplication = async (id, status) => {
    try {
      await adminAPI.reviewApplication(id, { status, reviewed_by: user?.id });
      alert(`已${status === 'approved' ? '批准' : '拒绝'}申请`);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleKycReview = async (userId, status) => {
    if (status === 'kyc_rejected') {
      setRejectingKycUser(userId);
      setRejectReason('');
      return;
    }
    try {
      await adminAPI.reviewKyc(userId, { status });
      alert('已通过实名认证');
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const confirmKycReject = async () => {
    if (!rejectReason) { alert('请选择驳回原因'); return; }
    try {
      await adminAPI.reviewKyc(rejectingKycUser, { status: 'kyc_rejected', rejection_reason: rejectReason });
      alert('已驳回实名认证');
      setRejectingKycUser(null);
      setRejectReason('');
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleReviewAgentApplication = async (id, status) => {
    try {
      await adminAPI.reviewAgentApplication(id, { status, reviewed_by: user?.id });
      alert(`已${status === 'approved' ? '批准' : '拒绝'}代理申请`);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleReviewWithdrawal = async (id, action) => {
    try {
      const payload = { action };
      if (action === 'reject') {
        const reason = prompt('驳回原因（可选）:');
        if (reason !== null) payload.reason = reason;
      }
      await adminAPI.reviewWithdrawal(id, payload);
      alert(`已${action === 'approve' ? '通过' : '驳回'}提现申请`);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleAssetAction = async (assetId, action) => {
    try {
      if (action === 'delete') {
        if (!confirm('确认删除此资产？此操作将软删除（标记为已下架）。')) return;
        await adminAPI.deleteAsset(assetId);
      } else {
        await adminAPI.updateAssetStatus(assetId, action);
      }
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  // 打开新增表单
  const openAddAssetForm = () => {
    setIsEditing(false);
    setEditingAssetId(null);
    setAssetForm({ asset_code: '', name: '', name_i18n: { ...EMPTY_I18N }, description: '', description_i18n: { ...EMPTY_I18N }, battery_type: 'swap', battery_type_id: '', total_units: '', unit_price_rmb: '', expected_roi: '', monthly_rent: '', location: '', station_id: '', warehouse_id: '' }); setSelectedAssetLang('zh-CN');
    setShowAssetForm(true);
  };

  // 打开编辑表单
  const openEditAssetForm = (asset) => {
    setIsEditing(true);
    setEditingAssetId(asset.id);
    const matchedType = batteryTypes.find(bt => bt.name === asset.battery_type);
    const parseI18nA = (v) => { if (v && typeof v === 'object') { const f = { ...EMPTY_I18N }; for (const l of LANGUAGES) { if (v[l.code]) f[l.code] = v[l.code]; } return f; } return { ...EMPTY_I18N }; };
    const nameI18nA = parseI18nA(asset.name_i18n);
    const descI18nA = parseI18nA(asset.description_i18n);
    if (!asset.name_i18n && asset.name) nameI18nA['zh-CN'] = asset.name;
    if (!asset.description_i18n && asset.description) descI18nA['zh-CN'] = asset.description;
    setSelectedAssetLang('zh-CN');
    setAssetForm({
      asset_code: asset.asset_code || '',
      name: asset.name || '', name_i18n: nameI18nA,
      description: asset.description || '', description_i18n: descI18nA,
      battery_type: asset.battery_type || 'swap',
      battery_type_id: asset.battery_type_id || matchedType?.id || '',
      total_units: String(asset.total_units || ''),
      unit_price_rmb: asset.unit_price_rmb != null ? String((asset.unit_price_rmb / 7.25).toFixed(2)) : '',
      expected_roi: matchedType?.annualized_return != null ? String(matchedType.annualized_return) : String(asset.expected_roi || ''),
      monthly_rent: matchedType?.monthly_rent != null ? String(matchedType.monthly_rent) : (asset.monthly_rent != null ? String(asset.monthly_rent) : ''),
      location: asset.location || '',
      station_id: asset.station_id || '',
      warehouse_id: asset.warehouse_id || ''});
    setShowAssetForm(true);
  };

  // 提交新增/编辑
  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    const { asset_code, name, total_units, unit_price_rmb } = assetForm;
    if (!asset_code.trim() || !name.trim() || !total_units || !unit_price_rmb) {
      alert('请填写必填项：代码、名称、总量、单价(USD)');
      return;
    }
    setAssetSubmitting(true);
    try {
      const buildI18nA = (obj) => { const r = {}; let h = false; for (const l of LANGUAGES) { if (obj[l.code]?.trim()) { r[l.code] = obj[l.code].trim(); h = true; } } return h ? r : null; };
      const payload = {
        asset_code: asset_code.trim(),
        name: name.trim(),
        name_i18n: buildI18nA(assetForm.name_i18n || {}),
        description: assetForm.description.trim(),
        description_i18n: buildI18nA(assetForm.description_i18n || {}),
        battery_type: assetForm.battery_type,
        battery_type_id: assetForm.battery_type_id || undefined,
        total_units: parseInt(total_units),
        unit_price_rmb: parseFloat(unit_price_rmb) * 7.25,
        monthly_rent: assetForm.monthly_rent ? parseFloat(assetForm.monthly_rent) : undefined,
        expected_roi: assetForm.expected_roi ? parseFloat(assetForm.expected_roi) : undefined,
        location: (assetForm.location || '').trim(),
        station_id: assetForm.station_id || undefined,
        warehouse_id: assetForm.warehouse_id || undefined};
      if (isEditing) {
        if (!editingAssetId) { alert('编辑状态异常，请重新打开编辑表单'); setAssetSubmitting(false); return; }
        await adminAPI.updateAsset(editingAssetId, payload);
        alert('资产已更新');
      } else {
        await adminAPI.createAsset(payload);
        alert('资产已创建');
      }
      setShowAssetForm(false);
      loadData();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setAssetSubmitting(false); }
  };

  // JSON批量导入电池资产
  const handleJsonImport = async () => {
    if (!jsonImportText.trim()) { alert('请输入JSON数据'); return; }
    let assets;
    try { assets = JSON.parse(jsonImportText); }
    catch (e) { alert('JSON格式错误: ' + e.message); return; }
    const list = Array.isArray(assets) ? assets : [assets];
    if (list.length === 0) { alert('JSON数组为空'); return; }
    if (!window.confirm(`即将批量创建 ${list.length} 个电池资产，确认？`)) return;
    setJsonImporting(true);
    let okCount = 0, failCount = 0;
    for (const item of list) {
      try {
        await adminAPI.createAsset({
          asset_code: item.asset_code || item.code || '',
          name: item.name || '',
          description: item.description || '',
          battery_type: item.battery_type || 'swap',
          total_units: parseInt(item.total_units) || 1,
          unit_price_rmb: parseFloat(item.unit_price_rmb) || 0,
          monthly_rent: item.monthly_rent ? parseFloat(item.monthly_rent) : undefined,
          location: item.location || '',
          station_id: item.station_id || '',
          address: item.address || ''});
        okCount++;
      } catch (e) { failCount++; }
    }
    setMessage({ type: okCount > 0 ? 'success' : 'error', text: `批量导入完成：成功 ${okCount}，失败 ${failCount}` });
    setJsonImporting(false);
    setShowJsonImport(false);
    setJsonImportText('');
    loadData();
  };

  // 生成模拟传感器数据
  const generateMockSensorData = async (assetId, batteryType) => {
    try {
      const res = await adminAPI.getBatteryUnits(assetId);
      const units = res.units || [];
      const mockData = units.map((u, i) => {
        const baseLevel = 60 + Math.floor(Math.random() * 35); // 60-95%
        const baseTemp = 20 + Math.random() * 20; // 20-40°C
        const cycles = Math.floor(Math.random() * 500);
        const healthRand = Math.random();
        // 模拟金边附近GPS坐标 (11.55~11.58N, 104.88~104.93E)
        const lng = 104.88 + Math.random() * 0.05;
        const lat = 11.55 + Math.random() * 0.03;
        return {
          unit_code: u.unit_code,
          sensor_battery_level: Math.min(100, baseLevel + Math.floor(Math.random() * 10 - 5)),
          sensor_temperature: Math.round((baseTemp + Math.random() * 5 - 2.5) * 100) / 100,
          sensor_cycle_count: cycles,
          sensor_last_online: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
          sensor_longitude: Math.round(lng * 1000000) / 1000000,
          sensor_latitude: Math.round(lat * 1000000) / 1000000};
      });
      return mockData;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  // 打开传感器导入弹窗
  const openSensorImport = async (asset) => {
    setSensorTargetAsset(asset);
    setShowSensorModal(true);
    const mockData = await generateMockSensorData(asset.id, asset.battery_type);
    setSensorJsonText(JSON.stringify(mockData, null, 2));
  };

  // 传感器JSON批量导入
  const handleSensorImport = async () => {
    if (!sensorJsonText.trim()) { alert('请输入传感器JSON数据'); return; }
    let sensorData;
    try { sensorData = JSON.parse(sensorJsonText); }
    catch (e) { alert('JSON格式错误: ' + e.message); return; }
    const list = Array.isArray(sensorData) ? sensorData : [sensorData];
    if (list.length === 0) { alert('JSON数组为空'); return; }
    if (!window.confirm(`即将为 ${list.length} 颗电池更新传感器数据，确认？`)) return;
    setSensorImporting(true);
    try {
      const res = await adminAPI.batchUpdateSensor(sensorTargetAsset.id, { units: list });
      alert(res.message || `传感器数据更新完成`);
      setShowSensorModal(false);
      setSensorJsonText('');
      setSensorTargetAsset(null);
    } catch (e) {
      alert('导入失败: ' + (e.message || '未知错误'));
    }
    setSensorImporting(false);
  };

  const loadSoldPage = async (p) => {
    try {
      const config = sortConfigs['sold-batteries'];
      const sortKey = config?.key || '';
      const sortDirection = config?.direction || 'asc';
      const r = await adminAPI.getSoldBatteries(p, 20, sortKey, sortDirection);
      setSoldBatteries(r.batteries || []);
      setSoldPage(p);
    } catch (e) { console.error(e); }
  };

  // --- 门店编辑/删除/状态切换 ---
  const openEditStore = async (store) => {
    setIsEditingStore(true);
    setEditingStoreId(store.id);
    setStoreForm({
      name: store.name || '',
      city: store.city || '',
      address: store.address || '',
      phone: store.phone || '',
      owner_id: store.owner_id || '',
      total_batteries: store.total_batteries ?? '',
      revenue_share: store.revenue_share ?? ''
    });
    setShowStoreForm(true);
    // 加载可选的加盟商/店主用户列表
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/users?page=1&limit=200&role=franchisee`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFranchiseeUsers(data.users || []);
      }
    } catch (e) { /* silent */ }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setStoreSubmitting(true);
    try {
      const body = {
        name: storeForm.name,
        city: storeForm.city || null,
        address: storeForm.address || null,
        phone: storeForm.phone || null};
      if (isEditingStore) {
        body.owner_id = storeForm.owner_id || null;
        body.total_batteries = storeForm.total_batteries !== '' ? Number(storeForm.total_batteries) : undefined;
      }
      body.revenue_share = storeForm.revenue_share !== '' ? Number(storeForm.revenue_share) : undefined;

      if (isEditingStore) {
        await adminAPI.updateStore(editingStoreId, body);
      } else {
        await adminAPI.createStore(body);
      }
      setMessage({ type: 'success', text: isEditingStore ? '门店已更新' : '门店已创建' });
      setShowStoreForm(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '操作失败' });
    } finally {
      setStoreSubmitting(false);
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (!window.confirm(`确定将门店「${storeName}」设为停业状态？`)) return;
    try {
      await adminAPI.deleteStore(storeId);
      setMessage({ type: 'success', text: `门店「${storeName}」已停业` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: '操作失败' });
    }
  };

  const handleStoreStatus = async (storeId, newStatus, storeName) => {
    const statusLabel = { active: '营业中', suspended: '暂停营业', closed: '已停业' };
    if (newStatus === 'closed' && !window.confirm(`确定将门店「${storeName}」设为已停业？此操作不可逆。`)) return;
    try {
      await adminAPI.updateStoreStatus(storeId, newStatus);
      setMessage({ type: 'success', text: `门店状态已更新为「${statusLabel[newStatus]}」` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: '状态更新失败' });
    }
  };

  // === 代理编辑 ===
  const openEditAgentForm = (agent) => {
    setEditingAgentId(agent.id);
    setAgentForm({
      commission: agent.commission != null ? String(agent.commission) : '',
      revenue_share: agent.revenue_share != null ? String(agent.revenue_share) : '',
      region: agent.region || '',
      city: agent.city || ''});
    setShowAgentForm(true);
  };

  const handleAgentSave = async (e) => {
    e.preventDefault();
    setAgentSubmitting(true);
    try {
      const payload = {};
      if (agentForm.commission !== '') payload.commission = parseFloat(agentForm.commission);
      if (agentForm.revenue_share !== '') payload.revenue_share = parseFloat(agentForm.revenue_share);
      if (agentForm.region) payload.region = agentForm.region;
      if (agentForm.city) payload.city = agentForm.city;
      await adminAPI.updateManagedAgent(editingAgentId, payload);
      setShowAgentForm(false);
      loadData();
    } catch (e) { alert(e.message || '保存失败'); }
    finally { setAgentSubmitting(false); }
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`确定撤销代理「${agentName}」？此操作不可逆。`)) return;
    try {
      await adminAPI.deleteManagedAgent(agentId);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">{t('common.loading')}</div>;

  if (message) {
    setTimeout(() => setMessage(null), 4000);
  }

  const tabs = [
    { key: 'dashboard', label: '数据看板', icon: BarChart3 },
    { key: 'assets', label: '电池管理', icon: Battery },
    { key: 'battery-types', label: '电池类型', icon: Zap, link: '/admin/battery-types' },
    { key: 'sold-batteries', label: '已售电池', icon: Cpu },
    { key: 'operation-sites', label: '运营站点', icon: MapPin, link: '/admin/operation-sites' },
    { key: 'franchise-applications', label: '加盟审批', icon: FileText, link: '/admin/franchise-applications' },
    { key: 'swap-stations', label: '换电站模板', icon: BatteryCharging, link: '/admin/swap-stations' },
    { key: 'stores', label: '门店管理', icon: Store },
    { key: 'applications', label: '加盟审核', icon: ClipboardList },
    { key: 'agent-applications', label: '省级代理审批', icon: Users },
    { key: 'managed-agents', label: '我的代理', icon: BadgeCheck },
    { key: 'my-workers', label: '我的资产', icon: Users },
    { key: 'withdrawals', label: '提现审批', icon: DollarSign },
    { key: 'users', label: '用户管理', icon: Users },
    { key: 'kyc', label: '实名审核', icon: Shield },
    { key: 'configs', label: '系统配置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">电池换电平台 · {user?.role === 'admin' ? '超级管理员' : '运营方'}</p>
        </div>
      </div>

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { if (t.link) { router.push(t.link); return; } setActiveTab(t.key); setLoading(true); }}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 whitespace-nowrap text-xs 2xl:text-sm font-medium transition ${
                  activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right text-gray-400 hover:text-gray-600">&times;</button>
          </div>
        )}
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-5"><Users className="h-5 w-5 text-blue-500 mb-2" /><div className="text-3xl font-bold">{stats.users?.total_users || 0}</div><div className="text-sm text-gray-400">总用户</div></div>
              <div className="bg-white rounded-xl border p-5"><DollarSign className="h-5 w-5 text-green-500 mb-2" /><div className="text-3xl font-bold">${(stats.users?.total_investment || 0).toFixed(0)}</div><div className="text-sm text-gray-400">总投资额</div></div>
              <div className="bg-white rounded-xl border p-5"><TrendingUp className="h-5 w-5 text-purple-500 mb-2" /><div className="text-3xl font-bold">{stats.trades?.total_trades || 0}</div><div className="text-sm text-gray-400">交易数</div></div>
              <div className="bg-white rounded-xl border p-5"><Battery className="h-5 w-5 text-orange-500 mb-2" /><div className="text-3xl font-bold">{stats.assets?.total_units || 0}</div><div className="text-sm text-gray-400">电池总量</div></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">资产概览</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500">电池资产总数</span><span className="font-semibold">{stats.assets?.total_assets || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">总份数</span><span className="font-semibold">{stats.assets?.total_units || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">可用份数</span><span className="font-semibold text-green-600">{stats.assets?.available_units || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">已售份数</span><span className="font-semibold">{stats.assets?.sold_units || 0}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">分红概览</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500">分红期数</span><span className="font-semibold">{stats.dividends?.total_dividends || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">累计分红金额</span><span className="font-semibold text-green-600">${(stats.dividends?.total_dividend_amount || 0).toFixed(0)}</span><span className="text-xs text-gray-400 ml-2">≈ ¥{((stats.dividends?.total_dividend_amount || 0) * 7.25).toFixed(0)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">已分配分红</span><span className="font-semibold">${(stats.users?.total_dividends_distributed || 0).toFixed(0)}</span></div>
                </div>
              </div>
            </div>

            {stats.finance && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-gray-900 mb-4">财务总览</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-500">投资者购买电池</span><span className="font-semibold">{stats.finance.total_battery_purchases || 0} 笔 / ${(stats.finance.total_battery_purchase_amount || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">投资者充值总额</span><span className="font-semibold text-green-600">${(stats.finance.total_recharge || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">提现总额（已批准）</span><span className="font-semibold">${(stats.finance.total_withdrawal_approved || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">提现待审批</span><span className="font-semibold text-orange-600">${(stats.finance.total_withdrawal_pending || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">上级佣金汇总（估算）</span><span className="font-semibold">${(stats.finance.total_agent_commission || 0).toFixed(0)}</span><span className="text-xs text-gray-400 ml-2">≈ ¥{((stats.finance.total_agent_commission || 0) * 7.25).toFixed(0)}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-gray-900 mb-4">平台分账 & 回购</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-500">平台分红留存</span><span className="font-semibold text-purple-600">${(stats.finance.total_platform_dividend_share || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">平台手续费</span><span className="font-semibold">${(stats.finance.total_platform_fees || 0).toFixed(0)}</span><span className="text-xs text-gray-400 ml-2">≈ ¥{((stats.finance.total_platform_fees || 0) * 7.25).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">平台回购笔数</span><span className="font-semibold">{stats.finance.total_buyback_count || 0} 笔</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">平台回购金额</span><span className="font-semibold text-blue-600">${(stats.finance.total_buyback_amount || 0).toFixed(0)}</span><span className="text-xs text-gray-400 ml-2">≈ ¥{((stats.finance.total_buyback_amount || 0) * 7.25).toFixed(0)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {stats.finance && stats.finance.battery_type_sales && stats.finance.battery_type_sales.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">电池资产销售分布</h3>
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">电池名称</th><th className="text-right p-3">售出份数</th><th className="text-right p-3">销售金额</th></tr></thead>
                  <tbody>{(stats.finance.battery_type_sales || []).map(s => (
                    <tr key={s.name} className="border-t"><td className="p-3 font-medium">{s.name}</td><td className="p-3 text-right">{s.units || 0}</td><td className="p-3 text-right"><span className="text-green-600 font-semibold">${(s.amount || 0).toFixed(0)}</span><span className="text-xs text-gray-400 ml-1">≈ ¥{((s.amount || 0) * 7.25).toFixed(0)}</span></td></tr>
                  ))}</tbody></table>
              </div>
            )}

            {stats.recentUsers && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">最近注册用户</h3>
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">用户名</th><th className="text-left p-3">邮箱</th><th className="text-left p-3">角色</th><th className="text-right p-3">投资额</th><th className="text-right p-3">注册时间</th></tr></thead>
                  <tbody>{(stats.recentUsers || []).map(u => (
                    <tr key={u.id} className="border-t"><td className="p-3 font-medium">{u.username}</td><td className="p-3 text-gray-500">{u.email}</td><td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'operator' ? 'bg-blue-100 text-blue-700' : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-600'}`}>{u.role === 'admin' ? <><Shield className="h-3 w-3" />管理员</> : u.role === 'operator' ? <><Settings className="h-3 w-3" />运营方</> : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? <><Shield className="h-3 w-3" />省级总代理</> : u.agent_type === 'city_franchisee' ? <><Building2 className="h-3 w-3" />市级加盟商</> : u.agent_type === 'district_franchisee' ? <><MapPin className="h-3 w-3" />区县加盟店</> : <><Store className="h-3 w-3" />加盟商</>) : <><Users className="h-3 w-3" />投资者</>}</span></td><td className="p-3 text-right">${(u.total_investment || 0).toFixed(0)}</td><td className="p-3 text-right text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td></tr>
                  ))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* Assets */}
        {activeTab === 'assets' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">电池资产管理</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowJsonImport(true); setJsonImportText(JSON.stringify([
                  { "asset_code": "BAT-CAMB-010", "name": "暹粒换电电池组A", "battery_type": "swap", "total_units": 100, "unit_price_rmb": 7250, "monthly_rent": 80, "location": "Siem Reap", "address": "柬埔寨暹粒省暹粒市6号国道旁" },
                  { "asset_code": "BAT-CAMB-011", "name": "金边机场换电站电池", "battery_type": "swap", "total_units": 200, "unit_price_rmb": 7500, "monthly_rent": 85, "location": "Phnom Penh", "station_id": "STN-PNH-02", "address": "柬埔寨金边机场路55号" },
                  { "asset_code": "BAT-CAMB-012", "name": "马德望集装箱储能", "battery_type": "container", "total_units": 50, "unit_price_rmb": 50000, "monthly_rent": 500, "location": "Battambang", "address": "柬埔寨马德望省工业园A区" }
                ], null, 2)); }}
                  className="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
                  <Cpu className="h-4 w-4" />批量导入JSON
                </button>
                <button onClick={openAddAssetForm}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  <Plus className="h-4 w-4" />新增电池
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'asset_code')}>代码{getSortIndicator('assets', 'asset_code')}</th>
                  <th className="text-left p-4">名称</th>
                  <th className="text-left p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'battery_type')}>类型{getSortIndicator('assets', 'battery_type')}</th>
                  <th className="text-right p-4">总量</th><th className="text-right p-4">可用</th><th className="text-right p-4">库存</th><th className="text-right p-4">已售</th>
                  <th className="text-right p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'unit_price')}>单价(USD){getSortIndicator('assets', 'unit_price')}</th>
                  <th className="text-right p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'annualized_return')}>年化{getSortIndicator('assets', 'annualized_return')}</th>
                  <th className="text-right p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'monthly_rent')}>月租金（USD）{getSortIndicator('assets', 'monthly_rent')}</th>
                  <th className="text-left p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'warehouse')}>仓库地址{getSortIndicator('assets', 'warehouse')}</th>
                  <th className="text-center p-4 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('assets', 'status')}>状态{getSortIndicator('assets', 'status')}</th>
                  <th className="text-center p-4">操作</th>
                </tr></thead>
                <tbody>
                  {sortedAssets.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs">{a.asset_code}</td>
                      <td className="p-4 font-medium">{a.name}</td>
                      <td className="p-4 text-gray-500">{(() => { const bt = batteryTypes.find(bt => bt.id === a.battery_type_id) || batteryTypes.find(bt => bt.name === a.battery_type); return bt ? (bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name) : a.battery_type; })()}</td>
                      <td className="p-4 text-right">{a.total_units}</td>
                      <td className="p-4 text-right text-green-600 font-semibold">{a.available_units}</td>
                      <td className="p-4 text-right font-semibold">{a.stock ?? a.available_units}</td>
                      <td className="p-4 text-right text-gray-500">{a.sold_units ?? (a.total_units - a.available_units)}</td>
                                            <td className="p-4 text-right"><div className="font-semibold">${a.battery_type_unit_price ?? a.unit_price}</div><div className="text-xs text-gray-400">{a.unit_price_rmb != null ? `≈ ¥${a.unit_price_rmb}` : '—'}</div></td>
                      <td className="p-4 text-right">{a.battery_type_annualized_return != null ? `${a.battery_type_annualized_return}%` : a.expected_roi != null ? `${a.expected_roi}%` : '—'}</td>
                      <td className="p-4 text-right">{(a.battery_type_monthly_rent ?? a.monthly_rent) != null ? (() => { const dc = localeCurrency(a.battery_type_monthly_rent ?? a.monthly_rent, i18n.language); return <><div className="text-gray-700 font-semibold">{dc.primary} /月</div></>; })() : '—'}</td>
                      <td className="p-4 text-xs text-gray-600 max-w-[180px] truncate" title={a.warehouse_name || a.location || '—'}>{a.warehouse_name || a.location || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'active' ? 'bg-green-100 text-green-700' : a.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'active' ? '上架' : a.status === 'paused' ? '暂停' : '下架'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openSensorImport(a)}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="传感器导入">
                            <Cpu className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEditAssetForm(a)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="编辑">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <select onChange={e => { if (e.target.value) handleAssetAction(a.id, e.target.value); e.target.value = ''; }}
                            className="text-xs border rounded px-1.5 py-1 bg-white w-16">
                            <option value="">状态</option>
                            <option value="active">上架</option>
                            <option value="paused">暂停</option>
                            <option value="closed">下架</option>
                          </select>
                          <button onClick={() => handleAssetAction(a.id, 'delete')}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="删除">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Battery className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>暂无电池资产</p>
                  <button onClick={openAddAssetForm} className="text-blue-600 hover:underline text-sm mt-1">点击新增</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stores */}
        {activeTab === 'stores' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">加盟门店管理</h2>
              <button onClick={() => { setStoreForm({ name: '', city: '', address: '', phone: '', owner_id: '', total_batteries: '', revenue_share: '' }); setIsEditingStore(false); setEditingStoreId(null); setShowStoreForm(true); }}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Plus className="h-4 w-4" />新增门店
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'store_code')}>编码{getSortIndicator('stores', 'store_code')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'name')}>门店名称{getSortIndicator('stores', 'name')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'city')}>城市{getSortIndicator('stores', 'city')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'address')}>地址{getSortIndicator('stores', 'address')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'owner')}>创建者{getSortIndicator('stores', 'owner')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'battery_count')}>电池数量{getSortIndicator('stores', 'battery_count')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'revenue_share')}>分成比例{getSortIndicator('stores', 'revenue_share')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'monthly_sales')}>本月业绩{getSortIndicator('stores', 'monthly_sales')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'total_sales')}>累计业绩{getSortIndicator('stores', 'total_sales')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'status')}>状态{getSortIndicator('stores', 'status')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('stores', 'created_at')}>创建时间{getSortIndicator('stores', 'created_at')}</th>
                  <th className="text-center p-3">操作</th>
                </tr></thead>
                <tbody>
                  {sortedStores.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs text-blue-600">{s.store_code || '—'}</td>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-gray-500">{s.city || '—'}</td>
                      <td className="p-3 text-gray-500 max-w-[140px] truncate" title={s.address || ''}>{s.address || '—'}</td>
                      <td className="p-3 text-gray-500">{s.owner?.username || '-'}</td>
                      <td className="p-3 text-right">{s.battery_count ?? s.total_batteries ?? 0}</td>
                      <td className="p-3 text-right">{((s.revenue_share ?? 0.3) * 100).toFixed(0)}%</td>
                      <td className="p-3 text-right text-green-600 font-semibold">${(s.performance?.monthly_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      <td className="p-3 text-right text-blue-600 font-semibold">${(s.performance?.total_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : s.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>{s.status === 'active' ? '营业中' : s.status === 'pending' ? '待审核' : s.status === 'suspended' ? '暂停营业' : '已停业'}</span>
                        {s.status === 'pending' && s.appeal_reason && (
                          <div className="text-xs text-orange-600 mt-0.5">申诉: {s.appeal_reason}</div>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-400">{s.created_at ? new Date(s.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditStore(s)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="编辑">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {s.status !== 'closed' && s.status !== 'pending' && (
                            <button onClick={() => handleStoreStatus(s.id, s.status === 'active' ? 'suspended' : 'active', s.name)}
                              className="text-orange-600 hover:bg-orange-50 p-1.5 rounded transition" title={s.status === 'active' ? '暂停营业' : '恢复营业'}>
                              {s.status === 'active' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {s.status !== 'closed' && (
                            <button onClick={() => handleDeleteStore(s.id, s.name)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="停业">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {s.status === 'pending' && (
                            <>
                              <button onClick={() => handleStoreStatus(s.id, 'active', s.name)}
                                className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="通过"><Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleStoreStatus(s.id, 'closed', s.name)}
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="拒绝"><X className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stores.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Store className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>暂无门店数据</p>
                  <button onClick={() => { setStoreForm({ name: '', city: '', address: '', phone: '', owner_id: '', total_batteries: '', revenue_share: '' }); setIsEditingStore(false); setEditingStoreId(null); setShowStoreForm(true); }} className="text-blue-600 hover:underline text-sm mt-1">点击新增</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications */}
        {activeTab === 'applications' && (
          <div>
            <h2 className="text-xl font-bold mb-6">加盟申请审核</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'store_name')}>门店名称{getSortIndicator('applications', 'store_name')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'franchisee_code')}>编码{getSortIndicator('applications', 'franchisee_code')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'city')}>城市{getSortIndicator('applications', 'city')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'phone')}>电话{getSortIndicator('applications', 'phone')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'applicant')}>申请人{getSortIndicator('applications', 'applicant')}</th>
                  <th className="text-left p-3">地址</th>
                  <th className="text-left p-3">申请理由</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'status')}>状态{getSortIndicator('applications', 'status')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('applications', 'created_at')}>提交时间{getSortIndicator('applications', 'created_at')}</th>
                  <th className="text-center p-3">操作</th>
                </tr></thead>
                <tbody>
                  {sortedApplications.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{a.store_name}</td>
                      <td className="p-3 font-mono text-xs text-blue-600">{a.franchisee_code || '—'}</td>
                      <td className="p-3 text-gray-500">{a.city || '—'}</td>
                      <td className="p-3 text-gray-500">{a.phone || '—'}</td>
                      <td className="p-3 text-gray-500">{a.user?.username || '-'}</td>
                      <td className="p-3 text-gray-500 max-w-[120px] truncate" title={a.address || ''}>{a.address || '—'}</td>
                      <td className="p-3 text-gray-500 max-w-[140px] truncate" title={a.reason || ''}>{a.reason || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                      </td>
                      <td className="p-3 text-right text-gray-400 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '-'}</td>
                      <td className="p-3 text-center">
                        {a.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleReviewApplication(a.id, 'approved')} className="btn-primary text-sm py-1 px-3 flex items-center space-x-1">
                              <Check className="h-3 w-3" /><span>通过</span></button>
                            <button onClick={() => handleReviewApplication(a.id, 'rejected')} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-100 flex items-center space-x-1">
                              <X className="h-3 w-3" /><span>拒绝</span></button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {applications.length === 0 && <div className="text-center py-12 text-gray-400">暂无申请</div>}
            </div>
          </div>
        )}

        {/* Agent Applications */}
        {activeTab === 'agent-applications' && (
          <div>
            <h2 className="text-xl font-bold mb-6">省级代理审批</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'full_name')}>姓名{getSortIndicator('agent-applications', 'full_name')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'agent_code')}>编码{getSortIndicator('agent-applications', 'agent_code')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'phone')}>电话{getSortIndicator('agent-applications', 'phone')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'region')}>区域{getSortIndicator('agent-applications', 'region')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'city')}>城市{getSortIndicator('agent-applications', 'city')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'applicant')}>申请人{getSortIndicator('agent-applications', 'applicant')}</th>
                  <th className="text-left p-3">申请理由</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'status')}>状态{getSortIndicator('agent-applications', 'status')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('agent-applications', 'created_at')}>提交时间{getSortIndicator('agent-applications', 'created_at')}</th>
                  <th className="text-center p-3">操作</th>
                </tr></thead>
                <tbody>
                  {sortedAgentApplications.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{a.full_name}</td>
                      <td className="p-3 font-mono text-xs text-blue-600">{a.agent_code || '—'}</td>
                      <td className="p-3 text-gray-500">{a.phone || '—'}</td>
                      <td className="p-3 text-gray-500">{a.region || '—'}</td>
                      <td className="p-3 text-gray-500">{a.city || '—'}</td>
                      <td className="p-3 text-gray-500">{a.applicant?.username || '-'}</td>
                      <td className="p-3 text-gray-500 max-w-[140px] truncate" title={a.reason || ''}>{a.reason || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                      </td>
                      <td className="p-3 text-right text-gray-400 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '-'}</td>
                      <td className="p-3 text-center">
                        {a.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleReviewAgentApplication(a.id, 'approved')} className="btn-primary text-sm py-1 px-3 flex items-center space-x-1">
                              <Check className="h-3 w-3" /><span>通过</span></button>
                            <button onClick={() => handleReviewAgentApplication(a.id, 'rejected')} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-100 flex items-center space-x-1">
                              <X className="h-3 w-3" /><span>拒绝</span></button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {agentApplications.length === 0 && <div className="text-center py-12 text-gray-400">暂无代理申请</div>}
            </div>
          </div>
        )}

        {/* Managed Agents — 我的代理 */}
        {activeTab === 'managed-agents' && (
          <div>
            <h2 className="text-xl font-bold mb-6">我的代理</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'full_name')}>姓名{getSortIndicator('managed-agents', 'full_name')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'agent_code')}>编码{getSortIndicator('managed-agents', 'agent_code')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'agent_type')}>代理类型{getSortIndicator('managed-agents', 'agent_type')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'phone')}>电话{getSortIndicator('managed-agents', 'phone')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'email')}>邮箱{getSortIndicator('managed-agents', 'email')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'region')}>区域{getSortIndicator('managed-agents', 'region')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'city')}>城市{getSortIndicator('managed-agents', 'city')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'commission')}>佣金(%){getSortIndicator('managed-agents', 'commission')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'revenue_share')}>分成(%){getSortIndicator('managed-agents', 'revenue_share')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('managed-agents', 'store_count')}>下属门店{getSortIndicator('managed-agents', 'store_count')}</th>
                  <th className="text-center p-3">操作</th>
                </tr></thead>
                <tbody>
                  {sortedManagedAgents.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{a.full_name || a.applicant?.full_name || a.applicant?.username || '—'}</td>
                      <td className="p-3 font-mono text-xs text-blue-600">{a.agent_code || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : a.agent_type === 'city_franchisee' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                        }`}>{a.agent_type === 'province_agent' ? '省级总代理' : a.agent_type === 'city_franchisee' ? '市级加盟商' : '区县加盟商'}</span>
                      </td>
                      <td className="p-3 text-gray-500">{a.applicant?.phone || '—'}</td>
                      <td className="p-3 text-gray-500">{a.applicant?.email || '—'}</td>
                      <td className="p-3 text-gray-500">{a.region || '—'}</td>
                      <td className="p-3 text-gray-500">{a.city || '—'}</td>
                      <td className="p-3 text-right text-blue-600 font-medium">{a.commission != null ? a.commission + '%' : '—'}</td>
                      <td className="p-3 text-right text-purple-600 font-medium">{a.revenue_share != null ? a.revenue_share + '%' : '—'}</td>
                      <td className="p-3 text-right text-gray-500">{a.store_count !== undefined ? a.store_count + ' 家' : '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditAgentForm(a)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition">
                            <Edit className="h-3 w-3" />编辑</button>
                          <button onClick={() => handleDeleteAgent(a.id, a.full_name || a.applicant?.username || '未知')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition">
                            <Trash2 className="h-3 w-3" />撤销</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {managedAgents.length === 0 && <div className="text-center py-12 text-gray-400">暂无已审批代理</div>}
            </div>
          </div>
        )}

        {/* Sold Batteries — 已售电池 */}
        {activeTab === 'sold-batteries' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold">已售电池监控</h2>
            </div>
            {/* 实时统计卡片 */}
            {soldStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{soldStats.total_sold}</div>
                  <div className="text-xs text-gray-500 mt-1">累计售出</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{soldStats.today_sold}</div>
                  <div className="text-xs text-gray-500 mt-1">今日售出</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{soldStats.active_investors}</div>
                  <div className="text-xs text-gray-500 mt-1">活跃投资者</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">${(soldStats.today_revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">今日收入</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">${(soldStats.total_revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">累计收入</div>
                </div>
              </div>
            )}

            {/* 最近购买订单 */}
            <div className="mb-6">
              <h3 className="text-base font-bold mb-3">最近购买记录</h3>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-left p-3">投资者</th><th className="text-left p-3">资产</th>
                    <th className="text-center p-3">数量</th><th className="text-right p-3">单价</th>
                    <th className="text-right p-3">总价</th><th className="text-center p-3">来源</th>
                    <th className="text-right p-3">时间</th>
                  </tr></thead>
                  <tbody>
                    {soldOrders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{o.investor_name}</td>
                        <td className="p-3 text-gray-600">{o.asset_name}</td>
                        <td className="p-3 text-center">{o.units}</td>
                        <td className="p-3 text-right">{o.unit_price ? '$' + o.unit_price : '-'}</td>
                        <td className="p-3 text-right font-medium">${(o.total_amount || 0).toLocaleString()}</td>
                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.order_source === 'staff_registration' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{o.order_source === 'staff_registration' ? '线下' : '线上'}</span></td>
                        <td className="p-3 text-right text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                      </tr>
                    ))}
                    {soldOrders.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">暂无购买记录</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 已售电池详细清单 */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold">电池清单（共 {soldTotal} 块）</h3>
              {(() => {
                if (selectedBatteryIds.length === 0) return null;
                const selectedBatteries = soldBatteries.filter(b => selectedBatteryIds.includes(b.id));
                const batteryTypes = new Set(selectedBatteries.map(b => b.battery_assets?.battery_type).filter(Boolean));
                if (batteryTypes.size !== 1) return null;
                return (
                  <button onClick={openBatteryBatchDispatch}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                    <CheckSquare className="h-4 w-4" />批量派工（{selectedBatteryIds.length}）
                  </button>
                );
              })()}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-center p-3 w-10">
                    <button onClick={toggleAllBatteries} className="text-gray-400 hover:text-blue-600 transition">
                      {selectedBatteryIds.length === soldBatteries.length && soldBatteries.length > 0
                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'unit_code')}>单元编号{getSortIndicator('sold-batteries', 'unit_code')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'asset_name')}>资产名称{getSortIndicator('sold-batteries', 'asset_name')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'investor_name')}>投资者{getSortIndicator('sold-batteries', 'investor_name')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'brand_model')}>品牌型号{getSortIndicator('sold-batteries', 'brand_model')}</th>
                  <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'site_name')}>运营站点{getSortIndicator('sold-batteries', 'site_name')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'battery_level')}>电池电量{getSortIndicator('sold-batteries', 'battery_level')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'gps')}>GPS{getSortIndicator('sold-batteries', 'gps')}</th>
                  <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'health_status')}>健康状态{getSortIndicator('sold-batteries', 'health_status')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'sold_price')}>售价{getSortIndicator('sold-batteries', 'sold_price')}</th>
                  <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('sold-batteries', 'created_at')}>出售时间{getSortIndicator('sold-batteries', 'created_at')}</th>
                  <th className="text-center p-3">派工单</th>
                </tr></thead>
                <tbody>
                  {sortedSoldBatteries.map(b => (
                    <tr key={b.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-center">
                        <button onClick={() => toggleBatterySelection(b.id)} className="text-gray-400 hover:text-blue-600 transition">
                          {selectedBatteryIds.includes(b.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs">{b.unit_code}</td>
                      <td className="p-3 font-medium">{b.asset_name}</td>
                      <td className="p-3">{b.investor_name}</td>
                      <td className="p-3 text-center text-gray-500">{(() => { const btName = b.battery_assets?.battery_type; if (!btName) return '-'; const bt = batteryTypes.find(bt => bt.id === b.battery_assets?.battery_type_id) || batteryTypes.find(bt => bt.name === btName); return bt ? (bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name) : btName; })()}</td>
                      <td className="p-3 text-xs text-gray-600 max-w-[120px] truncate" title={b.site_name || b.site_code || '—'}>{b.site_name || b.site_code || '—'}</td>
                      <td className="p-3 text-center">{b.sensor_battery_level != null ? `${b.sensor_battery_level}%` : '-'}</td>
                      <td className="p-3 text-center font-mono text-xs text-gray-500">
                        {b.sensor_longitude != null && b.sensor_latitude != null
                          ? `${b.sensor_latitude}, ${b.sensor_longitude}`
                          : '-'}
                      </td>
                      <td className="p-3 text-center">
                        {(() => {
                          const h = computeBatteryHealth(b.sensor_battery_level, b.sensor_temperature, b.sensor_cycle_count);
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              h.status === 'normal' ? 'bg-green-100 text-green-700' : h.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>{h.status === 'normal' ? '正常' : h.status === 'warning' ? '警告' : '严重'}</span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        {b.battery_assets?.unit_price != null ? (
                          <><div className="font-semibold">${b.battery_assets.unit_price.toLocaleString()}</div><div className="text-xs text-gray-400">≈ ¥{Math.round(b.battery_assets.unit_price * 7.25).toLocaleString()}</div></>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-right text-gray-400">{b.created_at ? new Date(b.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={async () => {
                            // 先打开弹窗，数据异步加载
                            setDispatchBattery(b);
                            setDispatchWorkerId('');
                            setDispatchSiteId('');
                            setDispatchSites([]);
                            setDispatchWorkers([]);
                            const bt = b.battery_assets?.battery_type || '';
                            const [sites, workers] = await Promise.all([
                              getDispatchSites(bt ? [bt] : []),
                              getDispatchWorkers(),
                            ]);
                            setDispatchSites(sites);
                            setDispatchWorkers(workers);
                          }}
                          className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                          派工
                        </button>
                      </td>
                    </tr>
                  ))}
                  {soldBatteries.length === 0 && <tr><td colSpan="11" className="text-center py-8 text-gray-400">暂未售出电池</td></tr>}
                </tbody>
              </table>
            </div>
            {soldTotal > 20 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button disabled={soldPage <= 1} onClick={() => loadSoldPage(soldPage - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">上一页</button>
                <span className="text-sm text-gray-500">第 {soldPage} 页 / 共 {Math.ceil(soldTotal / 20)} 页</span>
                <button disabled={soldPage >= Math.ceil(soldTotal / 20)} onClick={() => loadSoldPage(soldPage + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">下一页</button>
              </div>
            )}
          </div>
        )}

        {/* 我的资产 */}
        {activeTab === 'my-workers' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" /> 我的资产
        </h2>
        <p className="text-gray-500 text-sm mt-1">{assetSubTab === 'workers' ? '管理派工人员的联系方式与证件信息' : assetSubTab === 'warehouses' ? '管理仓库信息与负责人配置' : '管理站点类型分类'}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setAssetSubTab('workers')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${assetSubTab === 'workers' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users className="h-4 w-4" />员工管理
          </button>
          <button onClick={() => setAssetSubTab('warehouses')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${assetSubTab === 'warehouses' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <Building2 className="h-4 w-4" />仓库管理
          </button>
          <button onClick={() => setAssetSubTab('siteTypes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${assetSubTab === 'siteTypes' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutList className="h-4 w-4" />站点类型
          </button>
        </div>
      </div>
    </div>

    {/* 员工管理 */}
    {assetSubTab === 'workers' && (
      <>
        <div className="flex justify-end">
          <button onClick={() => { setWorkerForm({ id: '', name: '', age: '', id_number: '', phone: '', photo_url: '' }); setIsEditingWorker(false); setShowWorkerForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增员工
          </button>
        </div>
        {myWorkersLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...
          </div>
        ) : myWorkers.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">暂无员工信息</p>
            <p className="text-sm mt-1">点击"新增员工"添加派工人员</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">工人编号</th>
                  <th className="text-left p-4">照片</th>
                  <th className="text-left p-4">姓名</th>
                  <th className="text-left p-4">年龄</th>
                  <th className="text-left p-4">证件号</th>
                  <th className="text-left p-4">手机号</th>
                  <th className="text-right p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {myWorkers.map(w => (
                  <tr key={w.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs text-blue-600">{w.worker_code || '-'}</td>
                    <td className="p-4">
                      {w.photo_url ? (
                        <img src={w.photo_url} alt={w.name} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{w.name_i18n?.[i18n.language] || w.name_i18n?.['zh-CN'] || w.name}</td>
                    <td className="p-4 text-gray-600">{w.age || '-'}</td>
                    <td className="p-4 text-gray-600">{w.id_number}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />{w.phone}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setWorkerForm({ id: w.id, name: w.name || '', age: w.age || '', id_number: w.id_number || '', phone: w.phone || '', photo_url: w.photo_url || '' }); setIsEditingWorker(true); setShowWorkerForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={async () => { if (!confirm('确定要删除该员工吗？')) return; await adminAPI.deleteWorker(w.id); loadData(); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

    {/* 仓库管理 */}
    {assetSubTab === 'warehouses' && (
      <>
        <div className="flex justify-end">
          <button onClick={() => { setWarehouseForm({ id: '', name: '', name_i18n: { ...EMPTY_I18N }, address: '', address_i18n: { ...EMPTY_I18N }, manager_id: '' }); setSelectedWarehouseLang('zh-CN'); setIsEditingWarehouse(false); setShowWarehouseForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增仓库
          </button>
        </div>
        {warehousesLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">暂无仓库信息</p>
            <p className="text-sm mt-1">点击"新增仓库"添加仓库</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">仓库编码</th>
                  <th className="text-left p-4">仓库名称</th>
                  <th className="text-left p-4">详细地址</th>
                  <th className="text-left p-4">仓库负责人</th>
                  <th className="text-right p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map(w => (
                  <tr key={w.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs text-blue-600">{w.warehouse_code}</td>
                    <td className="p-4 font-medium">{w.name_i18n?.[i18n.language] || w.name_i18n?.['zh-CN'] || w.name}</td>
                    <td className="p-4 text-gray-600">{w.address_i18n?.[i18n.language] || w.address_i18n?.['zh-CN'] || w.address || '—'}</td>
                    <td className="p-4 text-gray-600">{w.manager_name || '—'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { { const parseI18n = (v) => { if (v && typeof v === 'object') { const f = { ...EMPTY_I18N }; for (const l of LANGUAGES) { if (v[l.code]) f[l.code] = v[l.code]; } return f; } const e = { ...EMPTY_I18N }; return e; }; const nameI18n = parseI18n(w.name_i18n); const addrI18n = parseI18n(w.address_i18n); if (!w.name_i18n && w.name) nameI18n['zh-CN'] = w.name; if (!w.address_i18n && w.address) addrI18n['zh-CN'] = w.address; setWarehouseForm({ id: w.id, warehouse_code: w.warehouse_code || '', name: w.name || '', name_i18n: nameI18n, address: w.address || '', address_i18n: addrI18n, manager_id: w.manager_id || '' }); setSelectedWarehouseLang('zh-CN'); setIsEditingWarehouse(true); setShowWarehouseForm(true); } }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={async () => { if (!confirm('确定要删除该仓库吗？')) return; await adminAPI.deleteWarehouse(w.id); loadData(); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

    {/* 新增/编辑员工 Modal */}
    {showWorkerForm && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold">{isEditingWorker ? '编辑员工' : '新增员工'}</h3>
            <button onClick={() => setShowWorkerForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!workerForm.name || !workerForm.id_number || !workerForm.phone) return;
            setWorkerSubmitting(true);
            try {
              if (isEditingWorker) {
                await adminAPI.updateWorker(workerForm.id, workerForm);
              } else {
                await adminAPI.createWorker(workerForm);
              }
              setShowWorkerForm(false);
              loadData();
            } catch (err) { alert(err.message || '操作失败'); }
            finally { setWorkerSubmitting(false); }
          }} className="p-6 space-y-4">
            {/* 照片 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">证件照片</label>
              <div className="flex items-center gap-3">
                {workerForm.photo_url ? (
                  <img src={workerForm.photo_url} alt="preview" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border">
                    <Camera className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <label className="cursor-pointer px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-200 transition">
                  上传照片
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setWorkerForm({ ...workerForm, photo_url: String(reader.result) });
                    reader.readAsDataURL(file);
                  }} className="hidden" />
                </label>
                {workerForm.photo_url && (
                  <button type="button" onClick={() => setWorkerForm({ ...workerForm, photo_url: '' })}
                    className="text-xs text-red-500 hover:text-red-700">移除</button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">姓名 *</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <FileText className="h-4 w-4 text-gray-400" />
                <input type="text" value={workerForm.name} onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })}
                  className="w-full text-sm outline-none" placeholder="员工姓名" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">年龄</label>
              <input type="number" value={workerForm.age} onChange={e => setWorkerForm({ ...workerForm, age: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="年龄" min="16" max="80" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">证件号 *</label>
              <input type="text" value={workerForm.id_number} onChange={e => setWorkerForm({ ...workerForm, id_number: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="身份证/护照号" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">手机号码 *</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <Phone className="h-4 w-4 text-gray-400" />
                <input type="text" value={workerForm.phone} onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })}
                  className="w-full text-sm outline-none" placeholder="+855-xxx" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setShowWorkerForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
              <button type="submit" disabled={workerSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {workerSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditingWorker ? '保存修改' : '创建员工'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* 新增/编辑仓库 Modal */}
    {showWarehouseForm && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold">{isEditingWarehouse ? '编辑仓库' : '新增仓库'}</h3>
            <button onClick={() => setShowWarehouseForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const buildI18nWh = (obj) => { const r = {}; let h = false; for (const l of LANGUAGES) { if (obj && obj[l.code]?.trim()) { r[l.code] = obj[l.code].trim(); h = true; } } return h ? r : null; };
            if (!warehouseForm.name_i18n?.['zh-CN']?.trim() && !warehouseForm.name) return;
            setWarehouseSubmitting(true);
            try {
              const i18nName = buildI18nWh(warehouseForm.name_i18n);
              const i18nAddr = buildI18nWh(warehouseForm.address_i18n);
              if (isEditingWarehouse) {
                const updateData = { ...warehouseForm, manager_id: warehouseForm.manager_id || null, name_i18n: i18nName, address_i18n: i18nAddr };
                await adminAPI.updateWarehouse(warehouseForm.id, updateData);
              } else {
                const { warehouse_code, ...createData } = warehouseForm;
                createData.manager_id = createData.manager_id || null;
                createData.name_i18n = i18nName;
                createData.address_i18n = i18nAddr;
                await adminAPI.createWarehouse(createData);
              }
              setShowWarehouseForm(false);
              loadData();
            } catch (err) { alert(err.message || '操作失败'); }
            finally { setWarehouseSubmitting(false); }
          }} className="p-6 space-y-4">
            {isEditingWarehouse && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">仓库编码</label>
                <input type="text" value={warehouseForm.warehouse_code}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none" readOnly />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">仓库名称 *</label>
              <div className="flex gap-1 mb-2">
                {LANGUAGES.map(lang => (
                  <button type="button" key={lang.code}
                    onClick={() => setSelectedWarehouseLang(lang.code)}
                    className={`px-2 py-0.5 text-xs rounded-full transition ${selectedWarehouseLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {lang.label}
                  </button>
                ))}
              </div>
              <input type="text" value={warehouseForm.name_i18n?.[selectedWarehouseLang] || ''}
                onChange={e => setWarehouseForm({ ...warehouseForm, name_i18n: { ...warehouseForm.name_i18n, [selectedWarehouseLang]: e.target.value } })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`仓库名称（${LANGUAGES.find(l=>l.code===selectedWarehouseLang)?.label}）`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">详细地址</label>
              <div className="flex gap-1 mb-2">
                {LANGUAGES.map(lang => (
                  <button type="button" key={lang.code}
                    onClick={() => setSelectedWarehouseLang(lang.code)}
                    className={`px-2 py-0.5 text-xs rounded-full transition ${selectedWarehouseLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {lang.label}
                  </button>
                ))}
              </div>
              <input type="text" value={warehouseForm.address_i18n?.[selectedWarehouseLang] || ''}
                onChange={e => setWarehouseForm({ ...warehouseForm, address_i18n: { ...warehouseForm.address_i18n, [selectedWarehouseLang]: e.target.value } })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`地址（${LANGUAGES.find(l=>l.code===selectedWarehouseLang)?.label}）`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">仓库负责人</label>
              <select value={warehouseForm.manager_id} onChange={e => setWarehouseForm({ ...warehouseForm, manager_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="">-- 请选择 --</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.worker_code || emp.phone})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setShowWarehouseForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
              <button type="submit" disabled={warehouseSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {warehouseSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditingWarehouse ? '保存修改' : '创建仓库'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {/* 站点类型 */}
    {assetSubTab === 'siteTypes' && (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">站点类型管理</h3>
            <p className="text-gray-500 text-sm mt-0.5">配置站点类型及多语言名称，供运营站点选择使用</p>
          </div>
          <button onClick={() => { setSiteTypeForm({ id: '', name: '', name_i18n: { ...EMPTY_I18N } }); setIsEditingSiteType(false); setSelectedSiteTypeLang('zh-CN'); setShowSiteTypeForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增类型
          </button>
        </div>
        {siteTypesLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
        ) : siteTypes.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">暂无站点类型</p>
            <p className="text-sm mt-1">点击"新增类型"添加</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">编码名称</th>
                  <th className="text-left p-4">显示名称</th>
                  <th className="text-right p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {siteTypes.map(st => (
                  <tr key={st.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs">{st.name}</td>
                    <td className="p-4">{st.name_i18n?.[i18n.language] || st.name_i18n?.['zh-CN'] || st.name}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { const parseI18nST = (v) => { if (v && typeof v === 'object') { const f = { ...EMPTY_I18N }; for (const l of LANGUAGES) { if (v[l.code]) f[l.code] = v[l.code]; } return f; } const e = { ...EMPTY_I18N }; if (!v && st.name) e['zh-CN'] = st.name; return e; }; setSiteTypeForm({ id: st.id, name: st.name, name_i18n: parseI18nST(st.name_i18n) }); setIsEditingSiteType(true); setSelectedSiteTypeLang('zh-CN'); setShowSiteTypeForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑"><Edit className="h-4 w-4" /></button>
                        <button onClick={async () => { if (!confirm('确定删除？')) return; await adminAPI.deleteSiteType(st.id); setSiteTypesLoading(true); adminAPI.getSiteTypes().then(stData => setSiteTypes(stData?.site_types || [])).catch(()=>{}).finally(()=>setSiteTypesLoading(false)); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Site Type Form Modal */}
        {showSiteTypeForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-bold">{isEditingSiteType ? '编辑站点类型' : '新增站点类型'}</h3>
                <button onClick={() => setShowSiteTypeForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!siteTypeForm.name.trim()) { alert('请输入编码名称'); return; }
                if (!siteTypeForm.name_i18n['zh-CN']?.trim()) { alert('至少填写简体中文名称'); return; }
                setSiteTypeSubmitting(true);
                try {
                  const buildI18nST = (obj) => { const r = {}; let h = false; for (const l of LANGUAGES) { if (obj[l.code]?.trim()) { r[l.code] = obj[l.code].trim(); h = true; } } return h ? r : null; };
                  const payload = { name: siteTypeForm.name.trim(), name_i18n: buildI18nST(siteTypeForm.name_i18n) };
                  if (isEditingSiteType) { await adminAPI.updateSiteType(siteTypeForm.id, payload); }
                  else { await adminAPI.createSiteType(payload); }
                  setShowSiteTypeForm(false);
                  // 仅刷新 siteTypes，不重载 workers/warehouses
                  setSiteTypesLoading(true);
                  adminAPI.getSiteTypes()
                    .then(stData => setSiteTypes(stData?.site_types || []))
                    .catch(() => {})
                    .finally(() => setSiteTypesLoading(false));
                } catch (err) { alert(err.message || '操作失败'); }
                finally { setSiteTypeSubmitting(false); }
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">编码名称 <span className="text-red-500">*</span></label>
                  <input type="text" value={siteTypeForm.name} onChange={e => setSiteTypeForm({ ...siteTypeForm, name: e.target.value })}
                    disabled={isEditingSiteType}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" placeholder="如 换电站" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">显示名称 <span className="text-red-500">*</span></label>
                  <div className="flex gap-1 mb-2">
                    {LANGUAGES.map(lang => (
                      <button type="button" key={lang.code}
                        onClick={() => setSelectedSiteTypeLang(lang.code)}
                        className={`px-2 py-0.5 text-xs rounded-full transition ${selectedSiteTypeLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={siteTypeForm.name_i18n?.[selectedSiteTypeLang] || ''}
                    onChange={e => setSiteTypeForm({ ...siteTypeForm, name_i18n: { ...siteTypeForm.name_i18n, [selectedSiteTypeLang]: e.target.value } })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`${LANGUAGES.find(l=>l.code===selectedSiteTypeLang)?.label} 名称`} />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowSiteTypeForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                  <button type="submit" disabled={siteTypeSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {siteTypeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditingSiteType ? '保存修改' : '创建类型'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}

        {/* Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div>
            <h2 className="text-xl font-bold mb-6">提现审批</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-4">申请人</th>
                  <th className="text-left p-4">邮箱</th>
                  <th className="text-right p-4">提现金额</th>
                  <th className="text-center p-4">状态</th>
                  <th className="text-right p-4">申请时间</th>
                  <th className="text-left p-4">提交资料</th>
                  <th className="text-left p-4">审核信息</th>
                  <th className="text-center p-4">操作</th>
                </tr></thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{w.username || w.user?.username || '-'}</td>
                      <td className="p-4 text-gray-500">{w.email || w.user?.email || '-'}</td>
                      <td className="p-4 text-right font-semibold">${(w.amount || w.withdrawal_amount || 0).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{w.status === 'pending' ? '待审批' : w.status === 'approved' ? '已通过' : '已驳回'}</span>
                      </td>
                      <td className="p-4 text-right text-gray-400">{w.created_at ? new Date(w.created_at).toLocaleString('zh-CN') : '-'}</td>
                      <td className="p-4 text-xs">
                        {w.business_license_url ? <div><a href={w.business_license_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">营业执照</a></div> : null}
                        {w.invoice_info_url ? <div><a href={w.invoice_info_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">开票资料</a></div> : null}
                        {w.vat_invoice_url ? <div><a href={w.vat_invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">增值税发票</a></div> : null}
                        {!w.business_license_url && !w.invoice_info_url && !w.vat_invoice_url ? '—' : null}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {w.reviewed_by ? <div>审核人: {w.reviewed_by}</div> : null}
                        {w.reviewed_at ? <div>审核时间: {new Date(w.reviewed_at).toLocaleString('zh-CN')}</div> : null}
                        {w.reason ? <div>原因: {w.reason}</div> : null}
                        {!w.reviewed_by && !w.reason && '-'}
                      </td>
                      <td className="p-4 text-center">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleReviewWithdrawal(w.id, 'approve')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition">
                              通过
                            </button>
                            <button onClick={() => handleReviewWithdrawal(w.id, 'reject')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">
                              驳回
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {withdrawals.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>暂无提现申请</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-bold mb-6">用户管理</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-4">用户名</th><th className="text-left p-4">邮箱</th><th className="text-center p-4">角色</th>
                  <th className="text-center p-4">编码</th><th className="text-center p-4">实名</th><th className="text-center p-4">状态</th>
                  <th className="text-right p-4">投资额</th><th className="text-right p-4">注册时间</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{u.username}</td>
                      <td className="p-4 text-gray-500">{u.email}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'operator' ? 'bg-blue-100 text-blue-700' : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-600'
                        }`}>{u.role === 'admin' ? <><Shield className="h-3 w-3" />管理员</> : u.role === 'operator' ? <><Settings className="h-3 w-3" />运营方</> : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? <><Shield className="h-3 w-3" />省级总代理</> : u.agent_type === 'city_franchisee' ? <><Building2 className="h-3 w-3" />市级加盟商</> : u.agent_type === 'district_franchisee' ? <><MapPin className="h-3 w-3" />区县加盟店</> : <><Store className="h-3 w-3" />加盟商</>) : <><Users className="h-3 w-3" />投资者</>}</span>
                      </td>
                      <td className="p-4 text-center font-mono text-xs text-gray-600">{u.investor_code || '—'}</td>
                      <td className="p-4 text-center"><span className={`text-xs ${u.kyc_status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>{u.kyc_status === 'approved' ? '已认证' : u.kyc_status === 'pending' ? '待认证' : '未认证'}</span></td>
                      <td className="p-4 text-center"><span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>{u.is_active ? '正常' : '禁用'}</span></td>
                      <td className="p-4 text-right">${(u.total_investment || 0).toFixed(0)}</td>
                      <td className="p-4 text-right text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KYC Review */}
        {activeTab === 'kyc' && (
          <div>
            <h2 className="text-xl font-bold mb-6">实名认证审核</h2>
            {kycUsers.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                暂无待审核的实名认证申请
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'username')}>用户名{getSortIndicator('kyc', 'username')}</th>
                    <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'email')}>邮箱{getSortIndicator('kyc', 'email')}</th>
                    <th className="text-left p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'phone')}>手机{getSortIndicator('kyc', 'phone')}</th>
                    <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'role')}>角色{getSortIndicator('kyc', 'role')}</th>
                    <th className="text-center p-3">证件</th>
                    <th className="text-center p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'certification_status')}>认证状态{getSortIndicator('kyc', 'certification_status')}</th>
                    <th className="text-right p-3 cursor-pointer select-none hover:bg-gray-100 transition" onClick={() => handleSort('kyc', 'created_at')}>提交时间{getSortIndicator('kyc', 'created_at')}</th>
                    <th className="text-center p-3">操作</th>
                  </tr></thead>
                  <tbody>
                    {sortedKycUsers.map(u => (
                      <tr key={u.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900">{u.full_name || u.username}</td>
                        <td className="p-3 text-gray-500">{u.email || '—'}</td>
                        <td className="p-3 text-gray-500">{u.phone || '—'}</td>
                        <td className="p-3 text-center text-gray-500">{u.role || '—'}</td>
                        <td className="p-3 text-center">
                          {u.role === 'franchisee' ? (
                            u.business_license_url ? (
                              <img src={u.business_license_url} alt="营业执照" className="w-24 h-16 rounded border object-contain mx-auto cursor-pointer hover:opacity-80" onClick={() => window.open(u.business_license_url, '_blank')} />
                            ) : (
                              <span className="text-xs text-gray-400">未上传</span>
                            )
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <div>
                                {u.id_card_front_url ? (
                                  <img src={u.id_card_front_url} alt="身份证正面" className="w-24 h-16 rounded border object-contain cursor-pointer hover:opacity-80" onClick={() => window.open(u.id_card_front_url, '_blank')} />
                                ) : (
                                  <span className="text-xs text-gray-400">正面未上传</span>
                                )}
                              </div>
                              <div>
                                {u.id_card_back_url ? (
                                  <img src={u.id_card_back_url} alt="身份证背面" className="w-24 h-16 rounded border object-contain cursor-pointer hover:opacity-80" onClick={() => window.open(u.id_card_back_url, '_blank')} />
                                ) : (
                                  <span className="text-xs text-gray-400">背面未上传</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            u.certification_status === 'kyc_submitted' ? 'bg-orange-100 text-orange-700' :
                            u.certification_status === 'kyc_approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {u.certification_status === 'kyc_submitted' ? '待审核' : u.certification_status === 'kyc_approved' ? '已通过' : '已驳回'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-gray-400 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '-'}</td>
                        <td className="p-3 text-center">
                          {rejectingKycUser === u.id ? (
                            <div className="flex flex-col gap-1 min-w-[160px]">
                              <select
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="px-2 py-1.5 border rounded text-xs bg-white"
                              >
                                <option value="">-- 选择驳回原因 --</option>
                                <option value="证件信息不一致">证件信息不一致</option>
                                <option value="证件已过期">证件已过期</option>
                                <option value="证件有遮挡或模糊">证件有遮挡或模糊</option>
                                <option value="需要上传有效证件照">需要上传有效证件照</option>
                                <option value="其他原因">其他原因</option>
                              </select>
                              <div className="flex gap-1">
                                <button onClick={confirmKycReject}
                                  className="flex-1 px-2 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition">
                                  确认驳回
                                </button>
                                <button onClick={() => { setRejectingKycUser(null); setRejectReason(''); }}
                                  className="px-2 py-1.5 border text-gray-600 text-xs rounded hover:bg-gray-100 transition">
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : u.certification_status === 'kyc_submitted' ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleKycReview(u.id, 'kyc_approved')}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition">
                                通过
                              </button>
                              <button onClick={() => handleKycReview(u.id, 'kyc_rejected')}
                                className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition">
                                驳回
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{u.certification_status === 'kyc_approved' ? '已通过' : '已驳回'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Configs */}
        {activeTab === 'configs' && (
          <div>
            <h2 className="text-xl font-bold mb-6">系统配置</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-4">配置项</th><th className="text-left p-4">值</th><th className="text-left p-4">类型</th><th className="text-left p-4">描述</th></tr></thead>
                <tbody>
                  {configs.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs font-medium">{c.config_key}</td>
                      <td className="p-4">{c.config_value}</td>
                      <td className="p-4 text-gray-500">{c.config_type}</td>
                      <td className="p-4 text-gray-400">{c.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 电池资产新增/编辑 Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditing ? '编辑电池资产' : '新增电池资产'}</h2>
              <form onSubmit={handleAssetSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">资产代码 *</label>
                    <input type="text" value={assetForm.asset_code} onChange={e => setAssetForm({ ...assetForm, asset_code: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 BAT-CAMB-004" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">资产名称 <span className="text-red-500">*</span></label>
                    <div className="flex gap-1 mb-2">
                      {LANGUAGES.map(lang => (
                        <button type="button" key={lang.code}
                          onClick={() => setSelectedAssetLang(lang.code)}
                          className={`px-2 py-0.5 text-xs rounded-full transition ${selectedAssetLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={assetForm.name_i18n?.[selectedAssetLang] || ''}
                      onChange={e => setAssetForm({ ...assetForm, name_i18n: { ...assetForm.name_i18n, [selectedAssetLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`资产名称（${LANGUAGES.find(l=>l.code===selectedAssetLang)?.label}）`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电池类型</label>
                    <select value={assetForm.battery_type} onChange={e => {
                        const selectedType = batteryTypes.find(bt => bt.name === e.target.value);
                        setAssetForm({
                          ...assetForm,
                          battery_type: e.target.value,
                          battery_type_id: selectedType?.id || '',
                          unit_price_rmb: selectedType?.unit_price != null ? String(selectedType.unit_price) : '',
                          monthly_rent: selectedType?.monthly_rent != null ? String(selectedType.monthly_rent) : '',
                          expected_roi: selectedType?.annualized_return != null ? String(selectedType.annualized_return) : ''});
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      {batteryTypes.map(bt => (
                        <option key={bt.id} value={bt.name}>{bt.name}</option>
                      ))}
                      {assetForm.battery_type && !batteryTypes.some(bt => bt.name === assetForm.battery_type) && (
                        <option value={assetForm.battery_type}>{assetForm.battery_type}</option>
                      )}
                      {batteryTypes.length === 0 && (
                        <>
                          <option value="swap">换电电池</option>
                          <option value="vehicle">整车电池</option>
                          <option value="ess">储能电池</option>
                          <option value="container">集装箱储能</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">总量（台/组）*</label>
                    <input type="number" min="1" value={assetForm.total_units} onChange={e => setAssetForm({ ...assetForm, total_units: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 1000" />
                  </div>
                  {isEditing && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">当前库存</label>
                      <input type="text" value={`${assetForm.stock ?? assetForm.available_units ?? 0} 台可用`} readOnly
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">单价 (USD) *</label>
                    <input type="number" min="0" step="0.01" value={assetForm.unit_price_rmb} readOnly disabled
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" placeholder="选择电池类型后自动填充" />
                    {assetForm.unit_price_rmb && parseFloat(assetForm.unit_price_rmb) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">≈ ¥{(parseFloat(assetForm.unit_price_rmb) * 7.25).toFixed(2)}（按当日汇率自动换算）</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">年化收益率 (%)</label>
                    <input type="text" value={assetForm.expected_roi ? `${parseFloat(assetForm.expected_roi).toFixed(1)}%` : '—'} readOnly disabled
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" />
                    <p className="text-xs text-gray-400 mt-1">选择电池类型后自动填充</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">月租金 (USD /月)</label>
                    <input type="number" min="0" step="0.01" value={assetForm.monthly_rent} readOnly disabled
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" placeholder="选择电池类型后自动填充" />
                    {assetForm.monthly_rent && parseFloat(assetForm.monthly_rent) > 0 && (
                      <p className="text-xs text-gray-400 mt-1"> /月</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">仓库</label>
                    <select value={assetForm.warehouse_id} onChange={e => setAssetForm({ ...assetForm, warehouse_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="">-- 无需指定 --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.warehouse_code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">描述</label>
                  <div className="flex gap-1 mb-2">
                    {LANGUAGES.map(lang => (
                      <button type="button" key={lang.code}
                        onClick={() => setSelectedAssetLang(lang.code)}
                        className={`px-2 py-0.5 text-xs rounded-full transition ${selectedAssetLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={assetForm.description_i18n?.[selectedAssetLang] || ''}
                    onChange={e => setAssetForm({ ...assetForm, description_i18n: { ...assetForm.description_i18n, [selectedAssetLang]: e.target.value } })}
                    rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder={`描述（${LANGUAGES.find(l=>l.code===selectedAssetLang)?.label}）`} />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowAssetForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                  <button type="submit" disabled={assetSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {assetSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditing ? '保存修改' : '创建资产'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* JSON批量导入 Modal */}
      {showJsonImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">JSON批量导入电池资产</h3>
              <button onClick={() => { setShowJsonImport(false); setJsonImportText(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-500">粘贴 JSON 数组，每个对象的字段映射：asset_code（代码）、name（名称）、battery_type（类型）、total_units（总量）、unit_price_rmb（单价RMB）、monthly_rent（月租金USD）、description（描述）、location（位置）、station_id（换电站ID）</p>
              <textarea value={jsonImportText} onChange={e => setJsonImportText(e.target.value)}
                rows={16} className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                placeholder={`[\n  { "asset_code": "BAT-CAMB-010", "name": "示例电池", ... }\n]`} />
              <div className="text-xs text-gray-400">提示：点击上方「批量导入JSON」按钮会填充模拟数据，可在此基础上修改后提交。</div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={() => { setShowJsonImport(false); setJsonImportText(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg hover:bg-gray-100 transition">取消</button>
              <button onClick={handleJsonImport} disabled={jsonImporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {jsonImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                批量导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 传感器JSON导入 Modal */}
      {showSensorModal && sensorTargetAsset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">传感器数据导入 - {sensorTargetAsset.name}</h3>
              <button onClick={() => { setShowSensorModal(false); setSensorJsonText(''); setSensorTargetAsset(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{sensorTargetAsset.battery_type}</span>
                <span>代码: {sensorTargetAsset.asset_code}</span>
                <span>总量: {sensorTargetAsset.total_units} 颗</span>
              </div>
              <p className="text-sm text-gray-500">JSON 数组，每颗电池字段：unit_code、sensor_battery_level（电量%）、sensor_temperature（温度°C）、sensor_cycle_count（循环次数）、sensor_last_online（最后在线时间ISO）、sensor_longitude（经度）、sensor_latitude（纬度）</p>
              <textarea value={sensorJsonText} onChange={e => setSensorJsonText(e.target.value)}
                rows={18} className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                placeholder={`[\n  { "unit_code": "BAT-CAMB-00001", "sensor_battery_level": 85.5, "sensor_longitude": 104.916, "sensor_latitude": 11.562, ... }\n]`} />
              <div className="flex gap-2">
                <button onClick={async () => {
                  const mockData = await generateMockSensorData(sensorTargetAsset.id, sensorTargetAsset.battery_type);
                  setSensorJsonText(JSON.stringify(mockData, null, 2));
                }} className="text-xs text-blue-600 hover:text-blue-800 underline">重新生成模拟数据</button>
                <span className="text-xs text-gray-400">（模拟数据仅作示例，正式导入前请替换为真实传感器报文）</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={() => { setShowSensorModal(false); setSensorJsonText(''); setSensorTargetAsset(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg hover:bg-gray-100 transition">取消</button>
              <button onClick={handleSensorImport} disabled={sensorImporting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {sensorImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                批量导入传感器
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 门店编辑 Modal */}
      {showStoreForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditingStore ? '编辑门店信息' : '新增门店'}</h2>
              <form onSubmit={handleStoreSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">门店名称 *</label>
                    <input type="text" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 金边1号换电站" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">城市</label>
                    <input type="text" value={storeForm.city} onChange={e => setStoreForm({ ...storeForm, city: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Phnom Penh" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电话</label>
                    <input type="text" value={storeForm.phone} onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="+855-xxx" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">地址</label>
                    <input type="text" value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="详细地址" />
                  </div>
                  {isEditingStore && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">电池数量 (自动统计)</label>
                        <input type="text" value={`${storeForm.total_batteries ?? 0} 台`} readOnly
                          className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">分成比例</label>
                        <input type="number" min="0" max="1" step="0.01" value={storeForm.revenue_share} onChange={e => setStoreForm({ ...storeForm, revenue_share: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0.3" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">店主 ID</label>
                        <select value={storeForm.owner_id || ''} onChange={e => setStoreForm({ ...storeForm, owner_id: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                          <option value="">— 选择店主 —</option>
                          {franchiseeUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowStoreForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                  <button type="submit" disabled={storeSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {storeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditingStore ? '保存修改' : '创建门店'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 代理编辑 Modal */}
      {showAgentForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">编辑代理</h3>
              <button onClick={() => setShowAgentForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAgentSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">佣金比例 (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={agentForm.commission}
                  onChange={e => setAgentForm({ ...agentForm, commission: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">收益分成 (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={agentForm.revenue_share}
                  onChange={e => setAgentForm({ ...agentForm, revenue_share: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 3" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">代理区域</label>
                <input type="text" value={agentForm.region}
                  onChange={e => setAgentForm({ ...agentForm, region: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 cn" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">代理城市</label>
                <input type="text" value={agentForm.city}
                  onChange={e => setAgentForm({ ...agentForm, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 北京" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowAgentForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={agentSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {agentSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 已售电池派工弹窗 */}
      {dispatchBattery && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">派工单</h3>
              <button onClick={() => setDispatchBattery(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div><span className="text-gray-500">电池编号：</span><span className="font-mono font-medium">{dispatchBattery.unit_code || '-'}</span></div>
                <div><span className="text-gray-500">资产名称：</span><span className="font-medium">{dispatchBattery.asset_name || '-'}</span></div>
                <div><span className="text-gray-500">投资者：</span><span>{dispatchBattery.investor_name || '-'}</span></div>
                <div><span className="text-gray-500">电池类型：</span><span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{dispatchBattery.battery_assets?.battery_type || '-'}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">派发地点</label>
                <select value={dispatchSiteId} onChange={(e) => setDispatchSiteId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">{dispatchSites.length === 0 && dispatchWorkers.length === 0 ? '加载中...' : '请选择运营站点'}</option>
                  {dispatchSites.map(s => {
                    const remaining = s.remaining ?? s.battery_count ?? 0;
                    const dispatched = s.dispatched ?? 0;
                    return (
                      <option key={s.id} value={s.id}>{s.name || s.site_code} ({s.city || ''}) - 运营 {dispatched} 台{remaining > 0 ? `，可派 ${remaining}` : ''}</option>
                    );
                  })}
                </select>
                {dispatchSites.length === 0 && dispatchWorkers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">暂无匹配电池类型「{dispatchBattery.battery_assets?.battery_type || '—'}」的运营站点</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">派发给工人</label>
                <select value={dispatchWorkerId} onChange={(e) => setDispatchWorkerId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">{dispatchSites.length === 0 && dispatchWorkers.length === 0 ? '加载中...' : '请选择工人'}</option>
                  {dispatchWorkers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.phone})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button onClick={() => setDispatchBattery(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button
                  disabled={!dispatchWorkerId || !dispatchSiteId || dispatchSingleSubmitting}
                  onClick={async () => {
                    const batteryUnitId = dispatchBattery.unit_id || dispatchBattery.battery_unit_id || dispatchBattery.id;
                    const selectedSite = dispatchSites.find(s => s.id == dispatchSiteId);
                    const siteName = selectedSite ? (selectedSite.site_name || selectedSite.name || selectedSite.site_code || '') : '';
                    setDispatchSingleSubmitting(true);
                    try {
                      const r = await adminAPI.dispatchBatteries({ battery_ids: [batteryUnitId], worker_id: dispatchWorkerId, site_id: dispatchSiteId });
                      // 更新缓存中站点剩余数量
                      if (dispatchCacheRef.current.sites) {
                        dispatchCacheRef.current.sites = dispatchCacheRef.current.sites.map(s =>
                          s.id == dispatchSiteId ? { ...s, remaining: Math.max(0, (s.remaining ?? s.battery_count ?? 0) - 1) } : s
                        );
                      }
                      // 本地更新已售电池记录的站点信息，确保表格地址列立即显示
                      setSoldBatteries(prev => prev.map(b => {
                        const bid = b.unit_id || b.battery_unit_id || b.id;
                        if (bid === batteryUnitId) {
                          return { ...b, site_name: siteName, site_code: selectedSite?.site_code || '' };
                        }
                        return b;
                      }));
                      const wecomHint = r.webhook_sent ? '企业微信通知已发送' : '（企业微信Webhook未配置，仅记录）';
                      alert(`派发成功！${r.dispatched_count} 个电池已派给 ${r.worker_name || ''}，派往站点：${siteName}。${wecomHint}`);
                      setDispatchBattery(null);
                      setDispatchWorkerId('');
                      setDispatchSiteId('');
                      loadData();
                    } catch (e) { alert(e.message || '派发失败'); }
                    finally { setDispatchSingleSubmitting(false); }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    dispatchWorkerId && dispatchSiteId && !dispatchSingleSubmitting
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}>
                  {dispatchSingleSubmitting ? '派发中...' : '确认派工'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 已售电池批量派工弹窗 */}
      {showBatchDispatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">批量派工单</h3>
              <button onClick={() => { setShowBatchDispatch(false); setBatchDispatchSiteId(''); setBatchDispatchWorkerId(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                已选择 <span className="font-bold">{selectedBatteryIds.length}</span> 个电池单元。
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">派发站点</label>
                <select value={batchDispatchSiteId} onChange={(e) => setBatchDispatchSiteId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">{batchDispatchSites.length === 0 && batchDispatchWorkers.length === 0 ? '加载中...' : '请选择运营站点'}</option>
                  {batchDispatchSites.map(s => {
                    const remaining = s.remaining ?? s.battery_count ?? 0;
                    const dispatched = s.dispatched ?? 0;
                    return (
                      <option key={s.id} value={s.id}>{s.name || s.site_code} ({s.city || ''}) - 运营 {dispatched} 台{remaining > 0 ? `，可派 ${remaining}` : ''}</option>
                    );
                  })}
                </select>
                {batchDispatchSites.length === 0 && batchDispatchWorkers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">暂无匹配所选电池类型的运营站点</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">派发给工人</label>
                <select value={batchDispatchWorkerId} onChange={(e) => setBatchDispatchWorkerId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">{batchDispatchSites.length === 0 && batchDispatchWorkers.length === 0 ? '加载中...' : '请选择工人'}</option>
                  {batchDispatchWorkers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.phone})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button onClick={() => { setShowBatchDispatch(false); setBatchDispatchSiteId(''); setBatchDispatchWorkerId(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleBatteryBatchDispatch}
                  disabled={!batchDispatchWorkerId || !batchDispatchSiteId || batchSubmitting}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    batchDispatchWorkerId && batchDispatchSiteId && !batchSubmitting
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}>
                  {batchSubmitting ? '派发中...' : `确认批量派工（${selectedBatteryIds.length}）`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
