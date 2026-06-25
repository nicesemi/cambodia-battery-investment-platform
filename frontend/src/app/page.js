'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Battery, Zap, Globe, Shield, TrendingUp, Users, MapPin, Phone, ArrowRight, ChevronRight, Play, Camera, Store, Network, Building2, X, Bus, Warehouse, Container, DollarSign, ShoppingBag } from 'lucide-react';
import { isLoggedIn } from '@/lib/api';
import { storesAPI, batteryTypesAPI } from '@/services/api';

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
function useAmap() {
  const [loaded, setLoaded] = useState(typeof window !== 'undefined' && !!window.AMap);
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_AMAP_KEY) return;
    if (window.AMap) { setLoaded(true); return; }
    _amapResolvers.push(setLoaded);
    if (!_amapLoading) {
      _amapLoading = true;
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}`;
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
    }
    return () => {
      _amapResolvers = _amapResolvers.filter((r) => r !== setLoaded);
    };
  }, []);
  return loaded;
}

// ─── 运营网络门店数据（东南亚） ──────────────────────────
const STORES = [
  { id:1, name:'金边旗舰店', country:'柬埔寨', city:'金边', address:'No. 128, Monivong Blvd', phone:'+855 23 456 7890', lng:104.917, lat:11.556, count:86, type:'旗舰店', desc:'柬埔寨首家换电旗舰店，智能换电柜50台，服务外卖骑手超5000人' },
  { id:2, name:'暹粒换电站', country:'柬埔寨', city:'暹粒', address:'Sivatha Blvd, Krong Siem Reap', phone:'+855 63 963 8521', lng:103.856, lat:13.363, count:45, type:'标准站', desc:'旅游城市换电站，服务游客租赁电摩' },
  { id:3, name:'西哈努克港站', country:'柬埔寨', city:'西哈努克', address:'Ekareach St, Sihanoukville', phone:'+855 34 852 7410', lng:103.523, lat:10.626, count:38, type:'标准站', desc:'港口城市换电站，覆盖物流车队' },
  { id:4, name:'马德望换电站', country:'柬埔寨', city:'马德望', address:'Street 1, Battambang', phone:'+855 53 741 9630', lng:103.200, lat:13.096, count:22, type:'社区站', desc:'社区级换电站，服务本地居民日常出行' },
  { id:5, name:'达卡Mirpur站', country:'孟加拉', city:'达卡', address:'Mirpur Road, Dhaka 1216', phone:'+880 2 901 2345', lng:90.367, lat:23.804, count:52, type:'旗舰店', desc:'孟加拉最大换电站，日换电量超3000次' },
  { id:6, name:'达卡Gulshan站', country:'孟加拉', city:'达卡', address:'Gulshan Avenue, Dhaka 1212', phone:'+880 2 882 5678', lng:90.412, lat:23.793, count:35, type:'标准站', desc:'高端商务区换电站' },
  { id:7, name:'吉大港中心站', country:'孟加拉', city:'吉大港', address:'Agrabad C/A, Chittagong', phone:'+880 31 712 3456', lng:91.812, lat:22.338, count:28, type:'标准站', desc:'港口城市换电中心' },
  { id:8, name:'库尔纳站', country:'孟加拉', city:'库尔纳', address:'KDA Avenue, Khulna', phone:'+880 41 723 8901', lng:89.567, lat:22.846, count:18, type:'社区站', desc:'西南重镇换电站' },
  { id:9, name:'胡志明市旗舰店', country:'越南', city:'胡志明市', address:'123 Nguyen Hue, District 1', phone:'+84 28 3829 1234', lng:106.702, lat:10.776, count:48, type:'旗舰店', desc:'越南首家换电中心' },
  { id:10, name:'河内换电站', country:'越南', city:'河内', address:'45 Ba Trieu, Hoan Kiem', phone:'+84 24 3825 6789', lng:105.854, lat:21.029, count:32, type:'标准站', desc:'首都换电站' },
  { id:11, name:'岘港海滨站', country:'越南', city:'岘港', address:'88 Bach Dang, Da Nang', phone:'+84 236 3812 3456', lng:108.220, lat:16.054, count:20, type:'标准站', desc:'中部旅游城市换电站' },
  { id:12, name:'雅加达中心站', country:'印尼', city:'雅加达', address:'Jl. MH Thamrin No.1', phone:'+62 21 390 1234', lng:106.827, lat:-6.175, count:30, type:'旗舰店', desc:'印尼旗舰换电站' },
  { id:13, name:'万隆换电站', country:'印尼', city:'万隆', address:'Jl. Asia Afrika, Bandung', phone:'+62 22 423 5678', lng:107.610, lat:-6.917, count:18, type:'标准站', desc:'万隆市中心换电站' },
  { id:14, name:'马尼拉Makati站', country:'菲律宾', city:'马尼拉', address:'Ayala Ave, Makati', phone:'+63 2 8812 3456', lng:121.024, lat:14.555, count:22, type:'旗舰店', desc:'马尼拉金融区换电站' },
  { id:15, name:'宿务换电站', country:'菲律宾', city:'宿务', address:'Colon St, Cebu City', phone:'+63 32 412 7890', lng:123.886, lat:10.315, count:15, type:'标准站', desc:'中部群岛换电站' },
];

// ─── 加盟门店数据（从 API 动态获取） ──────────────────
let _franchiseStoresCache = null;
let _franchiseStoresLoaded = false;
let _franchiseStoresPromise = null;

function useFranchiseStores() {
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
          revenue: (s.battery_count || s.total_batteries) ? `¥${((s.battery_count || s.total_batteries) * 1.8).toFixed(0)}万` : '¥0',
          status: s.status || '运营中',
          img: (s.images && s.images.length > 0) ? s.images[0] : null,
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
          grouped[category].push({
            id: t.id || idx,
            model: t.name || '—',
            scene: t.scenario || '—',
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
  }, []);
  return assets;
}

// ─── 电池网络节点（四种类型） ────────────────────────────
const NETWORK_NODES = [
  // 换电站 (swap) - 带换电仓槽位
  { id:1, nodeType:'swap', name:'金边换电旗舰站', lng:104.917, lat:11.556, energy:'86 组电池', runtime:'运营 3 年', status:'在线', charge:'92%', health:'98%', slots:15, availableSlots:3, desc:'柬埔寨最大换电站，日均换电120次' },
  { id:2, nodeType:'swap', name:'暹粒旅游换电站', lng:103.856, lat:13.363, energy:'45 组电池', runtime:'运营 2 年', status:'在线', charge:'87%', health:'95%', slots:12, availableSlots:4, desc:'旅游城市换电枢纽' },
  { id:3, nodeType:'swap', name:'达卡Mirpur换电站', lng:90.367, lat:23.804, energy:'52 组电池', runtime:'运营 2.5 年', status:'在线', charge:'94%', health:'97%', slots:20, availableSlots:2, desc:'孟加拉旗舰换电站' },
  { id:4, nodeType:'swap', name:'胡志明换电中心', lng:106.702, lat:10.776, energy:'48 组电池', runtime:'运营 3 年', status:'在线', charge:'93%', health:'97%', slots:15, availableSlots:5, desc:'越南首座智能换电站' },
  { id:5, nodeType:'swap', name:'雅加达换电站', lng:106.827, lat:-6.175, energy:'30 组电池', runtime:'运营 2 年', status:'在线', charge:'91%', health:'96%', slots:12, availableSlots:3, desc:'印尼首都核心换电站' },
  // 大巴车运营 (bus)
  { id:6, nodeType:'bus', name:'金边大巴运营中心', lng:104.928, lat:11.543, energy:'12 辆电动大巴', runtime:'运营 2 年', status:'在线', charge:'88%', health:'94%', vehicleCount:12, routeCount:5, desc:'城市公交主干线BaaS运营' },
  { id:7, nodeType:'bus', name:'胡志明客运车队', lng:106.715, lat:10.763, energy:'8 辆电动中巴', runtime:'运营 1.5 年', status:'在线', charge:'90%', health:'95%', vehicleCount:8, routeCount:3, desc:'城际短途客运电池托管' },
  { id:8, nodeType:'bus', name:'达卡公交电池站', lng:90.380, lat:23.788, energy:'15 辆电动大巴', runtime:'运营 3 年', status:'在线', charge:'85%', health:'93%', vehicleCount:15, routeCount:6, desc:'达卡公交集团电池租赁' },
  // 工商业储能 (commercial)
  { id:9, nodeType:'commercial', name:'西哈努克港储能', lng:103.523, lat:10.626, energy:'500kWh 液冷柜', runtime:'运营 2 年', status:'在线', charge:'95%', health:'98%', peakSaving:'¥12.8万/年', desc:'港口物流园区峰谷套利' },
  { id:10, nodeType:'commercial', name:'河内工厂储能站', lng:105.860, lat:21.035, energy:'215kWh × 2 储能柜', runtime:'运营 2 年', status:'在线', charge:'89%', health:'96%', peakSaving:'¥8.6万/年', desc:'电子厂需量管理+备电' },
  { id:11, nodeType:'commercial', name:'达卡Gulshan储能', lng:90.412, lat:23.793, energy:'300kWh 储能柜', runtime:'运营 1.5 年', status:'在线', charge:'91%', health:'95%', peakSaving:'¥15.3万/年', desc:'高端商务区储能系统' },
  // 集装箱储能 (container)
  { id:12, nodeType:'container', name:'柬埔寨光伏配储', lng:104.100, lat:12.565, energy:'3.44MWh 集装箱', runtime:'运营 2 年', status:'在线', charge:'93%', health:'97%', capacity:'3440kWh', dailyCycle:'1.2次/天', desc:'中型光伏电站配套储能' },
  { id:13, nodeType:'container', name:'越南调频储能站', lng:106.350, lat:10.420, energy:'5MWh 风冷集装箱', runtime:'运营 2 年', status:'在线', charge:'88%', health:'95%', capacity:'5000kWh', dailyCycle:'1.5次/天', desc:'电网调频容量备用' },
  { id:14, nodeType:'container', name:'菲律宾海岛微网', lng:121.050, lat:14.580, energy:'1.45MWh 集装箱', runtime:'运营 1.5 年', status:'在线', charge:'90%', health:'96%', capacity:'1454kWh', dailyCycle:'0.8次/天', desc:'离岛微电网储能' },
  { id:15, nodeType:'container', name:'印尼风光基地', lng:107.650, lat:-6.950, energy:'6MWh 液冷集装箱', runtime:'运营 1 年', status:'在线', charge:'86%', health:'94%', capacity:'6000kWh', dailyCycle:'1.8次/天', desc:'大型风光基地消纳储能' },
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
      <div className="text-3xl md:text-4xl font-bold text-blue-600">{count.toLocaleString()}{suffix}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ─── 辅助函数：生成换电槽位状态 ─────────────────────────
function generateSlots(total, available) {
  return Array.from({ length: total }, (_, i) => i < (total - available) ? 'rented' : 'available');
}

// ─── 板块 1：电池资产 ──────────────────────────────────
function BatteryAssetsSection() {
  const [activeCategory, setActiveCategory] = useState('swap');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const loggedIn = isLoggedIn();
  const BATTERY_ASSETS = useBatteryAssets();

  const categories = [
    { key:'swap', label:'两轮/三轮换电', icon:'🏍️', desc:'外卖骑手、快递配送、电摩出行' },
    { key:'vehicle', label:'物流/客运车辆', icon:'🚛', desc:'城市物流、客运车队电池托管' },
    { key:'commercial', label:'工商业储能', icon:'🏭', desc:'峰谷套利、需量管理、备电' },
    { key:'container', label:'集装箱储能', icon:'📦', desc:'电网级储能、光伏配储' },
  ];

  return (
    <section id="battery-assets" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Battery className="h-4 w-4 mr-2" /> 电池资产
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">电池资产矩阵</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">覆盖换电、商用车辆、工商业储能及集装箱储能全品类，20款标准化电池资产</p>
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
                    <div className="text-gray-400">电压</div><div className="font-semibold text-gray-700">{item.voltage}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">电流</div><div className="font-semibold text-gray-700">{item.current}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">重量</div><div className="font-semibold text-gray-700">{item.weight}</div>
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
                { label:'标称电压', value:selectedAsset.voltage }, { label:'容量', value:selectedAsset.capacity },
                { label:'持续电流', value:selectedAsset.current }, { label:'外形尺寸', value:selectedAsset.size },
                { label:'净重', value:selectedAsset.weight }, { label:'单台电量', value:selectedAsset.energy },
              ].map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                  <div className="font-semibold text-gray-900">{p.value}</div>
                </div>
              ))}
            </div>
            {!loggedIn && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href="/register" className="text-blue-600 font-medium text-sm hover:underline">注册登录，查看投资收益率与详情 →</Link>
              </div>
            )}
          </div>
        )}
        <div className="text-center mt-8"><p className="text-sm text-gray-400">共 {Object.values(BATTERY_ASSETS).flat().length} 款标准化电池产品 · 参数公开透明 · 登录查看投资详情</p></div>
      </div>
    </section>
  );
}

// ─── 板块 2：运营网络（含地图点击定位） ──────────────────
function OperationsNetworkSection({ amapReady }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showPhotoPlaceholder, setShowPhotoPlaceholder] = useState(false);

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
    STORES.forEach((s) => {
      const color = s.type === '旗舰店' ? '#1a1a1a' : s.type === '标准站' ? '#3b82f6' : '#f59e0b';
      const marker = new AMap.Marker({
        position: [s.lng, s.lat],
        content: `<div style="width:32px;height:32px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 12px rgba(0,0,0,0.25);cursor:pointer;border:2px solid #fff">${s.count}</div>`,
        offset: new AMap.Pixel(-16, -16),
      });
      marker.on('click', () => {
        map.setZoomAndCenter(14, [s.lng, s.lat]);
        setSelectedStore(s);
        setShowPhotoPlaceholder(false);
      });
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady]);

  const flyToStore = useCallback((store) => {
    setSelectedStore(store);
    setShowPhotoPlaceholder(false);
    if (mapRef.current) mapRef.current.setZoomAndCenter(14, [store.lng, store.lat]);
  }, []);

  const storeImages = {
    1: '/design-images/image6.png',
    5: '/design-images/image2.jpg',
    9: '/design-images/image3.jpg',
    12: '/design-images/image4.png',
  };

  return (
    <section id="operations-network" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Globe className="h-4 w-4 mr-2" /> 运营网络
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">全球运营网络</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">5 个国家 · 15+ 运营站点 · 覆盖东南亚核心城市</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div ref={containerRef} className="w-full h-[520px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">运营站点</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{STORES.length} 个站点</span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
              {STORES.map((s) => (
                <div
                  key={s.id}
                  onClick={() => flyToStore(s)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedStore?.id === s.id
                      ? 'border-gray-900 bg-gray-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      s.type === '旗舰店' ? 'bg-gray-900 text-white' :
                      s.type === '标准站' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{s.type}</span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center"><MapPin className="h-3 w-3 mr-1" />{s.country} · {s.city}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedStore && (
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-blue-600 font-medium mt-1">{selectedStore.country} · {selectedStore.city} · {selectedStore.type}</p>
                </div>
                <span className="text-3xl font-bold text-gray-900">{selectedStore.count}<span className="text-sm text-gray-400 font-normal"> 电池</span></span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{selectedStore.desc}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-gray-400" />{selectedStore.address}</span>
                <span className="flex items-center"><Phone className="h-4 w-4 mr-1 text-gray-400" />{selectedStore.phone}</span>
              </div>
            </div>
            {storeImages[selectedStore.id] ? (
              <div className="rounded-2xl overflow-hidden border border-gray-200 h-56">
                <img src={storeImages[selectedStore.id]} alt={selectedStore.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div onClick={() => setShowPhotoPlaceholder(!showPhotoPlaceholder)} className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center h-56 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                {showPhotoPlaceholder ? (
                  <div className="text-center px-6">
                    <p className="text-gray-500 text-sm font-medium mb-2">实景照片上传区域</p>
                    <p className="text-gray-400 text-xs">用户将在此处上传 {selectedStore.name} 的现场实景照片</p>
                  </div>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm font-medium">暂无实景照片</p>
                    <p className="text-gray-300 text-xs mt-1">点击查看说明</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 板块 3：电池网络分布（四种图标） ────────────────────
function BatteryNetworkSection({ amapReady }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // ─── 苹果风格 SVG 矢量图标（细线条、圆角、单色） ─────
  const svgIcons = {
    swap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    bus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="8" y1="18" x2="8" y2="20"/><line x1="16" y1="18" x2="16" y2="20"/><line x1="3" y1="11" x2="21" y2="11"/></svg>`,
    commercial: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="13" rx="2"/><path d="M9 9V5l3-2 3 2v4"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
    container: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="9" y1="5" x2="9" y2="20"/><line x1="15" y1="5" x2="15" y2="20"/></svg>`,
  };
  const nodeIconConfig = {
    'swap':      { color:'#f97316', svg:svgIcons.swap,      label:'换电站',   iconBg:'bg-orange-100', iconText:'text-orange-700' },
    'bus':       { color:'#3b82f6', svg:svgIcons.bus,       label:'大巴运营',   iconBg:'bg-blue-100',   iconText:'text-blue-700' },
    'commercial':{ color:'#10b981', svg:svgIcons.commercial, label:'工商业储能', iconBg:'bg-emerald-100',iconText:'text-emerald-700' },
    'container': { color:'#7c3aed', svg:svgIcons.container, label:'集装箱储能', iconBg:'bg-purple-100', iconText:'text-purple-700' },
  };

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
    NETWORK_NODES.forEach((n) => {
      const cfg = nodeIconConfig[n.nodeType];
      const marker = new AMap.Marker({
        position: [n.lng, n.lat],
        content: `<div style="width:30px;height:30px;background:${cfg.color};border-radius:8px;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center">${cfg.svg}</div>`,
        offset: new AMap.Pixel(-16, -16),
      });
      marker.on('click', () => {
        map.setZoomAndCenter(14, [n.lng, n.lat]);
        setSelectedNode(n);
      });
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady]);

  const handleNodeClick = useCallback((n) => {
    setSelectedNode(n);
    if (mapRef.current) {
      mapRef.current.setZoomAndCenter(14, [n.lng, n.lat]);
    }
  }, []);

  return (
    <section id="battery-network" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Network className="h-4 w-4 mr-2" /> 电池网络分布
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">电池网络实时分布</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">全球在运电池资产可视化监控，实时电量与服役状态一目了然</p>
          {/* 图标图例 */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {Object.entries(nodeIconConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: cfg.color }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {key === 'swap' && <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
                    {key === 'bus' && <><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="8" y1="18" x2="8" y2="20" /><line x1="16" y1="18" x2="16" y2="20" /><line x1="3" y1="11" x2="21" y2="11" /></>}
                    {key === 'commercial' && <><rect x="3" y="9" width="18" height="13" rx="2" /><path d="M9 9V5l3-2 3 2v4" /><line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="17" x2="15" y2="17" /></>}
                    {key === 'container' && <><rect x="3" y="5" width="18" height="15" rx="2" /><line x1="3" y1="11" x2="21" y2="11" /><line x1="9" y1="5" x2="9" y2="20" /><line x1="15" y1="5" x2="15" y2="20" /></>}
                  </svg>
                </span>
                {cfg.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div ref={containerRef} className="w-full h-[580px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[580px] flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900">实时监控面板</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{selectedNode ? selectedNode.name : '点击地图图标查看详情'}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {(() => { const cfg = nodeIconConfig[selectedNode.nodeType]; return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.iconBg} ${cfg.iconText}`}>{cfg.label}</span>; })()}
                      <span className="text-xs text-gray-400">{selectedNode.status}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedNode.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{selectedNode.desc}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label:'当前电量', value:selectedNode.charge, color:'bg-green-500' },
                        { label:'电池健康', value:selectedNode.health, color:'bg-blue-500' },
                        { label:'运行状态', value:selectedNode.status, color:'bg-emerald-600' },
                        { label:'服役时间', value:selectedNode.runtime, color:'bg-gray-600' },
                      ].map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1"><div className={`w-1.5 h-1.5 ${m.color} rounded-full`} /><span className="text-xs text-gray-400">{m.label}</span></div>
                          <div className="text-base font-bold text-gray-900">{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* 换电站专属：换电仓槽位 */}
                    {selectedNode.nodeType === 'swap' && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500">换电仓状态 ({selectedNode.slots} 仓)</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />已租借 {selectedNode.slots - selectedNode.availableSlots}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-gray-300 rounded-sm" />空闲 {selectedNode.availableSlots}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {generateSlots(selectedNode.slots, selectedNode.availableSlots).map((s, i) => (
                            <div
                              key={i}
                              className={`h-7 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${
                                s === 'rented' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                              }`}
                            >{i + 1}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 大巴运营专属 */}
                    {selectedNode.nodeType === 'bus' && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">运营车辆</span><span className="font-bold text-gray-900">{selectedNode.vehicleCount} 辆</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">运营线路</span><span className="font-bold text-gray-900">{selectedNode.routeCount} 条</span></div>
                      </div>
                    )}

                    {/* 工商业储能专属 */}
                    {selectedNode.nodeType === 'commercial' && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">峰谷套利收益</span><span className="font-bold text-emerald-600">{selectedNode.peakSaving}</span></div>
                      </div>
                    )}

                    {/* 集装箱储能专属 */}
                    {selectedNode.nodeType === 'container' && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">额定容量</span><span className="font-bold text-gray-900">{selectedNode.capacity}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">日均循环</span><span className="font-bold text-gray-900">{selectedNode.dailyCycle}</span></div>
                      </div>
                    )}

                    {/* 电量进度条 */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">电量水平</span>
                        <span className="text-xs font-semibold text-gray-700">{selectedNode.charge}</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000" style={{ width: selectedNode.charge }} />
                      </div>
                    </div>

                    {/* 其他站点快捷导航 */}
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">其他站点</div>
                      {NETWORK_NODES.filter(n => n.id !== selectedNode.id).map((n) => {
                        const nCfg = nodeIconConfig[n.nodeType];
                        return (
                        <button
                          key={n.id}
                          onClick={() => handleNodeClick(n)}
                          className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: nCfg.color }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                {n.nodeType === 'swap' && <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
                                {n.nodeType === 'bus' && <><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="8" y1="18" x2="8" y2="20" /><line x1="16" y1="18" x2="16" y2="20" /><line x1="3" y1="11" x2="21" y2="11" /></>}
                                {n.nodeType === 'commercial' && <><rect x="3" y="9" width="18" height="13" rx="2" /><path d="M9 9V5l3-2 3 2v4" /><line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="17" x2="15" y2="17" /></>}
                                {n.nodeType === 'container' && <><rect x="3" y="5" width="18" height="15" rx="2" /><line x1="3" y1="11" x2="21" y2="11" /><line x1="9" y1="5" x2="9" y2="20" /><line x1="15" y1="5" x2="15" y2="20" /></>}
                              </svg>
                            </span>
                            <span className="text-sm text-gray-700">{n.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            parseFloat(n.charge) > 90 ? 'bg-green-100 text-green-700' :
                            parseFloat(n.charge) > 85 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{n.charge}</span>
                        </button>
                      )})}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <Network className="h-12 w-12 text-gray-200 mb-4" />
                    <p className="text-gray-400 text-sm">点击地图上的站点图标</p>
                    <p className="text-gray-300 text-xs mt-1">查看实时电池状态与运营数据</p>
                    <div className="mt-6 w-full space-y-2">
                      {['换电站 5 座 · 261 组电池', '大巴运营 3 条 · 35 辆车', '工商业储能 3 站 · 年省¥36万', '集装箱储能 4 站 · 14.5MWh'].map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-center text-xs text-gray-500">{s}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 板块 4：加盟门店（左地图右列表，中国/香港/澳门） ───
function FranchiseStoresSection({ amapReady }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const franchiseStores = useFranchiseStores();

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
            <Store className="h-4 w-4 mr-2" /> 加盟门店
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">加盟门店网络</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">投资者购买电池资产的销售门店，覆盖中国大陆、香港、澳门</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon:Store, label:'门店总数', value:`${franchiseStores.length}` },
            { icon:ShoppingBag, label:'累计销量', value:`${franchiseStores.reduce((a,b)=>a+b.soldCount,0)}` },
            { icon:DollarSign, label:'累计收益', value:'¥2.86亿' },
            { icon:Globe, label:'覆盖区域', value:'大陆/香港/澳门' },
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
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-gray-900 rounded-full" />中国大陆</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />香港</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />澳门</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">加盟门店</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{franchiseStores.length} 家</span>
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
                        <img src={s.img} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                        <span className="text-gray-500">售 <span className="font-semibold text-gray-700">{s.soldCount}</span> 组</span>
                        <span className="text-gray-500">收益 <span className="font-semibold text-gray-700">{s.revenue}</span></span>
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
                  { label:'已售电池类型', value:selectedStore.soldBattery },
                  { label:'累计销量', value:`${selectedStore.soldCount} 组电池` },
                  { label:'累计收益', value:selectedStore.revenue },
                  { label:'联系电话', value:selectedStore.phone },
                  { label:'门店地址', value:selectedStore.address },
                ].map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-56 bg-gray-100">
              {selectedStore.img ? (
                <img src={selectedStore.img} alt={selectedStore.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="h-10 w-10 mb-2" />
                  <span className="text-sm">门店照片待上传</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 主页面 ────────────────────────────────────────────
export default function HomePage() {
  const loggedIn = isLoggedIn();
  const amapReady = useAmap();

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm mb-6 border border-white/10">
                <img src="/logo.png" alt="MTX" loading="lazy" decoding="async" className="h-5 w-5 object-contain" />
                MTX MOTORS · 1kwh.store
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                6 SEC <span className="text-yellow-400">SWAP</span> & GO
              </h1>
              <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
                管理好每1度电。1kWh 基于区块链+IoT技术，构建东南亚最大换电网络。
                每一度电都能创造价值，加入绿色能源革命。
              </p>
              <div className="flex flex-wrap gap-4">
                {!loggedIn ? (
                  <>
                    <Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">
                      立即注册 <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link href="/invest" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">
                      <Play className="mr-2 h-5 w-5" /> 了解投资
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">
                      开始投资 <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link href="/trade" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">
                      去交易市场
                    </Link>
                  </>
                )}
              </div>
              <div className="grid grid-cols-3 gap-6 mt-12">
                <StatCounter end={50000} label="活跃用户" suffix="+" />
                <StatCounter end={200} label="运营换电站" suffix="+" />
                <StatCounter end={15.8} label="年化收益率" suffix="%" />
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="relative w-full aspect-square max-w-lg ml-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-3xl backdrop-blur" />
                <img src="/design-images/image1.jpg" alt="1kWh" loading="lazy" decoding="async" className="relative w-full h-full object-cover rounded-3xl shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 运营场景 Bar */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'换电', sub:'两轮/三轮换电网络', img:'/design-images/image5.png' },
              { label:'运营', sub:'电摩车队租赁运营', img:'/design-images/image4.png' },
              { label:'工商业储能', sub:'工厂/商场峰谷套利', img:'/design-images/image9.png' },
              { label:'集装箱储能', sub:'电网级储能电站', img:'/design-images/image13.png' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <img src={item.img} alt={item.label} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 拼图式产品展示 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              '/design-images/image2.jpg','/design-images/image3.jpg',
              '/design-images/image7.png','/design-images/image8.png',
              '/design-images/image9.png','/design-images/image10.png',
              '/design-images/image11.png','/design-images/image12.png',
            ].map((src, i) => (
              <div key={i} className="rounded-2xl overflow-hidden h-48 bg-gray-100">
                <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <BatteryAssetsSection />
      <OperationsNetworkSection amapReady={amapReady} />
      <BatteryNetworkSection amapReady={amapReady} />
      <FranchiseStoresSection amapReady={amapReady} />

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">加入 1kWh 电池资产平台</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">管理好每1度电，1度电也能创造价值。加入 1kWh，让每一度电都为你赚钱。</p>
          {!loggedIn ? (
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">
                免费注册 <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/invest" className="inline-flex items-center border-2 border-white/20 text-white font-bold px-10 py-4 rounded-xl hover:bg-white/10 transition text-lg">
                了解更多
              </Link>
            </div>
          ) : (
            <Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">
              进入投资中心 <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
