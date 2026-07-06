'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Battery, Zap, Globe, Shield, TrendingUp, Users, MapPin, ArrowRight, ChevronRight, Play, Camera, Store, Network, Building2, X, Bus, Warehouse, Container, DollarSign, ShoppingBag, Truck } from 'lucide-react';
import { isLoggedIn } from '@/lib/api';
import { storesAPI, batteryTypesAPI } from '@/services/api';
import { formatDate, formatTime } from '@/lib/date-format';
import i18n from '@/i18n';

// ─── 门店坐标硬编码 ──────────────────────────────────
const STORE_COORDS = {
  'STORE-00001': { lat: 31.03, lng: 121.23 },
  'STORE-00002': { lat: 32.06, lng: 118.79 },
  'STORE-00003': { lat: 28.23, lng: 112.94 },
  'STORE-00004': { lat: 28.20, lng: 113.08 },
};

// ─── 高德地图加载（单例） ──────────────────────────────
let _amapLoading = false;
let _amapResolvers = [];
let _amapScriptEl = null;

function getAmapLang(i18nLang) {
  const map = { 'zh-CN': 'zh_cn', 'en': 'en', 'zh-TW': 'zh_tw' };
  return map[i18nLang] || 'en';
}

function useAmap(language) {
  const [loaded, setLoaded] = useState(typeof window !== 'undefined' && !!window.AMap);
  const amapLang = getAmapLang(language);
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_AMAP_KEY) return;
    // 语言切换时重新加载地图
    if (_amapScriptEl && _amapScriptEl.dataset.lang !== amapLang) {
      _amapScriptEl.remove();
      _amapScriptEl = null;
      _amapLoading = false;
      _amapResolvers = [];
      delete window.AMap;
      setLoaded(false);
    }
    if (window.AMap) { setLoaded(true); return; }
    _amapResolvers.push(setLoaded);
    if (!_amapLoading) {
      _amapLoading = true;
      const script = document.createElement('script');
      script.dataset.lang = amapLang;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}&language=${amapLang}`;
      script.onload = () => {
        _amapResolvers.forEach((resolve) => resolve(true));
        _amapResolvers = [];
      };
      script.onerror = () => {
        _amapResolvers.forEach((resolve) => resolve(false));
        _amapResolvers = [];
        _amapLoading = false;
      };
      document.head.appendChild(script);
      _amapScriptEl = script;
    }
    return () => {
      _amapResolvers = _amapResolvers.filter((r) => r !== setLoaded);
    };
  }, [amapLang]);
  return loaded;
}

// ─── 加盟门店数据（从 API 动态获取） ──────────────────
let _franchiseStoresCache = null;
let _franchiseStoresLoaded = false;
let _franchiseStoresPromise = null;

function useFranchiseStores(t) {
  const [stores, setStores] = useState([]);
  useEffect(() => {
    if (_franchiseStoresLoaded) { setStores(_franchiseStoresCache || []); return; }
    if (_franchiseStoresPromise) {
      _franchiseStoresPromise.then(data => setStores(data));
      return;
    }
    _franchiseStoresPromise = storesAPI.getApprovedStores()
      .then(data => {
        const list = (data.stores || []).map(s => ({
          id: s.id,
          name: s.name || s.store_name || '—',
          city: s.city || '',
          region: s.country || s.city || '',
          address: s.address || '',
          phone: s.phone || '',
          lng: s.lng || s.longitude || (STORE_COORDS[s.store_code]?.lng) || 0,
          lat: s.lat || s.latitude || (STORE_COORDS[s.store_code]?.lat) || 0,
          soldBattery: s.type || '—',
          soldCount: s.battery_count || s.total_batteries || s.count || 0,
          revenue: (s.battery_count || s.total_batteries) ? `¥${((s.battery_count || s.total_batteries) * 1.8).toFixed(0)}${t('home.tenThousand')}` : '¥0',
          totalSales: s.total_sales || 0,
          monthlySales: s.monthly_sales || 0,
          status: s.status || t('home.statusOperating'),
          img: (s.images && s.images.length > 0) ? s.images[0] : (s.photo_url || null),
          images: s.images || [],
          photo_url: s.photo_url || null,
        }));
        _franchiseStoresCache = list;
        _franchiseStoresLoaded = true;
        return list;
      })
      .catch(() => {
        _franchiseStoresCache = [];
        _franchiseStoresLoaded = true;
        return [];
      });
    _franchiseStoresPromise.then(data => setStores(data));
  }, []);
  return stores;
}

// ─── 电池资产数据（从 /api/battery-types 动态获取） ──────
const CATEGORY_RULES = [
  { key: 'swap', namePattern: /两轮|三轮|电摩/, scenePattern: /两轮|三轮|电摩|外卖/ },
  { key: 'vehicle', namePattern: /物流|大巴|客运|中巴|客车|货车/, scenePattern: /物流|客运|车队|公交/ },
  { key: 'container', namePattern: /集装箱|20尺|40尺/, scenePattern: /集装箱|电站|电网|光伏/ },
  { key: 'commercial', namePattern: /工商业|储能柜|风冷柜|液冷柜/, scenePattern: /储能|峰谷|工厂|商铺/ },
];

function categorizeBatteryType(t) {
  const name = (t.name || '') + (t.scenario || '');
  for (const rule of CATEGORY_RULES) {
    if (rule.namePattern.test(name)) return rule.key;
  }
  return 'swap'; // default
}

let _batteryAssetsCache = null;
let _batteryAssetsLoaded = false;
let _batteryAssetsPromise = null;

function useBatteryAssets() {
  const [assets, setAssets] = useState({ swap: [], vehicle: [], commercial: [], container: [] });
  useEffect(() => {
    _batteryAssetsLoaded = false;
    _batteryAssetsPromise = null;
    if (_batteryAssetsLoaded) { setAssets(_batteryAssetsCache); return; }
    if (_batteryAssetsPromise) {
      _batteryAssetsPromise.then(data => setAssets(data));
      return;
    }
    _batteryAssetsPromise = batteryTypesAPI.getList()
      .then(data => {
        const types = (data.battery_types || data.types || []).filter(t => t.is_active !== false);
        const grouped = { swap: [], vehicle: [], commercial: [], container: [] };
        types.forEach((t, idx) => {
          const category = categorizeBatteryType(t);
          const displayModel = t.name_i18n?.[i18n.language] || t.name_i18n?.['zh-CN'] || t.name || '—';
          const displayScene = t.scenario_i18n?.[i18n.language] || t.scenario_i18n?.['zh-CN'] || t.scenario || '—';
          grouped[category].push({
            id: t.id || idx,
            model: displayModel,
            scene: displayScene,
            voltage: t.voltage || '—',
            capacity: t.capacity || '—',
            current: '—',
            size: t.dimensions || '—',
            weight: t.net_weight || '—',
            energy: t.power_kwh || '—',
            img: t.thumbnail_url || t.image_url || '/design-images/image15.jpeg',
          });
        });
        _batteryAssetsCache = grouped;
        _batteryAssetsLoaded = true;
        return grouped;
      })
      .catch(() => {
        const empty = { swap: [], vehicle: [], commercial: [], container: [] };
        _batteryAssetsCache = empty;
        _batteryAssetsLoaded = true;
        return empty;
      });
    _batteryAssetsPromise.then(data => setAssets(data));
  }, [i18n.language]);
  return assets;
}

// ─── 电池网络节点（四种类型） ────────────────────────────
const getNetworkNodes = (t) => [
  // 换电站 (swap) - 带换电仓槽位
  { id:1, nodeType:'swap', name:t('home.network.node1.name'), lng:104.917, lat:11.556, energy:'86 '+t('home.batteryGroup'), runtime:t('home.network.runtime3Year'), status:t('home.network.online'), charge:'92%', health:'98%', slots:15, availableSlots:3, desc:t('home.network.node1.desc'), address:t('home.network.addr1') },
  { id:2, nodeType:'swap', name:t('home.network.node2.name'), lng:103.856, lat:13.363, energy:'45 '+t('home.batteryGroup'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'87%', health:'95%', slots:12, availableSlots:4, desc:t('home.network.node2.desc'), address:t('home.network.addr2') },
  { id:3, nodeType:'swap', name:t('home.network.node3.name'), lng:90.367, lat:23.804, energy:'52 '+t('home.batteryGroup'), runtime:t('home.network.runtime2_5Year'), status:t('home.network.online'), charge:'94%', health:'97%', slots:20, availableSlots:2, desc:t('home.network.node3.desc'), address:t('home.network.addr3') },
  { id:4, nodeType:'swap', name:t('home.network.node4.name'), lng:106.702, lat:10.776, energy:'48 '+t('home.batteryGroup'), runtime:t('home.network.runtime3Year'), status:t('home.network.online'), charge:'93%', health:'97%', slots:15, availableSlots:5, desc:t('home.network.node4.desc'), address:t('home.network.addr4') },
  { id:5, nodeType:'swap', name:t('home.network.node5.name'), lng:106.827, lat:-6.175, energy:'30 '+t('home.batteryGroup'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'91%', health:'96%', slots:12, availableSlots:3, desc:t('home.network.node5.desc'), address:t('home.network.addr5') },
  // 运营线路 (bus)
  { id:6, nodeType:'bus', name:t('home.network.node6.name'), lng:104.928, lat:11.543, energy:t('home.network.energyBus12'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'88%', health:'94%', vehicleCount:12, routeCount:5, desc:t('home.network.node6.desc'), address:t('home.network.addr6') },
  { id:7, nodeType:'bus', name:t('home.network.node7.name'), lng:106.715, lat:10.763, energy:t('home.network.energyBus8'), runtime:t('home.network.runtime1_5Year'), status:t('home.network.online'), charge:'90%', health:'95%', vehicleCount:8, routeCount:3, desc:t('home.network.node7.desc'), address:t('home.network.addr7') },
  { id:8, nodeType:'bus', name:t('home.network.node8.name'), lng:90.380, lat:23.788, energy:t('home.network.energyBus15'), runtime:t('home.network.runtime3Year'), status:t('home.network.online'), charge:'85%', health:'93%', vehicleCount:15, routeCount:6, desc:t('home.network.node8.desc'), address:t('home.network.addr8') },
  // 工商业储能 (commercial)
  { id:9, nodeType:'commercial', name:t('home.network.node9.name'), lng:103.523, lat:10.626, energy:'500kWh '+t('home.network.liquidCabinet'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'95%', health:'98%', peakSaving:t('home.network.peaksave128'), desc:t('home.network.node9.desc'), address:t('home.network.addr9') },
  { id:10, nodeType:'commercial', name:t('home.network.node10.name'), lng:105.860, lat:21.035, energy:'215kWh × 2 '+t('home.network.storageCabinet'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'89%', health:'96%', peakSaving:t('home.network.peaksave86'), desc:t('home.network.node10.desc'), address:t('home.network.addr10') },
  { id:11, nodeType:'commercial', name:t('home.network.node11.name'), lng:90.412, lat:23.793, energy:'300kWh '+t('home.network.storageCabinet'), runtime:t('home.network.runtime1_5Year'), status:t('home.network.online'), charge:'91%', health:'95%', peakSaving:t('home.network.peaksave153'), desc:t('home.network.node11.desc'), address:t('home.network.addr11') },
  // 固定储能柜 (container)
  { id:12, nodeType:'container', name:t('home.network.node12.name'), lng:104.100, lat:12.565, energy:t('home.network.energyContainer344'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'93%', health:'97%', capacity:'3440kWh', dailyCycle:t('home.network.dailyCycle1_2'), desc:t('home.network.node12.desc'), address:t('home.network.addr12') },
  { id:13, nodeType:'container', name:t('home.network.node13.name'), lng:106.350, lat:10.420, energy:t('home.network.energyContainer5M'), runtime:t('home.network.runtime2Year'), status:t('home.network.online'), charge:'88%', health:'95%', capacity:'5000kWh', dailyCycle:t('home.network.dailyCycle1_5'), desc:t('home.network.node13.desc'), address:t('home.network.addr13') },
  { id:14, nodeType:'container', name:t('home.network.node14.name'), lng:121.050, lat:14.580, energy:t('home.network.energyContainer145'), runtime:t('home.network.runtime1_5Year'), status:t('home.network.online'), charge:'90%', health:'96%', capacity:'1454kWh', dailyCycle:t('home.network.dailyCycle0_8'), desc:t('home.network.node14.desc'), address:t('home.network.addr14') },
  { id:15, nodeType:'container', name:t('home.network.node15.name'), lng:107.650, lat:-6.950, energy:t('home.network.energyContainer6M'), runtime:t('home.network.runtime1Year'), status:t('home.network.online'), charge:'86%', health:'94%', capacity:'6000kWh', dailyCycle:t('home.network.dailyCycle1_8'), desc:t('home.network.node15.desc'), address:t('home.network.addr15') },
];

// ─── 统计数字动画 ──────────────────────────────────────
function StatCounter({ end, label, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1500;
        const step = Math.ceil(end / (duration / 16));
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(start);
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-yellow-400">{count.toLocaleString()}{suffix}</div>
      <div className="text-sm text-yellow-400 mt-1">{label}</div>
    </div>
  );
}

// ─── 辅助函数：生成换电槽位状态 ─────────────────────────
function generateSlots(total, available) {
  return Array.from({ length: total }, (_, i) => i < (total - available) ? 'rented' : 'available');
}

// ─── 板块 1：电池资产 ──────────────────────────────────
function BatteryAssetsSection() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('swap');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const loggedIn = isLoggedIn();
  const BATTERY_ASSETS = useBatteryAssets();

  const categories = [
    { key:'swap', label:t('home.catSwap'), icon:'🏍️', desc:t('home.catSwapDesc') },
    { key:'vehicle', label:t('home.catVehicle'), icon:'🚛', desc:t('home.catVehicleDesc') },
    { key:'commercial', label:t('home.catCommercial'), icon:'🚚', desc:t('home.catCommercialDesc') },
    { key:'container', label:t('home.catContainer'), icon:'📦', desc:t('home.catContainerDesc') },
  ];

  // 自动轮播
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveCategory(prev => {
        const idx = categories.findIndex(c => c.key === prev);
        return categories[(idx + 1) % categories.length].key;
      });
      setSelectedAsset(null);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  return (
    <section id="battery-assets" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Battery className="h-4 w-4 mr-2" /> {t('home.batteryAssets')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.batteryAssetsMatrix')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t('home.batteryAssetsDesc')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setSelectedAsset(null); }}
              className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat.key
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="mr-2">{cat.icon}</span>{cat.label}
            </button>
          ))}
          <button
            onClick={() => setAutoPlay(prev => !prev)}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
              autoPlay
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {autoPlay ? t('home.stopAutoPlay') : t('home.autoPlay')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {BATTERY_ASSETS[activeCategory].map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedAsset(selectedAsset?.id === item.id ? null : item)}
              className={`group bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 ${
                selectedAsset?.id === item.id
                  ? 'border-gray-900 shadow-xl ring-2 ring-gray-900/10 scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <img src={item.img} alt={item.model} loading="lazy" decoding="async"
                  onError={(e) => { e.target.src = '/design-images/image15.jpeg'; }}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-base text-gray-900 leading-snug">{item.model}</h3>
                  <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full whitespace-nowrap ml-2">{item.energy}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{item.scene}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">{t('home.voltage')}</div><div className="font-semibold text-gray-700">{item.voltage}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">{t('home.current')}</div><div className="font-semibold text-gray-700">{item.current}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">{t('home.weight')}</div><div className="font-semibold text-gray-700">{item.weight}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedAsset && (
          <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedAsset.model}</h3>
                <p className="text-blue-600 font-medium mt-1">{selectedAsset.energy} · {selectedAsset.scene}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:t('home.nominalVoltage'), value:selectedAsset.voltage }, { label:t('home.capacity'), value:selectedAsset.capacity },
                { label:t('home.continuousCurrent'), value:selectedAsset.current }, { label:t('home.dimensions'), value:selectedAsset.size },
                { label:t('home.netWeight'), value:selectedAsset.weight }, { label:t('home.unitEnergy'), value:selectedAsset.energy },
              ].map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                  <div className="font-semibold text-gray-900">{p.value}</div>
                </div>
              ))}
            </div>
            {!loggedIn && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href="/register" className="text-blue-600 font-medium text-sm hover:underline">{t('home.registerToView')}</Link>
              </div>
            )}
          </div>
        )}
        <div className="text-center mt-8"><p className="text-sm text-gray-400">{t('home.totalProductsBanner', { count: Object.values(BATTERY_ASSETS).flat().length })}</p></div>
      </div>
    </section>
  );
}



// ─── 电池实时数据 ─────────────────────────────────────
let _batteryLiveCache = null;
let _batteryLiveLoaded = false;
let _batteryLivePromise = null;

function useBatteryLive() {
  const [data, setData] = useState(() => _batteryLiveCache || { sites: [], units: [], warehouses: [], unsold_total: 0 });
  useEffect(() => {
    if (_batteryLiveLoaded) { setData(_batteryLiveCache || { sites: [], units: [], warehouses: [], unsold_total: 0 }); }
    if (_batteryLivePromise) {
      _batteryLivePromise.then(d => setData(d));
      _batteryLivePromise = null;
    } else {
      _batteryLivePromise = fetch('/api/battery-units/live')
        .then(res => res.json())
        .then(d => {
          const result = { sites: d.sites || [], units: d.units || [], warehouses: d.warehouses || [], unsold_total: d.unsold_total || 0 };
          _batteryLiveCache = result;
          _batteryLiveLoaded = true;
          _batteryLivePromise = null;
          return result;
        })
        .catch(() => {
          _batteryLiveCache = _batteryLiveCache || { sites: [], units: [], warehouses: [], unsold_total: 0 };
          _batteryLiveLoaded = true;
          _batteryLivePromise = null;
          return { sites: [], units: [], warehouses: [], unsold_total: 0 };
        });
      _batteryLivePromise.then(d => setData(d));
    }
    // 每 10 秒轮询，使大巴 GPS 标记实时移动
    const interval = setInterval(() => {
      fetch('/api/battery-units/live')
        .then(res => res.json())
        .then(d => setData({ sites: d.sites || [], units: d.units || [], warehouses: d.warehouses || [], unsold_total: d.unsold_total || 0 }))
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, []);
  return data;
}

// ─── 电池状态颜色映射 ─────────────────────────────────
const BATTERY_STATUS_COLORS = {
  normal: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  offline: '#6B7280',
};

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
    else if (temp >= 10 && temp <= 25) tempH = 'green';
    else if ((temp >= 0 && temp < 10) || (temp > 25 && temp <= 35)) tempH = 'yellow';
    else tempH = 'orange';  // temp > 35 && temp <= 45
  }
  const cycH = sensorHealth(cycles, 300, 500, 1000, false);
  const hs = [socH, tempH, cycH].filter(Boolean);
  if (hs.includes('red')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('orange')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('yellow')) return { status: 'warning', color: '#F59E0B' };
  return { status: 'normal', color: '#10B981' };
}

/** 根据电池 unit 推断显示用的状态（基于传感器三因子综合判定） */
function getDisplayStatus(unit) {
  return computeBatteryHealth(unit.soc, unit.temperature, unit.cycle_count).status;
}

// ─── i18n 字段解析工具 ─────────────────────────────────
function resolveI18n(obj, i18nKey, fallback, i18n) {
  const i18nData = obj?.[i18nKey];
  if (!i18nData || typeof i18nData !== 'object') return fallback;
  return i18nData[i18n.language] || i18nData['zh-CN'] || fallback;
}

// ─── 板块 3：电池网络分布（四种图标 + 电池独立标记） ────
function BatteryNetworkSection({ amapReady }) {
  const { t, i18n } = useTranslation();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCabinetSite, setSelectedCabinetSite] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedBatteryUnit, setSelectedBatteryUnit] = useState(null);
  const [selectedLineSite, setSelectedLineSite] = useState(null);
  const [selectedMobileSite, setSelectedMobileSite] = useState(null);
  const [selectedFixedSite, setSelectedFixedSite] = useState(null);
  const nodeMarkersRef = useRef({});
  const tempMarkerRef = useRef(null);
  const tempMarkerTimerRef = useRef(null);
  const batteryLive = useBatteryLive();
  const [siteTypes, setSiteTypes] = useState([]);
  useEffect(() => {
    fetch('/api/site-types').then(r => r.json()).then(d => setSiteTypes(d.site_types || [])).catch(() => {});
  }, []);

  // ─── 苹果风格 SVG 矢量图标 ─────────────────
  const svgIcons = {
    swap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    bus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="8" y1="18" x2="8" y2="20"/><line x1="16" y1="18" x2="16" y2="20"/><line x1="3" y1="11" x2="21" y2="11"/></svg>`,
    commercial: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="13" rx="2"/><path d="M9 9V5l3-2 3 2v4"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
    container: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="9" y1="5" x2="9" y2="20"/><line x1="15" y1="5" x2="15" y2="20"/></svg>`,
    truck: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  };
  const nodeIconConfig = {
    'swap':      { color:'#f97316', svg:svgIcons.swap,      label:t('home.nodeType.swap'),   iconBg:'bg-orange-100', iconText:'text-orange-700' },
    'bus':       { color:'#3b82f6', svg:svgIcons.bus,       label:t('home.nodeType.bus'),   iconBg:'bg-blue-100',   iconText:'text-blue-700' },
    'commercial':{ color:'#7c3aed', svg:svgIcons.truck,      label:t('home.nodeType.commercial'), iconBg:'bg-purple-100', iconText:'text-purple-700' },
    'container': { color:'#ef4444', svg:svgIcons.container, label:t('home.nodeType.container'), iconBg:'bg-red-100', iconText:'text-red-700' },
  };

  // ─── 站点类型配置（从DB动态加载）──────────────────
  const SITE_TYPE_COLORS = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-red-100 text-red-700', 'bg-green-100 text-green-700', 'bg-cyan-100 text-cyan-700'];
  const siteTypeConfig = useMemo(() => {
    const config = {};
    (siteTypes || []).forEach((st, idx) => {
      const display = st.name_i18n?.[i18n.language] || st.name_i18n?.['zh-CN'] || st.name;
      config[st.name] = { color: SITE_TYPE_COLORS[idx % SITE_TYPE_COLORS.length], label: display };
    });
    return config;
  }, [siteTypes, i18n.language]);

  // ─── 按站点类型筛选（基于 siteTypes 数据）──────────────────
  const siteTypeNameMap = useMemo(() => {
    const map = {};
    siteTypes.forEach(st => { map[st.name] = st; });
    return map;
  }, [siteTypes]);

  const swapKey = useMemo(() => siteTypes.find(st => st.name_i18n?.['zh-CN'] === '换电站' || st.name === '换电站')?.name || '换电站', [siteTypes]);
  const lineKey = useMemo(() => siteTypes.find(st => st.name_i18n?.['zh-CN'] === '运营线路' || st.name === '运营线路')?.name || '运营线路', [siteTypes]);
  const mobileKey = useMemo(() => siteTypes.find(st => st.name_i18n?.['zh-CN'] === '移动储能柜' || st.name === '移动储能柜')?.name || '移动储能柜', [siteTypes]);
  const fixedKey = useMemo(() => siteTypes.find(st => st.name_i18n?.['zh-CN'] === '固定储能柜' || st.name === '固定储能柜')?.name || '固定储能柜', [siteTypes]);

  const swapSites = useMemo(() => {
    return (batteryLive.sites || []).filter(s => s.site_type === swapKey);
  }, [batteryLive.sites, swapKey]);

  const lineSites = useMemo(() => {
    return (batteryLive.sites || []).filter(s => s.site_type === lineKey);
  }, [batteryLive.sites, lineKey]);

  const mobileSites = useMemo(() => {
    return (batteryLive.sites || []).filter(s => s.site_type === mobileKey);
  }, [batteryLive.sites, mobileKey]);

  const fixedSites = useMemo(() => {
    return (batteryLive.sites || []).filter(s => s.site_type === fixedKey);
  }, [batteryLive.sites, fixedKey]);

  const vehicleUnits = useMemo(() =>
    (batteryLive.units || []).filter(u =>
      u.unit_code && (u.unit_code.startsWith('BAT-BUS') || u.unit_code.startsWith('BAT-TRUCK'))
    ),
    [batteryLive.units]
  );

  const containerUnits = useMemo(() =>
    (batteryLive.units || []).filter(u => u.container_sensors),
    [batteryLive.units]
  );

  const statusSummary = useMemo(() => {
    const s = { normal: 0, warning: 0, critical: 0, offline: 0 };
    (batteryLive.units || []).forEach(u => { if (s[u.status] !== undefined) s[u.status]++; });
    return s;
  }, [batteryLive]);

  const warehouses = useMemo(() => batteryLive.warehouses || [], [batteryLive]);

  const siteList = useMemo(() => batteryLive.sites || [], [batteryLive.sites]);

  // ─── 地图渲染 ──────────────────
  useEffect(() => {
    if (!amapReady || !containerRef.current) return;
    if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    const AMap = window.AMap;
    const map = new AMap.Map(containerRef.current, {
      center: [105, 14],
      zoom: 4,
      mapStyle: 'amap://styles/light',
    });
    mapRef.current = map;

    // 渲染传统 NETWORK_NODES 标记（仅显示 batteryLive.sites 中存在的站点，避免幽灵icon）
    nodeMarkersRef.current = {};
    getNetworkNodes(t).filter(n => (batteryLive.sites || []).some(s => s.site_name === n.name)).forEach((n) => {
      const cfg = nodeIconConfig[n.nodeType];
      const matchingUnit = (batteryLive.units || []).find(u => u.site_name === n.name);
      const nodeSocColor = matchingUnit ? computeBatteryHealth(matchingUnit.soc, matchingUnit.temperature, matchingUnit.cycle_count).color : '#10B981';
      const marker = new AMap.Marker({
        position: [n.lng, n.lat],
        content: `<div style="position:relative;width:30px;height:30px;background:${cfg.color};border-radius:8px;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center">${cfg.svg}<div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${nodeSocColor};border-radius:50%;border:1.5px solid white"></div></div>`,
        offset: new AMap.Pixel(-16, -16),
      });
      nodeMarkersRef.current[n.id] = marker;
      marker.on('click', () => {
        map.setZoomAndCenter(14, [n.lng, n.lat]);
        if (n.nodeType === 'bus') {
          setActiveTab(1);
          const matchedSite = lineSites.find(s => s.site_name === n.name);
          if (matchedSite) setSelectedLineSite(matchedSite);
        }
      });
      map.add(marker);
    });

    // 渲染电池独立标记
    (batteryLive.units || []).forEach((bu) => {
      if (!bu.longitude || !bu.latitude) return;
      if (bu.soc == null && bu.temperature == null && bu.cycle_count == null) return;
      const isVehicle = bu.unit_code && (bu.unit_code.startsWith('BAT-BUS') || bu.unit_code.startsWith('BAT-TRUCK'));
      const isMobileStorage = bu.site_name && (batteryLive.sites || []).some(s => s.site_name === bu.site_name && s.site_type && s.site_type === mobileKey);
      const isFixedStorage = bu.site_name && (batteryLive.sites || []).some(s => s.site_name === bu.site_name && s.site_type && s.site_type === fixedKey);
      const health = computeBatteryHealth(bu.soc, bu.temperature, bu.cycle_count);
      const color = health.color;
      const markerContent = isVehicle
        ? `<div style="position:relative;width:30px;height:30px;background:#3b82f6;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center" title="${bu.unit_code}">${svgIcons.bus}<div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${color};border-radius:50%;border:1.5px solid white"></div></div>`
        : isMobileStorage
          ? `<div style="position:relative;width:30px;height:30px;background:#7c3aed;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 10px rgba(124,58,237,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center" title="${bu.unit_code}">${svgIcons.truck}<div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${color};border-radius:50%;border:1.5px solid white"></div></div>`
          : isFixedStorage
            ? `<div style="position:relative;width:30px;height:30px;background:#ef4444;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 10px rgba(239,68,68,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center" title="${bu.unit_code}">${svgIcons.container}<div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${color};border-radius:50%;border:1.5px solid white"></div></div>`
            : `<div style="position:relative;width:30px;height:30px;background:#f97316;border-radius:8px;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center" title="${bu.unit_code}">${svgIcons.swap}<div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${color};border-radius:50%;border:1.5px solid white"></div></div>`;
      const markerOffset = new AMap.Pixel(-16, -16);
      const marker = new AMap.Marker({
        position: [bu.longitude, bu.latitude],
        content: markerContent,
        offset: markerOffset,
      });
      marker.on('click', () => {
        map.setZoomAndCenter(14, [bu.longitude, bu.latitude]);
        const lineKeyInner = siteTypes.find(st => st.name_i18n?.['zh-CN'] === '运营线路' || st.name === '运营线路')?.name || '运营线路';
        const mobileKeyInner = siteTypes.find(st => st.name_i18n?.['zh-CN'] === '移动储能柜' || st.name === '移动储能柜')?.name || '移动储能柜';
        const fixedKeyInner = siteTypes.find(st => st.name_i18n?.['zh-CN'] === '固定储能柜' || st.name === '固定储能柜')?.name || '固定储能柜';
        const swapKeyInner = siteTypes.find(st => st.name_i18n?.['zh-CN'] === '换电站' || st.name === '换电站')?.name || '换电站';
        if (bu.unit_code && (bu.unit_code.startsWith('BAT-BUS') || bu.unit_code.startsWith('BAT-TRUCK'))) {
          // Vehicle battery: find matching lineSite, set selectedLineSite + selectedVehicle
          const lineSitesFiltered = (batteryLive.sites || []).filter(s => s.site_type && s.site_type === lineKeyInner);
          const matchedSite = lineSitesFiltered.find(s => s.site_name === bu.site_name);
          if (matchedSite) setSelectedLineSite(matchedSite);
          setSelectedVehicle(bu);
          setActiveTab(1);
        } else if (isMobileStorage) {
          // Mobile storage battery
          const mobileSitesFiltered = (batteryLive.sites || []).filter(s => s.site_type && s.site_type === mobileKeyInner);
          const matchedSite = mobileSitesFiltered.find(s => s.site_name === bu.site_name);
          if (matchedSite) setSelectedMobileSite(matchedSite);
          setSelectedVehicle(bu);
          setActiveTab(2);
        } else {
          setSelectedBatteryUnit(bu);
          if (bu.unit_code && bu.container_sensors) {
            const mSites = (batteryLive.sites || []).filter(s => s.site_type && s.site_type === mobileKeyInner);
            const fSites = (batteryLive.sites || []).filter(s => s.site_type && s.site_type === fixedKeyInner);
            const matchedMobileSite = mSites.find(s => s.site_name === bu.site_name);
            const matchedFixedSite = fSites.find(s => s.site_name === bu.site_name);
            if (matchedMobileSite) {
              setSelectedMobileSite(matchedMobileSite);
              setActiveTab(2);
            } else if (matchedFixedSite) {
              setSelectedFixedSite(matchedFixedSite);
              setActiveTab(3);
            } else if (mSites.length > 0) {
              setActiveTab(2);
            } else if (fSites.length > 0) {
              setActiveTab(3);
            } else {
              setActiveTab(0);
            }
          } else {
            const swapSitesList = (batteryLive.sites || []).filter(s => !s.site_type || s.site_type === swapKeyInner);
            const matchedSite = swapSitesList.find(s => s.site_name === bu.site_name);
            if (matchedSite) setSelectedCabinetSite(matchedSite);
            setActiveTab(0);
          }
        }
      });
      map.add(marker);
    });

    return () => {
      map.destroy();
      mapRef.current = null;
      if (tempMarkerTimerRef.current) {
        clearTimeout(tempMarkerTimerRef.current);
        tempMarkerTimerRef.current = null;
      }
    };
  }, [amapReady, batteryLive.units]);

  // ─── Tab 配置 ──────────────────
  const tabs = [
    { key: 0, icon: Zap, label: t('home.nodeType.swap'), count: swapSites.length },
    { key: 1, icon: Bus, label: t('home.nodeType.bus'), count: lineSites.length },
    { key: 2, icon: Truck, label: t('home.nodeType.commercial'), count: mobileSites.length },
    { key: 3, icon: Container, label: t('home.nodeType.container'), count: fixedSites.length },
  ];

  const handleTabClick = useCallback((key) => {
    setActiveTab(key);
    setSelectedCabinetSite(null);
    setSelectedVehicle(null);
    setSelectedBatteryUnit(null);
    setSelectedLineSite(null);
    setSelectedMobileSite(null);
    setSelectedFixedSite(null);
  }, []);

  // ─── 路线 SVG 路径生成 ──────────────────
  const generateRoutePath = useCallback((route, width, height) => {
    if (!route || route.length < 2) return '';
    const lngs = route.map(p => p.lng);
    const lats = route.map(p => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const pad = 0.15;
    const lngRange = (maxLng - minLng) || 0.5;
    const latRange = (maxLat - minLat) || 0.5;
    const xScale = (width - 40) / (lngRange * (1 + pad * 2));
    const yScale = (height - 40) / (latRange * (1 + pad * 2));
    const scale = Math.min(xScale, yScale);
    const offsetX = (width - lngRange * scale) / 2;
    const offsetY = (height - latRange * scale) / 2;
    const points = route.map(p => {
      const x = offsetX + (p.lng - minLng + pad * lngRange) * scale;
      const y = offsetY + (maxLat - p.lat + pad * latRange) * scale;
      return `${x},${y}`;
    });
    return points.join(' ');
  }, []);

  // ─── 传感器详情卡片组件 ──────────────────
  const SensorCard = ({ title, value, unit = '', color = '' }) => (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="text-[10px] text-gray-400 mb-0.5">{title}</div>
      <div className={`text-sm font-bold ${color || 'text-gray-900'}`}>
        {value != null ? `${value}${unit}` : '—'}
      </div>
    </div>
  );

  return (
    <section id="battery-network" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Network className="h-4 w-4 mr-2" /> {t('home.batteryNetwork')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.networkTitle')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t('home.networkDesc')}</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {Object.entries(nodeIconConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: cfg.color }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {key === 'swap' && <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
                    {key === 'bus' && <><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="8" y1="18" x2="8" y2="20" /><line x1="16" y1="18" x2="16" y2="20" /><line x1="3" y1="11" x2="21" y2="11" /></>}
                    {key === 'commercial' && <><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>}
                    {key === 'container' && <><rect x="3" y="5" width="18" height="15" rx="2" /><line x1="3" y1="11" x2="21" y2="11" /><line x1="9" y1="5" x2="9" y2="20" /><line x1="15" y1="5" x2="15" y2="20" /></>}
                  </svg>
                </span>
                {cfg.label}
              </div>
            ))}
            <div className="border-l border-gray-300 h-4 mx-1" />
            {Object.entries(BATTERY_STATUS_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {t(`home.status.${key}`)}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* 左侧地图 */}
          <div className="lg:col-span-3">
            <div ref={containerRef} className="w-full h-[580px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
          </div>

          {/* 右侧面板 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[580px] flex flex-col">
              {/* Tab 按钮栏 */}
              <div className="p-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabClick(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab 内容区 */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* ═══ Tab 0: 换电站 ═══ */}
                {activeTab === 0 && (
                  <div className="space-y-4">
                    {!selectedCabinetSite ? (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {t('home.swapSites')} ({swapSites.length})
                        </div>
                        {swapSites.length > 0 ? (
                          <div className="space-y-1.5">
                            {swapSites.map((site) => (
                              <button
                                key={site.site_id}
                                onClick={() => setSelectedCabinetSite(site)}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium text-sm text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name, i18n)}</span>
                                  </div>
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    {(batteryLive.units || []).filter(u => u.site_name === site.site_name).length}{t('home.blockUnit')}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{resolveI18n(site, 'city_i18n', site.city, i18n)} · {resolveI18n(site, 'country_i18n', site.country, i18n)}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-gray-400 text-sm">{t('home.noSwapSites')}</div>
                        )}
                      </>
                    ) : (
                      <CabinetDiagram
                        site={selectedCabinetSite}
                        onBack={() => setSelectedCabinetSite(null)}
                        SensorCard={SensorCard}
                        onTrackBattery={(slot) => {
                          const site = selectedCabinetSite;
                          if (!mapRef.current || !site || !site.latitude || !site.longitude) return;
                          const AMap = window.AMap;
                          mapRef.current.setZoomAndCenter(16, [site.longitude, site.latitude]);
                          // Clear previous temp marker and timer
                          if (tempMarkerRef.current) {
                            tempMarkerRef.current.setMap(null);
                            tempMarkerRef.current = null;
                          }
                          if (tempMarkerTimerRef.current) {
                            clearTimeout(tempMarkerTimerRef.current);
                            tempMarkerTimerRef.current = null;
                          }
                          // Reset all NETWORK_NODES markers to normal size
                          Object.values(nodeMarkersRef.current).forEach(m => {
                            m.setContent(m.getContent().replace(/width:36px;height:36px/g, 'width:30px;height:30px'));
                          });
                          // Try to find matching NETWORK_NODES marker by site name
                          const matchedNode = getNetworkNodes(t).find(n => n.name === site.site_name);
                          if (matchedNode && nodeMarkersRef.current[matchedNode.id]) {
                            const m = nodeMarkersRef.current[matchedNode.id];
                            const cfg = nodeIconConfig[matchedNode.nodeType];
                            m.setContent(`<div style="width:36px;height:36px;background:${cfg.color};border-radius:8px;border:3px solid #f97316;box-shadow:0 2px 18px rgba(249,115,22,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center">${cfg.svg}</div>`);
                          } else {
                            // Create a temporary cabinet icon marker at site coordinates
                            tempMarkerRef.current = new AMap.Marker({
                              position: [site.longitude, site.latitude],
                              content: `<div style="width:30px;height:30px;background:#f97316;border-radius:8px;border:3px solid #fff;box-shadow:0 2px 10px rgba(249,115,22,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center">${svgIcons.swap}</div>`,
                              offset: new AMap.Pixel(-16, -16),
                            });
                            tempMarkerRef.current.setMap(mapRef.current);
                            // Auto-remove temp marker after 5 seconds
                            tempMarkerTimerRef.current = setTimeout(() => {
                              if (tempMarkerRef.current) {
                                tempMarkerRef.current.setMap(null);
                                tempMarkerRef.current = null;
                              }
                              tempMarkerTimerRef.current = null;
                            }, 5000);
                          }
                        }}
                      />
                    )}
                  </div>
                )}

                {/* ═══ Tab 1: 运营线路 ═══ */}
                {activeTab === 1 && (
                  <div className="space-y-4">
                    {!selectedLineSite ? (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {t('home.lineSites')} ({lineSites.length})
                        </div>
                        {lineSites.length > 0 ? (
                          <div className="space-y-1.5">
                            {lineSites.map((site) => (
                              <button
                                key={site.site_id}
                                onClick={() => {
                                  setSelectedLineSite(site);
                                  if (mapRef.current && site.latitude && site.longitude) {
                                    mapRef.current.setZoomAndCenter(14, [site.longitude, site.latitude]);
                                  }
                                }}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Bus className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium text-sm text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name, i18n)}</span>
                                  </div>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {site.real_battery_count}{t('home.blockUnit')}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{site.site_code}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
<div className="py-8 text-center text-gray-400 text-sm">{t('home.noLineSites')}</div>
                        )}
                      </>
                    ) : !selectedVehicle ? (
                      <>
                        <button
                          onClick={() => setSelectedLineSite(null)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToSiteList')}
                        </button>
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-sm text-gray-900">{selectedLineSite.site_name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{selectedLineSite.site_code}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {t('home.siteVehicles')} ({(() => {
                            const vs = (batteryLive.units || []).filter(
                              u => u.site_name === selectedLineSite.site_name
                            );
                            return vs.length;
                          })()})
                        </div>
                        <div className="space-y-1.5">
                          {(batteryLive.units || []).filter(
                            u => u.site_name === selectedLineSite.site_name
                          ).map((unit) => {
                            const ds = getDisplayStatus(unit);
                            return (
                            <button
                              key={unit.unit_code}
                              onClick={() => {
                                setSelectedVehicle(unit);
                                if (mapRef.current && unit.latitude && unit.longitude) {
                                  mapRef.current.setZoomAndCenter(15, [unit.longitude, unit.latitude]);
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: computeBatteryHealth(unit.soc, unit.temperature, unit.cycle_count).color }} />
                                  <span className="font-medium text-sm text-gray-900">{unit.unit_code}</span>
                                </div>
                                <span className="text-xs text-gray-400">SOC {unit.soc != null ? `${unit.soc}%` : '—'}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                {unit.temperature != null && <span>{unit.temperature}°C</span>}
                                {unit.health != null && <span>{t('home.health')} {unit.health}%</span>}
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <VehicleDetail
                        vehicle={selectedVehicle}
                        onBack={() => setSelectedVehicle(null)}
                        generateRoutePath={generateRoutePath}
                        SensorCard={SensorCard}
                        onTrackToMap={() => {
                          if (mapRef.current && selectedVehicle.latitude && selectedVehicle.longitude) {
                            mapRef.current.setZoomAndCenter(15, [selectedVehicle.longitude, selectedVehicle.latitude]);
                          }
                        }}
                      />
                    )}
                  </div>
                )}

                {/* ═══ Tab 2: 移动储能柜 ═══ */}
                {activeTab === 2 && (
                  <div className="space-y-4">
                    {!selectedMobileSite ? (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {t('home.mobileSites')} ({mobileSites.length})
                        </div>
                        {mobileSites.length > 0 ? (
                          <div className="space-y-1.5">
                            {mobileSites.map((site) => (
                              <button
                                key={site.site_id}
                                onClick={() => {
                                  setSelectedMobileSite(site);
                                  if (mapRef.current && site.latitude && site.longitude) {
                                    mapRef.current.setZoomAndCenter(14, [site.longitude, site.latitude]);
                                  }
                                }}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium text-sm text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name, i18n)}</span>
                                  </div>
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                    {site.real_battery_count}{t('home.blockUnit')}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{site.site_code}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
<div className="py-8 text-center text-gray-400 text-sm">{t('home.noMobileSites')}</div>
                        )}
                      </>
                    ) : !selectedVehicle ? (
                      <>
                        <button
                          onClick={() => setSelectedMobileSite(null)}
                          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToSiteList')}
                        </button>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold text-sm text-gray-900">{selectedMobileSite.site_name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{selectedMobileSite.site_code}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {t('home.siteUnits')} ({(() => {
                            const us = (batteryLive.units || []).filter(
                              u => u.site_name === selectedMobileSite.site_name
                            );
                            return us.length;
                          })()})
                        </div>
                        <div className="space-y-1.5">
                          {(batteryLive.units || []).filter(
                            u => u.site_name === selectedMobileSite.site_name
                          ).map((unit) => {
                            const ds = getDisplayStatus(unit);
                            return (
                            <button
                              key={unit.unit_code}
                              onClick={() => {
                                setSelectedVehicle(unit);
                                if (mapRef.current && unit.latitude && unit.longitude) {
                                  mapRef.current.setZoomAndCenter(15, [unit.longitude, unit.latitude]);
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: computeBatteryHealth(unit.soc, unit.temperature, unit.cycle_count).color }} />
                                  <span className="font-medium text-sm text-gray-900">{unit.unit_code}</span>
                                </div>
                                <span className="text-xs text-gray-400">SOC {unit.soc != null ? `${unit.soc}%` : '—'}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                {unit.temperature != null && <span>{unit.temperature}°C</span>}
                                {unit.health != null && <span>{t('home.health')} {unit.health}%</span>}
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <VehicleDetail
                        vehicle={selectedVehicle}
                        onBack={() => setSelectedVehicle(null)}
                        generateRoutePath={generateRoutePath}
                        SensorCard={SensorCard}
                        onTrackToMap={() => {
                          if (mapRef.current && selectedVehicle.latitude && selectedVehicle.longitude) {
                            mapRef.current.setZoomAndCenter(15, [selectedVehicle.longitude, selectedVehicle.latitude]);
                          }
                        }}
                      />
                    )}
                  </div>
                )}

                {/* ═══ Tab 3: 固定储能柜 ═══ */}
                {activeTab === 3 && (
                  <div className="space-y-4">
                    {!selectedFixedSite ? (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {t('home.fixedSites')} ({fixedSites.length})
                        </div>
                        {fixedSites.length > 0 ? (
                          <div className="space-y-1.5">
                            {fixedSites.map((site) => (
                              <button
                                key={site.site_id}
                                onClick={() => {
                                  setSelectedFixedSite(site);
                                  if (mapRef.current && site.latitude && site.longitude) {
                                    mapRef.current.setZoomAndCenter(14, [site.longitude, site.latitude]);
                                  }
                                }}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Container className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-sm text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name, i18n)}</span>
                                  </div>
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    {site.real_battery_count}{t('home.blockUnit')}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{site.site_code} · {resolveI18n(site, 'city_i18n', site.city, i18n)}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
<div className="py-8 text-center text-gray-400 text-sm">{t('home.noFixedSites')}</div>
                        )}
                      </>
                    ) : !selectedVehicle ? (
                      <>
                        <button
                          onClick={() => setSelectedFixedSite(null)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToSiteList')}
                        </button>
                        <div className="flex items-center gap-2">
                          <Container className="h-4 w-4 text-red-500" />
                          <span className="font-semibold text-sm text-gray-900">{selectedFixedSite.site_name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{selectedFixedSite.site_code}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {t('home.siteUnits')} ({(() => {
                            const us = (batteryLive.units || []).filter(
                              u => u.site_name === selectedFixedSite.site_name
                            );
                            return us.length;
                          })()})
                        </div>
                        <div className="space-y-1.5">
                          {(batteryLive.units || []).filter(
                            u => u.site_name === selectedFixedSite.site_name
                          ).map((unit) => {
                            const ds = getDisplayStatus(unit);
                            return (
                            <button
                              key={unit.unit_code}
                              onClick={() => {
                                setSelectedVehicle(unit);
                                if (mapRef.current && unit.latitude && unit.longitude) {
                                  mapRef.current.setZoomAndCenter(15, [unit.longitude, unit.latitude]);
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: computeBatteryHealth(unit.soc, unit.temperature, unit.cycle_count).color }} />
                                  <span className="font-medium text-sm text-gray-900">{unit.unit_code}</span>
                                </div>
                                <span className="text-xs text-gray-400">SOC {unit.soc != null ? `${unit.soc}%` : '—'}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                {unit.temperature != null && <span>{unit.temperature}°C</span>}
                                {unit.health != null && <span>{t('home.health')} {unit.health}%</span>}
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <VehicleDetail
                        vehicle={selectedVehicle}
                        onBack={() => setSelectedVehicle(null)}
                        generateRoutePath={generateRoutePath}
                        SensorCard={SensorCard}
                        onTrackToMap={() => {
                          if (mapRef.current && selectedVehicle.latitude && selectedVehicle.longitude) {
                            mapRef.current.setZoomAndCenter(15, [selectedVehicle.longitude, selectedVehicle.latitude]);
                          }
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* 选中电池传感器详情 - 全宽行 */}
        {selectedBatteryUnit && !(activeTab === 0 && selectedCabinetSite) && activeTab !== 1 && activeTab !== 2 && activeTab !== 3 && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-4 space-y-3 bg-amber-50/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">
                  {selectedBatteryUnit.unit_code}
                </span>
                <button
                  onClick={() => setSelectedBatteryUnit(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <SensorCard title="SOC" value={selectedBatteryUnit.soc} unit="%" color="text-blue-600" />
                <SensorCard title={t('home.temperature')} value={selectedBatteryUnit.temperature} unit="°C" color="text-orange-600" />
                <SensorCard title={t('home.voltage')} value={selectedBatteryUnit.voltage} unit="V" color="text-purple-600" />
                <SensorCard title={t('home.current')} value={selectedBatteryUnit.current} unit="A" color="text-teal-600" />
                <SensorCard title="SOH" value={selectedBatteryUnit.soh} color="text-emerald-600" />
                <SensorCard title={t('home.cycleCount')} value={selectedBatteryUnit.cycle_count} color="text-gray-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: computeBatteryHealth(selectedBatteryUnit.soc, selectedBatteryUnit.temperature, selectedBatteryUnit.cycle_count).color }} />
                <span className="text-[10px] text-gray-500">{(() => { const s = computeBatteryHealth(selectedBatteryUnit.soc, selectedBatteryUnit.temperature, selectedBatteryUnit.cycle_count).status; return t(s === 'normal' ? 'home.status.normal' : s === 'warning' ? 'home.status.warning' : s === 'critical' ? 'home.status.critical' : 'home.status.offline'); })() || selectedBatteryUnit.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 子组件：换电柜示意图 ────────────────────
function CabinetDiagram({ site, onBack, SensorCard, onTrackBattery }) {
  const { t, i18n } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const rawSlots = site.cabinet_slots || site.cabinetSlots || [];
  let slots = [];
  if (Array.isArray(rawSlots)) { slots = rawSlots; }
  else if (typeof rawSlots === 'string') { try { slots = JSON.parse(rawSlots); } catch { slots = []; } }
  else if (rawSlots && typeof rawSlots === 'object') { slots = Object.values(rawSlots); }
  if (!Array.isArray(slots)) slots = [];
  const totalSlots = slots.length;
  const occupiedSlots = site.real_battery_count ?? slots.filter(s => s.status === 'occupied').length;
  const emptySlots = totalSlots - occupiedSlots;

  const slotStatusColor = (slot) => {
    if (slot.status === 'empty') return 'bg-gray-200 text-gray-400 border-gray-300';
    const h = computeBatteryHealth(slot.sensor_battery_level, slot.sensor_temperature, null);
    if (h.status === 'normal') return 'bg-green-200 border-green-400 text-green-800';
    if (h.status === 'warning') return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    return 'bg-red-200 border-red-400 text-red-800';
  };

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button onClick={() => { onBack(); setSelectedSlot(null); }} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToCabinetList')}
      </button>

      {/* 站点信息 */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-orange-500" />
        <span className="font-semibold text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name, i18n)}</span>
        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{site.site_code}</span>
      </div>

      {/* 槽位统计 */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />{t('home.occupied')} {occupiedSlots}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" />{t('home.empty')} {emptySlots}</span>
        <span className="text-gray-400">{t('home.batteryAssets')} {site.real_battery_count ?? 0}{t('home.blockUnit')} · {t('home.totalPrefix')} {totalSlots}{t('home.slot')}</span>
      </div>

      {/* 选中槽位传感器详情 — 显示在换电柜上方 */}
      {selectedSlot && selectedSlot.status === 'empty' && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {t('home.slotNumber')} {selectedSlot.slot_number}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {t('home.empty')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SensorCard title={t('home.slotNumber')} value={selectedSlot.slot_number} color="text-gray-600" />
            <SensorCard title={t('home.status_label')} value={t('home.empty')} color="text-gray-600" />
          </div>
        </div>
      )}

      {selectedSlot && selectedSlot.status === 'occupied' && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {t('home.slot')} {selectedSlot.slot_number} · {selectedSlot.battery_unit_code || '—'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              selectedSlot.charging ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {selectedSlot.charging ? t('home.charging') : t('home.standby')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SensorCard title="SOC" value={selectedSlot.sensor_battery_level} unit="%" color="text-blue-600" />
            <SensorCard title={t('home.temperature')} value={selectedSlot.sensor_temperature} unit="°C" color="text-orange-600" />
            <SensorCard title={t('home.voltage')} value={selectedSlot.sensor_voltage} unit="V" color="text-purple-600" />
            <SensorCard title={t('home.current')} value={selectedSlot.sensor_current} unit="A" color="text-teal-600" />
            <SensorCard title={t('home.lastSwap')} value={selectedSlot.last_swap_time ? formatTime(selectedSlot.last_swap_time, i18n.language) : '—'} color="text-gray-600" />
            <SensorCard title={t('home.status_label')} value={t('home.occupiedStatus')} color="text-gray-600" />
          </div>
        </div>
      )}

      {/* 换电柜网格 */}
      <div className="bg-gray-100 rounded-xl p-3 border-2 border-gray-300">
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedSlot(slot);
                if (slot.status === 'occupied') onTrackBattery?.(slot);
              }}
              className={`h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all text-xs font-medium cursor-pointer hover:scale-105 hover:shadow-md ${
                slotStatusColor(slot)
              }`}
            >
              <span className="text-[10px] font-bold">{slot.slot_number}</span>
              {slot.status === 'occupied' && (
                <span className="text-[8px] truncate max-w-full px-0.5">{slot.battery_unit_code || '—'}</span>
              )}
            </button>
          ))}
        </div>
        {/* 柜体底部 */}
        <div className="mt-2 h-3 bg-gray-300 rounded-b-md" />
      </div>
    </div>
  );
}

// ─── 子组件：车辆详情 ────────────────────
function VehicleDetail({ vehicle, onBack, generateRoutePath, SensorCard, onTrackToMap }) {
  const { t, i18n } = useTranslation();
  const route = vehicle.route || [];
  const svgWidth = 280;
  const svgHeight = 180;
  const displayStatus = getDisplayStatus(vehicle);
  const vHealth = computeBatteryHealth(vehicle.soc, vehicle.temperature, vehicle.cycle_count);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToUnitList')}
      </button>
      {onTrackToMap && (
        <button onClick={onTrackToMap} className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700">
          <MapPin className="h-4 w-4" /> {t('home.trackOnMap')}
        </button>
      )}

      {/* 车辆信息 */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: vHealth.color }} />
        <span className="text-xs font-medium text-gray-900">{t(vHealth.status === 'normal' ? 'home.status.normal' : vHealth.status === 'warning' ? 'home.status.warning' : vHealth.status === 'critical' ? 'home.status.critical' : 'home.status.offline')}</span>
        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {vehicle.vehicle_type === 'truck' ? t('home.truck') : vehicle.site_type === t('home.fixedStorage') ? t('home.fixedStorage') : t('home.mobileStorage')}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{vehicle.unit_code}</h3>
        <p className="text-sm text-gray-500 mt-1">{vehicle.current_city || vehicle.site_name}</p>
        {vehicle.site_code && <p className="text-xs text-gray-400">{vehicle.site_code}</p>}
      </div>

      {/* 路线示意图 */}
      {route.length >= 2 && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="text-xs font-semibold text-gray-500 mb-2">{t('home.operatingRoute')}</div>
          <svg width={svgWidth} height={svgHeight} className="w-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* 路线连线 */}
            <polyline
              points={generateRoutePath(route, svgWidth, svgHeight)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="6,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            {/* 城市节点 */}
            {(() => {
              const lngs = route.map(p => p.lng);
              const lats = route.map(p => p.lat);
              const minLng = Math.min(...lngs);
              const maxLng = Math.max(...lngs);
              const minLat = Math.min(...lats);
              const maxLat = Math.max(...lats);
              const pad = 0.15;
              const lngRange = (maxLng - minLng) || 0.5;
              const latRange = (maxLat - minLat) || 0.5;
              const xScale = (svgWidth - 40) / (lngRange * (1 + pad * 2));
              const yScale = (svgHeight - 40) / (latRange * (1 + pad * 2));
              const scale = Math.min(xScale, yScale);
              const offsetX = (svgWidth - lngRange * scale) / 2;
              const offsetY = (svgHeight - latRange * scale) / 2;
              return route.map((p, i) => {
                const x = offsetX + (p.lng - minLng + pad * lngRange) * scale;
                const y = offsetY + (maxLat - p.lat + pad * latRange) * scale;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                    <text x={x + 6} y={y + 3} fontSize="8" fill="#6b7280">{p.city}</text>
                  </g>
                );
              });
            })()}
          </svg>
        </div>
      )}

      {/* 电池传感器面板 */}
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('home.sensorData')}</div>
        <div className="grid grid-cols-2 gap-2">
          <SensorCard title="SOC" value={vehicle.soc} unit="%" color="text-blue-600" />
          <SensorCard title={t('home.temperature')} value={vehicle.temperature} unit="°C" color="text-orange-600" />
          <SensorCard title="SOH" value={vehicle.soh} color="text-emerald-600" />
          <SensorCard title={t('home.cycleCount')} value={vehicle.cycle_count} color="text-gray-600" />
          <SensorCard title={t('home.voltage')} value={vehicle.voltage} color="text-purple-600" />
          <SensorCard title={t('home.lastMaintenance')} value={vehicle.last_maintenance ? formatDate(vehicle.last_maintenance, i18n.language) : '—'} color="text-gray-600" />
        </div>
      </div>

      {/* SOC 进度条 */}
      {vehicle.soc != null && (
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{t('home.batteryLevel')}</span>
            <span className="text-xs font-semibold text-gray-700">{vehicle.soc}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${vehicle.soc}%`,
                background: vehicle.soc > 60 ? 'linear-gradient(90deg, #10B981, #34D399)' :
                            vehicle.soc > 30 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' :
                            'linear-gradient(90deg, #EF4444, #F87171)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 子组件：固定储能柜详情 ────────────────────
function ContainerDetail({ unit, onBack, SensorCard }) {
  const { t } = useTranslation();
  const cs = unit.container_sensors || {};
  const uHealth = computeBatteryHealth(unit.soc, unit.temperature, unit.cycle_count);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToStorageList')}
      </button>

      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: uHealth.color }} />
        <span className="text-xs font-medium text-gray-900">{t(uHealth.status === 'normal' ? 'home.status.normal' : uHealth.status === 'warning' ? 'home.status.warning' : uHealth.status === 'critical' ? 'home.status.critical' : 'home.status.offline')}</span>
        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{t('home.fixedStorage')}</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{unit.unit_code}</h3>
        <p className="text-sm text-gray-500 mt-1">{unit.site_name || t('home.independentOp')}</p>
      </div>

      {/* 集装箱示意图 */}
      <div className="relative bg-gray-100 rounded-xl border-2 border-gray-400 p-4" style={{ minHeight: '140px' }}>
        {/* 集装箱轮廓 */}
        <div className="absolute inset-2 border-2 border-gray-500 rounded-lg" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-400 rounded-full" />
        {/* 内部电池组 */}
        <div className="relative grid grid-cols-3 gap-2 mt-3 px-3 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-red-100 border border-red-300 flex items-center justify-center">
              <Battery className="h-4 w-4 text-red-500" />
            </div>
          ))}
        </div>
        {/* 状态指示灯 */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${unit.status === 'normal' ? 'bg-green-500 animate-pulse' : unit.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="text-[10px] text-gray-500">{unit.status === 'normal' ? t('home.running') : unit.status === 'warning' ? t('home.status.warning') : t('home.fault')}</span>
        </div>
      </div>

      {/* 传感器数据 */}
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('home.storageSensor')}</div>
        <div className="grid grid-cols-2 gap-2">
          <SensorCard title="SOC" value={cs.soc || unit.soc} unit="%" color="text-blue-600" />
          <SensorCard title={t('home.temperature')} value={cs.temperature || unit.temperature} unit="°C" color="text-orange-600" />
          <SensorCard title={t('home.totalVoltage')} value={cs.voltage_total} unit="V" color="text-purple-600" />
          <SensorCard title={t('home.current')} value={cs.current} unit="A" color="text-teal-600" />
          <SensorCard title={t('home.power')} value={cs.power_kw ? `${(cs.power_kw / 1000).toFixed(1)}` : '—'} unit="kW" color="text-indigo-600" />
          <SensorCard title={t('home.energyThroughput')} value={cs.energy_throughput_kwh ? `${(cs.energy_throughput_kwh / 1000).toFixed(1)}` : '—'} unit="MWh" color="text-gray-600" />
          <SensorCard title={t('home.cellVoltageMin')} value={cs.cell_voltage_min} unit="V" color="text-gray-600" />
          <SensorCard title={t('home.cellVoltageMax')} value={cs.cell_voltage_max} unit="V" color="text-gray-600" />
          <SensorCard title={t('home.cellTempMax')} value={cs.cell_temp_max} unit="°C" color="text-red-500" />
          <SensorCard title={t('home.insulationResistance')} value={cs.insulation_resistance_kohm} unit="kΩ" color="text-gray-600" />
        </div>
      </div>
    </div>
  );
}

// ─── 子组件：仓库未售电池详情 ────────────────────
function WarehouseDetail({ warehouse, onBack }) {
  const { t, i18n } = useTranslation();
  const batteries = warehouse.unsold_batteries || [];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToWarehouseList')}
      </button>

      <div>
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-gray-900">{warehouse.name}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{warehouse.address || warehouse.location || '—'}</p>
        {warehouse.warehouse_code && <p className="text-[10px] text-gray-400">{t('home.code')}: {warehouse.warehouse_code}</p>}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-gray-500">{t('home.unsoldBatteries')}:</span>
        <span className="font-bold text-amber-700">{batteries.length}{t('home.blockUnit')}</span>
      </div>

      {batteries.length > 0 ? (
        <div className="space-y-1.5">
          {batteries.map((bat) => (
            <div key={bat.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900">{bat.unit_code}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: computeBatteryHealth(bat.soc, bat.temperature, bat.cycle_count).color }} />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>{bat.battery_type || '—'}</span>
                <span>{bat.status}</span>
                {bat.last_maintenance && (
                  <span>{formatDate(bat.last_maintenance, i18n.language)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-400 text-sm">{t('home.noUnsoldBattery')}</div>
      )}
    </div>
  );
}


// ─── 板块 4：加盟门店（左地图右列表，中国/香港/澳门） ───
function FranchiseStoresSection({ amapReady }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const franchiseStores = useFranchiseStores(t);

  useEffect(() => {
    if (!amapReady || !containerRef.current || franchiseStores.length === 0) return;
    if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    const AMap = window.AMap;
    const map = new AMap.Map(containerRef.current, {
      center: [113.5, 30],
      zoom: 5,
      mapStyle: 'amap://styles/light',
    });
    mapRef.current = map;
    franchiseStores.forEach((s) => {
      const marker = new AMap.Marker({
        position: [s.lng, s.lat],
        content: `<div style="width:36px;height:36px;background:#1a1a1a;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${s.soldCount}</div>`,
        offset: new AMap.Pixel(-18, -18),
      });
      marker.on('click', () => {
        map.setZoomAndCenter(15, [s.lng, s.lat]);
        setSelectedStore(s);
      });
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady, franchiseStores.length]);

  const handleStoreClick = (store) => {
    setSelectedStore(store);
    if (mapRef.current) mapRef.current.setZoomAndCenter(15, [store.lng, store.lat]);
  };

  return (
    <section id="franchise-stores" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Store className="h-4 w-4 mr-2" /> {t('home.franchiseStores')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.franchiseNetwork')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t('home.franchiseDesc')}</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon:Store, label:t('home.totalStores'), value:`${franchiseStores.length}` },
            { icon:ShoppingBag, label:t('home.cumulativeSales'), value:`${franchiseStores.reduce((a,b)=>a+b.soldCount,0)}` },
            { icon:Globe, label:t('home.coverage'), value:t('home.global') },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center">
              <s.icon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 左地图 右列表 */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div ref={containerRef} className="w-full h-[550px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
            {/* 图例 */}
            <div className="flex justify-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-gray-900 rounded-full" />{t('home.chinaMainland')}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />{t('home.hongkong')}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />{t('home.macau')}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('home.franchiseStores')}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{franchiseStores.length}{t('home.storesUnit')}</span>
            </div>
            <div className="space-y-2.5 overflow-y-auto max-h-[510px] pr-1">
              {franchiseStores.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleStoreClick(s)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedStore?.id === s.id
                      ? 'border-gray-900 bg-gray-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {s.img ? (
                        <img src={s.img} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Store className="h-5 w-5 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">{s.name}</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">{s.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center"><MapPin className="h-2.5 w-2.5 mr-0.5" />{s.city} · {s.address}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs">
                        <span className="text-gray-500">{t('home.soldBattery')} <span className="font-semibold text-gray-700">{s.soldCount}</span>{t('home.groupsUnit')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 选中门店详情弹窗 */}
        {selectedStore && (
          <div className="mt-8 grid md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-purple-600 font-medium mt-1">{selectedStore.city} · {selectedStore.region} · {selectedStore.status}</p>
                </div>
                <button onClick={() => setSelectedStore(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:t('home.soldBatteryType'), value:selectedStore.soldBattery },
                  { label:t('home.soldBatteryCount'), value:`${selectedStore.soldCount}${t('home.groupsUnit')}` },
                  { label:t('home.storePhone'), value:selectedStore.phone },
                  { label:t('home.storeAddress'), value:selectedStore.address },
                ].map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-64 bg-gray-100">
              {((selectedStore.images && selectedStore.images.length > 0) || selectedStore.photo_url) ? (
                <div className="flex gap-2 overflow-x-auto h-full p-2">
                  {[...(selectedStore.images || []), ...(selectedStore.photo_url ? [selectedStore.photo_url] : [])].map((url, i) => (
                    <img key={i} src={url} alt={`${selectedStore.name} ${i + 1}`} loading="lazy" decoding="async" className="h-full object-contain rounded-lg bg-gray-50 flex-shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="h-10 w-10 mb-2" />
                  <span className="text-sm">{t('home.storePhotoPending')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 运营场景自动轮播 ──────────────────────────────────
const getScenes = (t) => [
  { label: t('home.scene.deliverySwap'), img: '/design-images/image2.jpg' },
  { label: t('home.scene.motorSwap'), img: '/design-images/image3.jpg' },
  { label: t('home.scene.busFleetBattery'), img: '/design-images/image7.png' },
  { label: t('home.scene.busRental'), img: '/design-images/image8.png' },
  { label: t('home.scene.shopPeakValley'), img: '/design-images/image9.png' },
  { label: t('home.scene.industrialParkStorage'), img: '/design-images/image10.png' },
  { label: t('home.scene.chargerStorage'), img: '/design-images/image11.png' },
  { label: t('home.scene.mallFactoryStorage'), img: '/design-images/image12.png' },
  { label: t('home.scene.tricycleSwap'), img: '/design-images/image14.png' },
];



// ─── 主页面 ────────────────────────────────────────────
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const loggedIn = isLoggedIn();
  const amapReady = useAmap(i18n.language);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroFade, setHeroFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroFade(false);
      setTimeout(() => {
        setHeroIndex(prev => (prev + 1) % getScenes(t).length);
        setHeroFade(true);
      }, 350);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gray-900 text-white overflow-hidden min-h-[600px] md:min-h-[700px]">
        {/* Carousel images as background */}
        <div className="absolute inset-0 z-0">
          <img
            src={getScenes(t)[heroIndex].img}
            alt={getScenes(t)[heroIndex].label}
            className={`w-full h-full object-cover transition-opacity duration-500 ${heroFade ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Dark semi-transparent overlay for text readability */}
          <div className="absolute inset-0 bg-black/50" />
        </div>
        {/* Gradient label overlay */}
        <div className="absolute bottom-12 left-0 right-0 z-[5] bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 md:p-8 flex justify-center">
          <span className="text-white/90 text-sm md:text-lg font-semibold tracking-wide text-center">{getScenes(t)[heroIndex].label}</span>
        </div>
        {/* Indicator dots */}
        <div className="absolute bottom-4 right-6 flex gap-1.5 z-20">
          {getScenes(t).map((_, i) => (
            <button
              key={i}
              onClick={() => { setHeroFade(false); setTimeout(() => { setHeroIndex(i); setHeroFade(true); }, 350); }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === heroIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Text content floating above carousel */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm mb-6 border border-white/10">
              <img src="/logo.png" alt="MTX" loading="lazy" decoding="async" className="h-5 w-5 object-contain" />
              {t('home.hero.brandTag')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
              {t('home.hero.titlePrefix')} <span className="text-yellow-400">{t('home.hero.titleSwap')}</span> {t('home.hero.titleSuffix')}
            </h1>
            <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
              {t('home.heroTagline')}
            </p>
            <div className="flex flex-wrap gap-4">
              {!loggedIn ? (
                <>
                  <Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">
                    {t('home.registerNow')} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link href="/invest" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">
                    <Play className="mr-2 h-5 w-5" /> {t('home.learnInvest')}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">
                    {t('home.startInvest')} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link href="/trade" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">
                    {t('home.goTrade')}
                  </Link>
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-6 mt-12">
              <StatCounter end={1000} label={t('home.activeUsers')} suffix="+" />
              <StatCounter end={50} label={t('home.operatingStations')} suffix="+" />
              <StatCounter end={27} label={`>27%`} suffix="" />
            </div>
          </div>
        </div>
      </section>

      <BatteryAssetsSection />
      <BatteryNetworkSection amapReady={amapReady} />
      <FranchiseStoresSection amapReady={amapReady} />

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.ctaTitle')}</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">{t('home.ctaDesc')}</p>
          {!loggedIn ? (
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">
                {t('home.freeRegister')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/invest" className="inline-flex items-center border-2 border-white/20 text-white font-bold px-10 py-4 rounded-xl hover:bg-white/10 transition text-lg">
                {t('home.learnMore')}
              </Link>
            </div>
          ) : (
            <Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">
              {t('home.enterInvestCenter')} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}
