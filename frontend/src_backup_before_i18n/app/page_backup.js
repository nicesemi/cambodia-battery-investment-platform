'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Battery, Zap, Globe, Shield, TrendingUp, Users, MapPin, Phone, ArrowRight, ChevronRight, Play, Camera, Store, Network, Building2, X } from 'lucide-react';
import { isLoggedIn } from '@/lib/api';

// ─── 高德地图加载 ──────────────────────────────────────
function useAmap() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_AMAP_KEY) return;
    if (window.AMap) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}`;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);
  return loaded;
}

// ─── 门店数据 ────────────────────────────────────────────
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

// ─── 电池资产数据（来自首页.docx） ──────────────────────
const BATTERY_ASSETS = {
  swap: [
    { id:1, model:'4820 通用低速两轮换电', scene:'家用电动二轮车', voltage:'51.2V', capacity:'20Ah', current:'20A', size:'290×175×145', weight:'10kg', energy:'1.024kWh', img:'/design-images/image15.jpeg' },
    { id:2, model:'6035 中速电摩换电', scene:'国内外卖骑手、泰国 60V 电摩', voltage:'64V', capacity:'35Ah', current:'40A', size:'340×215×165', weight:'19kg', energy:'2.24kWh', img:'/design-images/image16.jpeg' },
    { id:3, model:'7250 高速电摩换电', scene:'72V 两轮电摩、越南大功率两轮', voltage:'76.8V', capacity:'50Ah', current:'70A', size:'360×230×200', weight:'29kg', energy:'3.84kWh', img:'/design-images/image17.jpeg' },
    { id:4, model:'72100 重载三轮备用款', scene:'72V 快递/摆摊货运三轮（双块并联）', voltage:'76.8V', capacity:'100Ah', current:'120A', size:'460×280×245', weight:'56kg', energy:'7.68kWh', img:'/design-images/image15.jpeg' },
  ],
  vehicle: [
    { id:8, model:'4.2 米物流货车电池', scene:'城市短途物流车队 BaaS 电池租赁', voltage:'384V', capacity:'-', current:'600A', size:'1800×1100×350', weight:'620kg', energy:'96kWh', img:'/design-images/image18.jpeg' },
    { id:9, model:'6 米客运中巴电池', scene:'城乡短途客运车队电池托管', voltage:'512V', capacity:'-', current:'900A', size:'2200×1200×380', weight:'1100kg', energy:'160kWh', img:'/design-images/image19.jpeg' },
    { id:10, model:'12 米城市大巴电池', scene:'公交集团电动客车租赁', voltage:'640V', capacity:'-', current:'1200A', size:'2600×1400×400', weight:'1650kg', energy:'256kWh', img:'/design-images/image20.jpeg' },
  ],
  commercial: [
    { id:11, model:'工商业 100kWh 风冷柜', scene:'小型商铺、加工厂峰谷套利', voltage:'627.2V', capacity:'160Ah', current:'160A', size:'1714×1342×2384', weight:'3吨', energy:'100kWh', img:'/design-images/image21.jpeg' },
    { id:12, model:'工商业 215kWh 储能柜', scene:'中小型工厂储能降电费', voltage:'716.8V', capacity:'300Ah', current:'280A', size:'2200×1400×2400', weight:'5.2吨', energy:'215kWh', img:'/design-images/image22.jpeg' },
    { id:13, model:'工商业 300kWh 储能柜', scene:'产业园区、充电桩配套储能', voltage:'806.4V', capacity:'372Ah', current:'320A', size:'2200×1400×2400', weight:'6.8吨', energy:'300kWh', img:'/design-images/image23.jpeg' },
    { id:14, model:'工商业 500kWh 液冷柜', scene:'大型商场、制造厂区储能', voltage:'985.6V', capacity:'507Ah', current:'420A', size:'2600×1450×2450', weight:'9.5吨', energy:'500kWh', img:'/design-images/image24.jpeg' },
  ],
  container: [
    { id:15, model:'20尺-1.45MWh 集装箱', scene:'小型分布式电站、临时备用', voltage:'1228.8V', capacity:'280Ah', current:'1200A', size:'6058×2438×2896', weight:'22吨', energy:'1454kWh', img:'/design-images/image25.jpeg' },
    { id:16, model:'20尺-3.44MWh 集装箱', scene:'中小型光伏配储电站', voltage:'1228.8V', capacity:'314Ah', current:'2600A', size:'6058×2438×2896', weight:'35吨', energy:'3440kWh', img:'/design-images/image26.jpeg' },
    { id:17, model:'20尺-3.99MWh 集装箱', scene:'中型电网调频、容量备用', voltage:'1331.2V', capacity:'314Ah', current:'3000A', size:'6058×2438×2896', weight:'37吨', energy:'3993kWh', img:'/design-images/image27.jpeg' },
    { id:18, model:'40尺-5MWh 风冷集装箱', scene:'大型风光基地配套储能', voltage:'1331.2V', capacity:'314Ah', current:'3750A', size:'12192×2350×2390', weight:'52吨', energy:'5000kWh', img:'/design-images/image28.jpeg' },
    { id:19, model:'40尺-5.2MWh 液冷集装箱', scene:'高标准电网储能电站', voltage:'1331.2V', capacity:'314Ah', current:'3900A', size:'12192×2350×2390', weight:'65吨', energy:'5200kWh', img:'/design-images/image29.jpeg' },
    { id:20, model:'40尺-6MWh 液冷集装箱', scene:'大型调峰、新能源消纳', voltage:'1433.6V', capacity:'314Ah', current:'4200A', size:'12192×2350×2390', weight:'72吨', energy:'6000kWh', img:'/design-images/image30.jpeg' },
  ],
};

// ─── 运营网络模拟电池节点（电池网络分布用） ──────────────
const NETWORK_NODES = [
  { id:1, name:'金边旗舰站', lng:104.917, lat:11.556, energy:'86 组电池', runtime:'运营 3 年', status:'在线', charge:'92%', health:'98%' },
  { id:2, name:'暹粒站', lng:103.856, lat:13.363, energy:'45 组电池', runtime:'运营 2 年', status:'在线', charge:'87%', health:'95%' },
  { id:3, name:'西哈努克站', lng:103.523, lat:10.626, energy:'38 组电池', runtime:'运营 2 年', status:'在线', charge:'90%', health:'96%' },
  { id:4, name:'马德望站', lng:103.200, lat:13.096, energy:'22 组电池', runtime:'运营 1.5 年', status:'在线', charge:'85%', health:'93%' },
  { id:5, name:'达卡Mirpur站', lng:90.367, lat:23.804, energy:'52 组电池', runtime:'运营 2.5 年', status:'在线', charge:'94%', health:'97%' },
  { id:6, name:'达卡Gulshan站', lng:90.412, lat:23.793, energy:'35 组电池', runtime:'运营 2 年', status:'在线', charge:'89%', health:'95%' },
  { id:7, name:'吉大港站', lng:91.812, lat:22.338, energy:'28 组电池', runtime:'运营 2 年', status:'在线', charge:'88%', health:'94%' },
  { id:8, name:'库尔纳站', lng:89.567, lat:22.846, energy:'18 组电池', runtime:'运营 1 年', status:'在线', charge:'91%', health:'96%' },
  { id:9, name:'胡志明旗舰站', lng:106.702, lat:10.776, energy:'48 组电池', runtime:'运营 3 年', status:'在线', charge:'93%', health:'97%' },
  { id:10, name:'河内站', lng:105.854, lat:21.029, energy:'32 组电池', runtime:'运营 2 年', status:'在线', charge:'86%', health:'94%' },
  { id:11, name:'岘港站', lng:108.220, lat:16.054, energy:'20 组电池', runtime:'运营 1.5 年', status:'在线', charge:'90%', health:'95%' },
  { id:12, name:'雅加达中心站', lng:106.827, lat:-6.175, energy:'30 组电池', runtime:'运营 2 年', status:'在线', charge:'91%', health:'96%' },
  { id:13, name:'万隆站', lng:107.610, lat:-6.917, energy:'18 组电池', runtime:'运营 1 年', status:'在线', charge:'84%', health:'93%' },
  { id:14, name:'马尼拉Makati站', lng:121.024, lat:14.555, energy:'22 组电池', runtime:'运营 2 年', status:'在线', charge:'88%', health:'95%' },
  { id:15, name:'宿务站', lng:123.886, lat:10.315, energy:'15 组电池', runtime:'运营 1.5 年', status:'在线', charge:'87%', health:'94%' },
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

// ─── 板块 1：电池资产 ──────────────────────────────────
function BatteryAssetsSection() {
  const [activeCategory, setActiveCategory] = useState('swap');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const loggedIn = isLoggedIn();

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

        {/* 分类 Tab */}
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

        {/* 电池列表 */}
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
                <img
                  src={item.img}
                  alt={item.model}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-base text-gray-900 leading-snug">{item.model}</h3>
                  <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full whitespace-nowrap ml-2">{item.energy}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{item.scene}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">电压</div>
                    <div className="font-semibold text-gray-700">{item.voltage}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">电流</div>
                    <div className="font-semibold text-gray-700">{item.current}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-gray-400">重量</div>
                    <div className="font-semibold text-gray-700">{item.weight}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 展开详情 */}
        {selectedAsset && (
          <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedAsset.model}</h3>
                <p className="text-blue-600 font-medium mt-1">{selectedAsset.energy} · {selectedAsset.scene}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'标称电压', value:selectedAsset.voltage },
                { label:'容量', value:selectedAsset.capacity },
                { label:'持续电流', value:selectedAsset.current },
                { label:'外形尺寸', value:selectedAsset.size },
                { label:'净重', value:selectedAsset.weight },
                { label:'单台电量', value:selectedAsset.energy },
              ].map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                  <div className="font-semibold text-gray-900">{p.value}</div>
                </div>
              ))}
            </div>
            {!loggedIn && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href="/register" className="text-blue-600 font-medium text-sm hover:underline">
                  注册登录，查看投资收益率与详情 →
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">共 20 款标准化电池产品 · 参数公开透明 · 登录查看投资详情</p>
        </div>
      </div>
    </section>
  );
}

// ─── 板块 2：运营网络 ──────────────────────────────────
function OperationsNetworkSection() {
  const amapReady = useAmap();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showPhotoPlaceholder, setShowPhotoPlaceholder] = useState(false);

  useEffect(() => {
    if (!amapReady || !containerRef.current || mapRef.current) return;
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
      marker.on('click', () => { setSelectedStore(s); setShowPhotoPlaceholder(false); });
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady]);

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
                  onClick={() => { setSelectedStore(s); setShowPhotoPlaceholder(false); }}
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
                  <p className="text-xs text-gray-400 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />{s.country} · {s.city}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 选中站点详情 + 照片占位 */}
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
                <img src={storeImages[selectedStore.id]} alt={selectedStore.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                onClick={() => setShowPhotoPlaceholder(!showPhotoPlaceholder)}
                className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center h-56 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                {showPhotoPlaceholder ? (
                  <div className="text-center px-6">
                    <p className="text-gray-500 text-sm font-medium mb-2">实景照片上传区域</p>
                    <p className="text-gray-400 text-xs">用户将在此处上传</p>
                    <p className="text-gray-400 text-xs">{selectedStore.name} 的现场实景照片</p>
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

// ─── 板块 3：电池网络分布 ──────────────────────────────
function BatteryNetworkSection() {
  const amapReady = useAmap();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!amapReady || !containerRef.current || mapRef.current) return;
    const AMap = window.AMap;
    const map = new AMap.Map(containerRef.current, {
      center: [105, 14],
      zoom: 4,
      mapStyle: 'amap://styles/light',
    });
    mapRef.current = map;
    NETWORK_NODES.forEach((n) => {
      const hue = parseFloat(n.charge) > 90 ? 140 : parseFloat(n.charge) > 85 ? 200 : 30;
      const marker = new AMap.Marker({
        position: [n.lng, n.lat],
        content: `<div style="width:28px;height:28px;background:hsl(${hue},70%,50%);border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">⚡</div>`,
        offset: new AMap.Pixel(-14, -14),
      });
      marker.on('click', () => setSelectedNode(n));
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady]);

  return (
    <section id="battery-network" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Network className="h-4 w-4 mr-2" /> 电池网络分布
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">电池网络实时分布</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">全球在运电池资产可视化监控，实时电量与服役状态一目了然</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* 地图 */}
          <div className="lg:col-span-3">
            <div ref={containerRef} className="w-full h-[540px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
          </div>

          {/* 右侧详情面板 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[540px] flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900">实时监控面板</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedNode ? selectedNode.name : '点击地图标记查看详情'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedNode.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{selectedNode.energy}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label:'当前电量', value:selectedNode.charge, color:'bg-green-500' },
                        { label:'电池健康', value:selectedNode.health, color:'bg-blue-500' },
                        { label:'运行状态', value:selectedNode.status, color:'bg-emerald-600' },
                        { label:'服役时间', value:selectedNode.runtime, color:'bg-gray-600' },
                      ].map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 ${m.color} rounded-full`} />
                            <span className="text-xs text-gray-400">{m.label}</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* 电量进度条 */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">电量水平</span>
                        <span className="text-xs font-semibold text-gray-700">{selectedNode.charge}</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                          style={{ width: selectedNode.charge }}
                        />
                      </div>
                    </div>

                    {/* 站点列表导航 */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">其他站点</div>
                      {NETWORK_NODES.filter(n => n.id !== selectedNode.id).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNode(n)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700">{n.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            parseFloat(n.charge) > 90 ? 'bg-green-100 text-green-700' :
                            parseFloat(n.charge) > 85 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{n.charge}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <Network className="h-12 w-12 text-gray-200 mb-4" />
                    <p className="text-gray-400 text-sm">点击地图上的闪电标记</p>
                    <p className="text-gray-300 text-xs mt-1">查看该站点电池的详细状态</p>
                    <div className="mt-6 grid grid-cols-3 gap-3 w-full">
                      {['在线 15 站', '总电池 529 组', '平均健康 95%'].map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">{s.split(' ')[0]}</div>
                          <div className="font-semibold text-sm text-gray-900 mt-0.5">{s.split(' ')[1]} {s.split(' ')[2] || ''}</div>
                        </div>
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

// ─── 板块 4：加盟门店 ──────────────────────────────────
function FranchiseStoresSection() {
  const typeColors = {
    '旗舰店': { bg:'bg-gray-900', text:'text-white', badge:'bg-gray-100 text-gray-700' },
    '标准站': { bg:'bg-blue-500', text:'text-white', badge:'bg-blue-50 text-blue-700' },
    '社区站': { bg:'bg-amber-400', text:'text-white', badge:'bg-amber-50 text-amber-700' },
  };

  return (
    <section id="franchise-stores" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Store className="h-4 w-4 mr-2" /> 加盟门店
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">加盟门店网络</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">投资者购买电池资产的销售门店，覆盖东南亚 5 国 15 个城市</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon:Store, label:'门店总数', value:'15' },
            { icon:Globe, label:'覆盖国家', value:'5' },
            { icon:Battery, label:'在售电池', value:'529+组' },
            { icon:Building2, label:'旗舰店', value:'5家' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center">
              <s.icon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 门店卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STORES.map((store) => {
            const colors = typeColors[store.type] || typeColors['标准站'];
            return (
              <div key={store.id} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300">
                <div className={`h-2 ${colors.bg}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{store.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{store.country} · {store.city}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors.badge}`}>{store.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{store.desc}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center text-gray-400">
                      <MapPin className="h-3 w-3 mr-1" />{store.address}
                    </span>
                    <span className="font-semibold text-gray-900">{store.count} 组电池</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Phone className="h-3 w-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{store.phone}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/stores"
            className="inline-flex items-center bg-gray-900 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-800 transition shadow-lg"
          >
            查看全部门店 <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 主页面 ────────────────────────────────────────────
export default function HomePage() {
  const loggedIn = isLoggedIn();

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
              <div className="inline-flex items-center bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm mb-6 border border-white/10">
                <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                1kWh · 1kwh.store
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                6 SEC <span className="text-yellow-400">SWAP</span><br />& GO
              </h1>
              <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
                1kWh 基于区块链+IoT技术，构建东南亚最大换电网络。
                投资电池资产，享受稳定年化收益，助力绿色能源革命。
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
                <img src="/design-images/image1.jpg" alt="1kWh" className="relative w-full h-full object-cover rounded-3xl shadow-2xl" />
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
                <img src={item.img} alt={item.label} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 拼图式产品展示（过渡区） */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src:'/design-images/image2.jpg', row:1 },
              { src:'/design-images/image3.jpg', row:1 },
              { src:'/design-images/image7.png', row:2 },
              { src:'/design-images/image8.png', row:2 },
              { src:'/design-images/image9.png', row:2 },
              { src:'/design-images/image10.png', row:2 },
              { src:'/design-images/image11.png', row:2 },
              { src:'/design-images/image12.png', row:2 },
            ].map((img, i) => (
              <div key={i} className="rounded-2xl overflow-hidden h-48 bg-gray-100">
                <img src={img.src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 板块 1：电池资产 */}
      <BatteryAssetsSection />

      {/* 板块 2：运营网络 */}
      <OperationsNetworkSection />

      {/* 板块 3：电池网络分布 */}
      <BatteryNetworkSection />

      {/* 板块 4：加盟门店 */}
      <FranchiseStoresSection />

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">加入 1kWh 电池资产平台</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">投资电池资产，享受稳定收益。最低 $100 起投，随时查看收益，灵活退出。</p>
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
