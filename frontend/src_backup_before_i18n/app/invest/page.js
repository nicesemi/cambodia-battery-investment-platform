'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assetAPI, orderAPI, dividendAPI } from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, TrendingUp, Battery, ShoppingCart, DollarSign, Calendar, BarChart3, Clock, Zap, Wallet, ArrowUpCircle, ArrowDownCircle, Send, CreditCard, Banknote, Loader2, Gift, AlertTriangle, Calculator, Network, MapPinned } from 'lucide-react';
import { USD_TO_CNY_RATE, dualCurrency, formatUSD, formatCNY, usdToCny } from '../../lib/currency';

const BATTERY_PRODUCTS = [
  { id: '4820', name: '通用低速两轮换电', scene: '家用电动二轮车', voltage: '51.2V', capacity: '20Ah', energy: '1.024kWh', weight: '10kg', price: 1180, monthlyRent: 80, category: 'swap' },
  { id: '6035', name: '中速电摩换电', scene: '外卖骑手/泰国60V电摩', voltage: '64V', capacity: '35Ah', energy: '2.24kWh', weight: '19kg', price: 2380, monthlyRent: 160, category: 'swap' },
  { id: '7250', name: '高速电摩换电', scene: '72V两轮电摩/山区/越南', voltage: '76.8V', capacity: '50Ah', energy: '3.84kWh', weight: '29kg', price: 4280, monthlyRent: 280, category: 'swap' },
  { id: '72100', name: '重载三轮备用款', scene: '快递/摆摊货运三轮', voltage: '76.8V', capacity: '100Ah', energy: '7.68kWh', weight: '56kg', price: 8450, monthlyRent: 560, category: 'swap' },
  { id: 'van420', name: '4.2米物流货车电池', scene: '城市短途物流车队BaaS', voltage: '384V', capacity: '-', energy: '96kWh', weight: '620kg', price: 68000, monthlyRent: 4500, category: 'vehicle' },
  { id: 'bus600', name: '6米客运中巴电池', scene: '城乡短途客运车队', voltage: '512V', capacity: '-', energy: '160kWh', weight: '1100kg', price: 124000, monthlyRent: 8250, category: 'vehicle' },
  { id: 'bus1200', name: '12米城市大巴电池', scene: '公交集团电动客车租赁', voltage: '640V', capacity: '-', energy: '256kWh', weight: '1650kg', price: 182000, monthlyRent: 12000, category: 'vehicle' },
  { id: 'ess100', name: '工商业100kWh风冷柜', scene: '小型商铺/加工厂峰谷套利', voltage: '627.2V', capacity: '160Ah', energy: '100kWh', weight: '3吨', price: 248000, monthlyRent: 11000, category: 'ess' },
  { id: 'ess215', name: '工商业215kWh储能柜', scene: '中小型工厂储能降电费', voltage: '716.8V', capacity: '300Ah', energy: '215kWh', weight: '5.2吨', price: 495000, monthlyRent: 22000, category: 'ess' },
  { id: 'ess300', name: '工商业300kWh储能柜', scene: '产业园区/充电桩配套', voltage: '806.4V', capacity: '372Ah', energy: '300kWh', weight: '6.8吨', price: 672000, monthlyRent: 30000, category: 'ess' },
  { id: 'ess500', name: '工商业500kWh液冷柜', scene: '大型商场/制造厂区储能', voltage: '985.6V', capacity: '507Ah', energy: '500kWh', weight: '9.5吨', price: 1080000, monthlyRent: 48000, category: 'ess' },
  { id: 'cont145', name: '20尺1.45MWh集装箱', scene: '小型分布式电站/备用储能', voltage: '1228.8V', capacity: '280Ah', energy: '1454kWh', weight: '22吨', price: 2750000, monthlyRent: 120000, category: 'container' },
  { id: 'cont344', name: '20尺3.44MWh集装箱', scene: '中小型光伏配储电站', voltage: '1228.8V', capacity: '314Ah', energy: '3440kWh', weight: '35吨', price: 6380000, monthlyRent: 280000, category: 'container' },
  { id: 'cont399', name: '20尺3.99MWh集装箱', scene: '中型电网调频/容量备用', voltage: '1331.2V', capacity: '314Ah', energy: '3993kWh', weight: '37吨', price: 7350000, monthlyRent: 320000, category: 'container' },
  { id: 'cont500', name: '40尺5MWh风冷集装箱', scene: '大型风光基地配套储能', voltage: '1331.2V', capacity: '314Ah', energy: '5000kWh', weight: '52吨', price: 9200000, monthlyRent: 400000, category: 'container' },
  { id: 'cont520', name: '40尺5.2MWh液冷集装箱', scene: '高标准电网储能电站', voltage: '1331.2V', capacity: '314Ah', energy: '5200kWh', weight: '65吨', price: 9980000, monthlyRent: 440000, category: 'container' },
  { id: 'cont600', name: '40尺6MWh液冷集装箱', scene: '大型调峰/新能源消纳', voltage: '1433.6V', capacity: '314Ah', energy: '6000kWh', weight: '72吨', price: 11600000, monthlyRent: 510000, category: 'container' },
];

const BATTERY_CATEGORY_ICONS = {
  swap:     { bg: '#f97316', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="6" y1="12" x2="14" y2="12"/><polyline points="19 13 19 16 22 16"/><polyline points="22 11 19 8 19 11"/></svg>', label: '换电站' },
  vehicle:  { bg: '#3b82f6', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="6" y1="12" x2="18" y2="12"/><polyline points="4 8 2 12 4 16"/><polyline points="20 8 22 12 20 16"/></svg>', label: '运营线路' },
  ess:      { bg: '#7c3aed', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="22" height="16" rx="3"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="20" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>', label: '移动储能柜' },
  container:{ bg: '#ef4444', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/></svg>', label: '固定储能柜' },
};

function classifyBattery(unitCode) {
  if (!unitCode) return 'swap';
  const code = unitCode.toUpperCase();
  if (code.startsWith('BAT-ESS') || code.includes('ESS')) return 'ess';
  if (code.startsWith('BAT-CT') || code.includes('CONT')) return 'container';
  if (code.startsWith('BAT-V') || code.includes('VAN') || code.includes('BUS')) return 'vehicle';
  return 'swap';
}

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

export default function Invest() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeRef = searchParams.get('store');

  const [activeTab, setActiveTab] = useState('browse');
  const [assets, setAssets] = useState([]);
  const [userAssets, setUserAssets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [purchaseUnits, setPurchaseUnits] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [boundStoreId, setBoundStoreId] = useState(null);

  // ─── 高德地图加载 ──────────────
  const amapLoadPromiseRef = useRef(null);
  const loadAmap = useCallback(() => {
    if (typeof window !== 'undefined' && window.AMap) return Promise.resolve(window.AMap);
    if (amapLoadPromiseRef.current) return amapLoadPromiseRef.current;
    amapLoadPromiseRef.current = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=ec0df993f8f11e2751333bf5c27ae6e1&plugin=AMap.Adaptor';
      script.async = true;
      script.onload = () => resolve(window.AMap);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return amapLoadPromiseRef.current;
  }, []);

  // ─── 投资页地图 ──────────────
  const [investMapReady, setInvestMapReady] = useState(false);
  const investMapRef = useRef(null);
  const investMapContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadAmap().then(() => { if (!cancelled) setInvestMapReady(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, [loadAmap]);

  // ─── 可投资运营电池 ─────────────
  const [operationalBatteries, setOperationalBatteries] = useState([]);
  const [opBatteriesLoading, setOpBatteriesLoading] = useState(false);
  const [opPurchasing, setOpPurchasing] = useState(null);
  // 统一认证检查: DB实际存储 'kyc_approved' / 'kyc_submitted' / 'kyc_rejected'
  const isVerified = () => {
    if (!user?.certification_status) return false;
    return ['verified', 'kyc_approved', 'business_verified'].includes(user.certification_status);
  };
  const purchaseOpBattery = async (batteryUnit, index) => {
    if (!user) { router.push('/login'); return; }
    if (!isVerified()) {
      alert('请先完成实名认证后再购买');
      return;
    }
    setOpPurchasing(index);
    try {
      const orderResult = await orderAPI.createOrder({
        asset_id: batteryUnit.battery_asset_id, units: 1
      });
      alert(`购买成功！订单编号: ${orderResult.order_id || orderResult.order?.order_id || orderResult.id}`);
      setOperationalBatteries(prev => prev.filter((_, i) => i !== index));
      loadData();
    } catch (e) {
      alert(e.message || '购买失败');
    } finally {
      setOpPurchasing(null);
    }
  };

  const handleGPSClick = (lng, lat) => {
    setActiveTab('portfolio');
    setTimeout(() => {
      investMapContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        if (investMapRef.current) {
          investMapRef.current.setZoomAndCenter(14, [lng, lat]);
        }
      }, 400);
    }, 100);
  };

  useEffect(() => {
    const fetchOpBatteries = async () => {
      setOpBatteriesLoading(true);
      try {
        const res = await fetch('/api/battery-units/live');
        const data = await res.json();
        const units = data.units || [];
        const filtered = units.filter(
          bu => bu.db_status === 'sold' && !bu.investor_id && bu.site_id
        );
        setOperationalBatteries(filtered);
      } catch (e) {
        console.error('获取可投资运营电池失败', e);
      } finally {
        setOpBatteriesLoading(false);
      }
    };
    fetchOpBatteries();
  }, []);

  // Dividends
  const [dividends, setDividends] = useState([]);
  const [dividendsTotal, setDividendsTotal] = useState(0);
  const [dividendsThisMonth, setDividendsThisMonth] = useState(0);
  const [dividendsLoading, setDividendsLoading] = useState(false);
  const [batteryDetails, setBatteryDetails] = useState([]);
  const [batteryDetailsLoading, setBatteryDetailsLoading] = useState(false);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

  // Recharge
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  // Withdraw
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bank_account: '', bank_name: '', bank_holder: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  // Calculator
  const [calcBatteryCounts, setCalcBatteryCounts] = useState({});
  const [batteryTypes, setBatteryTypes] = useState([]);

  const products = batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS;

  useEffect(() => {
    fetch('/api/battery-types')
      .then(r => r.json())
      .then(data => {
        if (data.battery_types) {
          const mapped = data.battery_types.map(bt => {
            const price = (typeof bt.unit_price === 'string' ? parseFloat(bt.unit_price) : bt.unit_price) || 0;
            const rent = (typeof bt.monthly_rent === 'string' ? parseFloat(bt.monthly_rent) : bt.monthly_rent) || 0;
            let category = 'swap';
            const nameLower = (bt.name || '').toLowerCase();
            if (nameLower.includes('集装箱') || nameLower.includes('container')) category = 'container';
            else if (nameLower.includes('工商业') || nameLower.includes('ess') || nameLower.includes('储能柜') || nameLower.includes('液冷柜') || nameLower.includes('风冷柜')) category = 'ess';
            else if (nameLower.includes('物流') || nameLower.includes('中巴') || nameLower.includes('大巴') || nameLower.includes('客车') || nameLower.includes('货车')) category = 'vehicle';
            return {
              id: bt.name,
              name: bt.name,
              price: price,
              monthlyRent: rent,
              category: category,
              scene: bt.scenario || '',
              voltage: bt.voltage || '',
              capacity: bt.capacity || '',
              energy: bt.power_kwh || '',
              weight: bt.net_weight || '',
            };
          });
          setBatteryTypes(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const getInvestCalcResult = () => {
    const investorRate = 0.70;
    let totalInvestment = 0;
    let totalMonthlyRent = 0;
    const details = [];

    for (const battery of products) {
      const count = Number(calcBatteryCounts[battery.id]) || 0;
      if (count <= 0) continue;
      const invest = battery.price * count;
      const rent = (battery.monthlyRent || 0) * count;
      totalInvestment += invest;
      totalMonthlyRent += rent;
      details.push({ id: battery.id, name: battery.name, count, unitPrice: battery.price, invest, monthlyRent: battery.monthlyRent, totalRent: rent });
    }

    if (details.length === 0) return null;

    const investorMonthly = totalMonthlyRent * investorRate;
    const investorAnnual = investorMonthly * 12;
    const investorPaybackMonths = investorMonthly > 0 ? totalInvestment / investorMonthly : Infinity;
    const investorAnnualReturn = totalInvestment > 0 ? ((investorAnnual / totalInvestment) * 100).toFixed(1) : '0';

    return { details, totalInvestment, totalMonthlyRent, investorMonthly, investorAnnual, investorPaybackMonths, investorAnnualReturn, investorRate };
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role === 'franchisee') { router.push('/franchisee'); return; }
    loadData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'dividends') loadDividends();
    if (activeTab === 'wallet') loadWallet();
  }, [activeTab]);

  const loadData = async () => {
    // 静态电池数据fallback（当后端API不可用时使用）
    const FALLBACK_BATTERIES = [
      { id: '4820', name: '通用低速两轮换电', battery_type: '两轮换电', location: '柬埔寨·金边', asset_code: 'BT-4820-001', description: '家用电动二轮车换电电池，51.2V/20Ah/1.024kWh，适合日常通勤。', unit_price: 118, unit_price_rmb: 856, expected_roi: 8.2, available_units: 500, total_units: 500 },
      { id: '6035', name: '中速电摩换电', battery_type: '两轮换电', location: '柬埔寨·金边', asset_code: 'BT-6035-001', description: '外卖骑手/60V电摩换电电池，64V/35Ah/2.24kWh，高频使用场景。', unit_price: 238, unit_price_rmb: 1726, expected_roi: 9.5, available_units: 300, total_units: 300 },
      { id: '7250', name: '高速电摩换电', battery_type: '两轮换电', location: '柬埔寨·暹粒', asset_code: 'BT-7250-001', description: '72V两轮电摩/山区换电，76.8V/50Ah/3.84kWh，续航强劲。', unit_price: 428, unit_price_rmb: 3103, expected_roi: 10.8, available_units: 200, total_units: 200 },
      { id: '72100', name: '重载三轮备用款', battery_type: '三轮换电', location: '柬埔寨·金边', asset_code: 'BT-72100-001', description: '快递/摆摊货运三轮电池，76.8V/100Ah/7.68kWh，大容量。', unit_price: 845, unit_price_rmb: 6126, expected_roi: 11.2, available_units: 150, total_units: 150 },
      { id: 'van420', name: '4.2米物流货车电池', battery_type: '商用车', location: '柬埔寨·西哈努克', asset_code: 'BT-VAN420-001', description: '城市短途物流车队BaaS电池，384V/96kWh，物流降本利器。', unit_price: 6800, unit_price_rmb: 49300, expected_roi: 12.5, available_units: 80, total_units: 80 },
      { id: 'bus600', name: '6米客运中巴电池', battery_type: '商用车', location: '柬埔寨·金边', asset_code: 'BT-BUS600-001', description: '城乡短途客运车队电池，512V/160kWh，客运电动化首选。', unit_price: 12400, unit_price_rmb: 89900, expected_roi: 13.0, available_units: 50, total_units: 50 },
      { id: 'bus1200', name: '12米城市大巴电池', battery_type: '商用车', location: '柬埔寨·金边', asset_code: 'BT-BUS1200-001', description: '公交集团电动客车电池，640V/256kWh，城市公交配套。', unit_price: 18200, unit_price_rmb: 131950, expected_roi: 13.5, available_units: 30, total_units: 30 },
      { id: 'ess100', name: '工商业100kWh风冷柜', battery_type: '工商业储能', location: '柬埔寨·金边', asset_code: 'BT-ESS100-001', description: '小型商铺/加工厂峰谷套利，627.2V/100kWh，降电费利器。', unit_price: 24800, unit_price_rmb: 179800, expected_roi: 14.0, available_units: 40, total_units: 40 },
      { id: 'ess215', name: '工商业215kWh储能柜', battery_type: '工商业储能', location: '柬埔寨·西哈努克', asset_code: 'BT-ESS215-001', description: '中小型工厂储能降电费，716.8V/215kWh，工厂必备。', unit_price: 49500, unit_price_rmb: 358875, expected_roi: 14.5, available_units: 25, total_units: 25 },
      { id: 'ess300', name: '工商业300kWh储能柜', battery_type: '工商业储能', location: '柬埔寨·暹粒', asset_code: 'BT-ESS300-001', description: '产业园区/充电桩配套储能，806.4V/300kWh。', unit_price: 67200, unit_price_rmb: 487200, expected_roi: 15.0, available_units: 20, total_units: 20 },
      { id: 'ess500', name: '工商业500kWh液冷柜', battery_type: '工商业储能', location: '柬埔寨·金边', asset_code: 'BT-ESS500-001', description: '大型商场/制造厂区储能，985.6V/500kWh，液冷高效。', unit_price: 108000, unit_price_rmb: 783000, expected_roi: 15.5, available_units: 15, total_units: 15 },
      { id: 'cont145', name: '20尺1.45MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT145-001', description: '小型分布式电站/备用储能，1228.8V/1454kWh。', unit_price: 275000, unit_price_rmb: 1993750, expected_roi: 16.0, available_units: 10, total_units: 10 },
      { id: 'cont344', name: '20尺3.44MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·西哈努克', asset_code: 'BT-CONT344-001', description: '中小型光伏配储电站，1228.8V/3440kWh。', unit_price: 638000, unit_price_rmb: 4625500, expected_roi: 16.5, available_units: 8, total_units: 8 },
      { id: 'cont399', name: '20尺3.99MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·暹粒', asset_code: 'BT-CONT399-001', description: '中型电网调频/容量备用，1331.2V/3993kWh。', unit_price: 735000, unit_price_rmb: 5328750, expected_roi: 17.0, available_units: 6, total_units: 6 },
      { id: 'cont500', name: '40尺5MWh风冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT500-001', description: '大型风光基地配套储能，1331.2V/5000kWh。', unit_price: 920000, unit_price_rmb: 6670000, expected_roi: 17.5, available_units: 5, total_units: 5 },
      { id: 'cont520', name: '40尺5.2MWh液冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT520-001', description: '高标准电网储能电站，1331.2V/5200kWh，液冷高效。', unit_price: 998000, unit_price_rmb: 7235500, expected_roi: 18.0, available_units: 3, total_units: 3 },
      { id: 'cont600', name: '40尺6MWh液冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT600-001', description: '大型调峰/新能源消纳，1433.6V/6000kWh，旗舰产品。', unit_price: 1160000, unit_price_rmb: 8410000, expected_roi: 18.5, available_units: 2, total_units: 2 },
    ];

    try {
      const [assetsRes, userAssetsRes, ordersRes, bindingRes] = await Promise.all([
        assetAPI.getAssets(),
        assetAPI.getUserAssets(),
        orderAPI.getMyOrders(1, 50),
        orderAPI.getMyBinding().catch(() => null),
      ]);
      const apiAssets = assetsRes.assets || [];
      // 如果API返回为空，使用静态fallback数据
      setAssets(apiAssets.length > 0 ? apiAssets : FALLBACK_BATTERIES);
      setUserAssets(userAssetsRes.userAssets || []);
      setOrders(ordersRes.orders || []);
      if (bindingRes?.binding?.store_id) {
        setBoundStoreId(bindingRes.binding.store_id);
      }
    } catch (e) {
      console.error(e);
      // API调用失败时也使用fallback数据
      setAssets(FALLBACK_BATTERIES);
    }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    if (!selectedAsset) return;
    setPurchasing(true);
    try {
      const orderResult = await orderAPI.createOrder({
        asset_id: selectedAsset.id,
        units: purchaseUnits,
        store_id: storeRef || boundStoreId || null,
      });
      alert(`购买成功！订单编号: ${orderResult.order_id}`);
      setSelectedAsset(null);
      setPurchaseUnits(1);
      loadData();
    } catch (err) {
      const msg = err.message || '购买失败';
      alert(msg === 'Insufficient balance' ? '余额不足，请先去我的钱包充值！' : msg);
    }
    finally { setPurchasing(false); }
  };

  // ─── 投资地图渲染（portfolio tab 切换时渲染）───
  useEffect(() => {
    if (!investMapReady) return;
    if (activeTab !== 'portfolio') return;
    if (!investMapContainerRef.current) return;

    // 收集已购买电池的经纬度数据
    const purchasedMarkers = [];
    (userAssets || []).forEach(ua => {
      (ua.battery_units || []).forEach(bu => {
        if (bu.sensor_longitude != null && bu.sensor_latitude != null) {
          const soc = bu.sensor_battery_level;
          let socColor = '#22c55e';
          if (soc != null && soc <= 20) socColor = '#ef4444';
          else if (soc != null && soc <= 50) socColor = '#eab308';
          const category = classifyBattery(bu.unit_code);
          const iconCfg = BATTERY_CATEGORY_ICONS[category] || BATTERY_CATEGORY_ICONS.swap;
          purchasedMarkers.push({
            lng: bu.sensor_longitude,
            lat: bu.sensor_latitude,
            unit_code: bu.unit_code,
            bg: iconCfg.bg,
            svg: iconCfg.svg,
            socColor,
          });
        }
      });
    });

    const timer = setTimeout(() => {
      if (!investMapContainerRef.current) return;
      const map = new window.AMap.Map(investMapContainerRef.current, {
        zoom: purchasedMarkers.length > 0 ? 8 : 7,
        center: purchasedMarkers.length > 0
          ? [purchasedMarkers[0].lng, purchasedMarkers[0].lat]
          : [104.917, 12.565], // 柬埔寨中心
        mapStyle: 'amap://styles/light',
        resizeEnable: true,
      });
      investMapRef.current = map;

      purchasedMarkers.forEach(m => {
        const marker = new window.AMap.Marker({
          position: [m.lng, m.lat],
          content: `<div style="position:relative;width:30px;height:30px;background:${m.bg};border-radius:8px;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center" title="${m.unit_code}">
            ${m.svg}
            <div style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:${m.socColor};border-radius:50%;border:1.5px solid white"></div>
          </div>`,
          offset: new window.AMap.Pixel(-15, -15),
        });
        marker.on('click', () => {
          map.setZoomAndCenter(14, [m.lng, m.lat]);
        });
        map.add(marker);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (investMapRef.current) {
        investMapRef.current.destroy();
        investMapRef.current = null;
      }
    };
  }, [investMapReady, activeTab, userAssets]);

  const loadDividends = async () => {
    setDividendsLoading(true);
    try {
      const allData = await dividendAPI.getMyDividends();
      const records = allData.dividends || [];
      setDividends(records);
      const details = allData.battery_details || [];
      setBatteryDetails(details);
      // 从分红明细表汇总：本月分红=各行this_month_dividend之和，累计分红=各行cumulative_dividend之和
      setDividendsThisMonth(details.reduce((s, bd) => s + (bd.this_month_dividend || 0), 0));
      setDividendsTotal(details.reduce((s, bd) => s + (bd.cumulative_dividend || 0), 0));
      setBatteryDetailsLoading(false);
    } catch (e) { console.error(e); }
    finally { setDividendsLoading(false); }
  };

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [profileRes, txRes] = await Promise.all([
        fetch('/api/auth/profile', { headers }),
        fetch('/api/wallet/transactions', { headers }),
      ]);
      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.wallet) {
        setWalletBalance(profileData.wallet.balance);
      }
      const txData = await txRes.json();
      if (txRes.ok) {
        setWalletTransactions(txData.transactions || txData.records || []);
      }
    } catch (e) { console.error(e); }
    finally { setWalletLoading(false); }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) { alert('请输入有效金额'); return; }
    setRecharging(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        alert('充值成功！');
        setShowRechargeModal(false);
        setRechargeAmount('');
        loadWallet();
      } else {
        const err = await res.json();
        alert(err.error || '充值失败');
      }
    } catch (e) { alert('充值失败'); }
    finally { setRecharging(false); }
  };

  const handleWithdraw = async () => {
    const { amount, bank_account, bank_name, bank_holder } = withdrawForm;
    if (!amount || parseFloat(amount) <= 0) { alert('请输入有效提现金额'); return; }
    const missing = [];
    if (!bank_account) missing.push('银行卡号');
    if (!bank_name) missing.push('开户行');
    if (!bank_holder) missing.push('持卡人姓名');
    if (missing.length > 0) { alert('请填写：' + missing.join('、')); return; }
    setWithdrawing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: parseFloat(amount), bank_account, bank_name, bank_holder, business_license_url: '', invoice_info_url: '', vat_invoice_url: '' }),
      });
      if (res.ok) {
        alert('提现申请已提交！');
        setShowWithdrawModal(false);
        setWithdrawForm({ amount: '', bank_account: '', bank_name: '', account_holder: '' });
        loadWallet();
      } else {
        const err = await res.json();
        alert(err.error || '提现失败');
      }
    } catch (e) { alert('提现失败'); }
    finally { setWithdrawing(false); }
  };

  const totalInvested = userAssets.reduce((s, ua) => s + (ua.total_invested || 0), 0);
  const activeCount = userAssets.filter(ua => (ua.units || 0) > 0).length;
  const purchasedCount = userAssets.reduce((count, ua) => {
    return count + (ua.battery_units || []).filter(bu => bu.sensor_longitude != null && bu.sensor_latitude != null).length;
  }, 0);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">电池资产投资</h1>
          <p className="text-blue-100 mt-2">选择优质电池资产，享受稳定分红收益</p>
          {storeRef && <div className="mt-3 bg-white/20 backdrop-blur rounded-lg px-4 py-2 inline-block text-sm">门店推荐通道</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">${totalInvested.toFixed(0)}</div><div className="text-blue-100 text-sm">总投资</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">${dividendsTotal.toFixed(0)}</div><div className="text-blue-100 text-sm">累计分红</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{activeCount}</div><div className="text-blue-100 text-sm">持仓资产</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{orders.length}</div><div className="text-blue-100 text-sm">交易记录</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'browse', label: '资产浏览', icon: Battery },
              { key: 'calculator', label: '收益测算', icon: Calculator },
              { key: 'portfolio', label: '我的投资', icon: BarChart3 },
              { key: 'orders', label: '交易记录', icon: Clock },
              { key: 'dividends', label: '我的分红', icon: Gift },
              { key: 'wallet', label: '我的钱包', icon: Wallet },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center space-x-2 py-4 border-b-2 text-sm font-medium transition ${
                  activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab: Browse */}
        {activeTab === 'browse' && (
          <div>
            <h2 className="text-xl font-bold mb-6">可投资电池资产</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map(asset => (
                <div key={asset.id} className="bg-white rounded-xl border hover:shadow-lg transition">
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-xl flex items-center justify-center overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Battery className="h-16 w-16 text-blue-300" />
                    )}
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-white/80 text-blue-700">{asset.battery_type}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900">{asset.name}</h3>
                    <p className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />{asset.location} · {asset.asset_code}
                    </p>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{asset.description}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-sm">
                      <div><div className="text-gray-400">单价</div><div className="font-bold text-gray-900">{formatUSD(asset.unit_price)}</div><div className="text-xs text-gray-400">{dualCurrency(asset.unit_price).secondary}</div></div>
                      {asset.monthly_rent != null && <div><div className="text-gray-400">月租金</div><div className="font-bold text-gray-900">{formatUSD(asset.monthly_rent)}{' '}<span className="text-xs text-gray-400">/月</span></div><div className="text-xs text-gray-400">{dualCurrency(asset.monthly_rent).secondary}</div></div>}
                      <div><div className="text-gray-400">预期年化</div><div className="font-bold text-green-600 flex items-center"><TrendingUp className="h-3 w-3 mr-1" />{asset.annualized_return != null ? asset.annualized_return : asset.expected_roi}%</div></div>
                      <div><div className="text-gray-400">可购</div><div className="font-bold text-gray-900">{asset.available_units} 份</div></div>
                      <div><div className="text-gray-400">总量</div><div className="font-bold text-gray-500">{asset.total_units} 份</div></div>
                    </div>
                    <button onClick={() => setSelectedAsset(asset)} disabled={asset.available_units === 0}
                      className="w-full mt-4 btn-primary flex items-center justify-center space-x-2">
                      <ShoppingCart className="h-4 w-4" /><span>{asset.available_units > 0 ? '立即购买' : '已售罄'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Portfolio */}
        {activeTab === 'portfolio' && (
          <div>
            {/* 投资地图 — 已购买电池位置 */}
            <div className="bg-white rounded-xl border overflow-hidden mb-6">
              <div className="p-3 bg-gray-50 border-b flex items-center space-x-2">
                <MapPinned className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">已购买电池位置分布</span>
                <span className="text-xs text-gray-400 ml-2">({purchasedCount} 块电池有定位数据)</span>
              </div>
              <div ref={investMapContainerRef} className="w-full" style={{ height: '360px' }} />
            </div>
            <h2 className="text-xl font-bold mb-6">我的投资组合</h2>
            {userAssets.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无投资记录</p>
                <button onClick={() => setActiveTab('browse')} className="btn-primary">浏览资产开始投资</button>
              </div>
            ) : (
              <div className="space-y-6">
                {userAssets.map(ua => (
                  <div key={ua.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{ua.name}</h3>
                          <p className="text-sm text-gray-500">{ua.asset_code} · {ua.battery_type} · {ua.location}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">持有中</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">持有份数</div>
                          <div className="font-bold text-lg">{ua.units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">投资金额</div>
                          <div className="font-bold text-lg">${((ua.units || 0) * (ua.average_cost || ua.unit_price || 0)).toFixed(0)}</div><div className="text-xs text-gray-400">≈ ¥{(((ua.units || 0) * (ua.average_cost || ua.unit_price || 0)) * 7.25).toFixed(0)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">库存 / 总量</div>
                          <div className="font-bold text-lg">{ua.stock ?? ua.available_units ?? '-'} / {ua.total_units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">预期年化</div>
                          <div className="font-bold text-lg text-green-600">{ua.expected_roi}%</div>
                        </div>
                      </div>
                    </div>

                    {/* 电池单元明细 */}
                    {ua.battery_units && ua.battery_units.length > 0 && (
                      <div className="border-t">
                        <div className="px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600">
                          电池编号明细（{ua.battery_units.length} 块）
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="text-left p-3 font-medium text-gray-500">唯一编号</th>
                                <th className="text-left p-3 font-medium text-gray-500">运营站点</th>
                                <th className="text-center p-3 font-medium text-gray-500">电量</th>
                                <th className="text-center p-3 font-medium text-gray-500">温度</th>
                                <th className="text-center p-3 font-medium text-gray-500">GPS</th>
                                <th className="text-center p-3 font-medium text-gray-500">循环次数</th>
                                <th className="text-center p-3 font-medium text-gray-500">健康状态</th>
                                <th className="text-center p-3 font-medium text-gray-500">最后在线</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ua.battery_units.map((bu, idx) => (
                                <tr key={bu.holding_id || idx} className="border-t hover:bg-gray-50/50">
                                  <td className="p-3 font-mono font-medium text-blue-700">{bu.unit_code}</td>
                                  <td className="p-3 text-gray-600">{bu.site_name || bu.site_id || '—'}</td>
                                  <td className="p-3 text-center">
                                    <span className={`font-medium ${(bu.sensor_battery_level ?? 100) > 50 ? 'text-green-600' : (bu.sensor_battery_level ?? 100) > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {bu.sensor_battery_level ?? '—'}{bu.sensor_battery_level != null ? '%' : ''}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-gray-600">{bu.sensor_temperature != null ? `${bu.sensor_temperature}°C` : '—'}</td>
                                  <td className="p-3 text-center font-mono text-xs">
                                    {bu.sensor_longitude != null && bu.sensor_latitude != null 
                                      ? <button onClick={() => handleGPSClick(bu.sensor_longitude, bu.sensor_latitude)} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">GPS定位</button>
                                      : <span className="text-gray-400">—</span>}
                                  </td>
                                  <td className="p-3 text-center text-gray-600">{bu.sensor_cycle_count ?? '—'}</td>
                                  <td className="p-3 text-center">
                                    {(() => {
                                      const h = computeBatteryHealth(bu.sensor_battery_level, bu.sensor_temperature, bu.sensor_cycle_count);
                                      return (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          h.status === 'normal' ? 'bg-green-100 text-green-700' :
                                          h.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          {h.status === 'normal' ? '正常' : h.status === 'warning' ? '注意' : '异常'}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-3 text-center text-gray-400">
                                    {bu.sensor_last_online ? new Date(bu.sensor_last_online).toLocaleDateString('zh-CN') : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* 可投资运营电池 */}
            {operationalBatteries.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-2">可投资运营电池</h2>
                <p className="text-sm text-green-600 mb-4 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />无等待期，购买后即可参与分红
                </p>
                {opBatteriesLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center">
                    <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-500 text-sm">加载可投资电池...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-500">编号</th>
                          <th className="text-left p-3 font-medium text-gray-500">类型</th>
                          <th className="text-left p-3 font-medium text-gray-500">运营站点</th>
                          <th className="text-center p-3 font-medium text-gray-500">SOC</th>
                          <th className="text-center p-3 font-medium text-gray-500">温度</th>
                          <th className="text-center p-3 font-medium text-gray-500">健康</th>
                          <th className="text-center p-3 font-medium text-gray-500">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operationalBatteries.map((bu, idx) => {
                          const soc = bu.soc ?? bu.sensor_battery_level;
                          const temp = bu.temperature ?? bu.sensor_temperature;
                          const cycles = bu.cycle_count ?? bu.sensor_cycle_count;
                          const isPurchasing = opPurchasing === idx;
                          return (
                            <tr key={bu.id || idx} className="border-t hover:bg-gray-50/50">
                              <td className="p-3 font-mono font-medium text-blue-700">{bu.unit_code}</td>
                              <td className="p-3 text-gray-600">{bu.battery_type || '—'}</td>
                              <td className="p-3 text-gray-600">{bu.site_name || bu.site_id || '—'}</td>
                              <td className="p-3 text-center">
                                <span className={`font-medium ${soc != null && soc > 50 ? 'text-green-600' : soc != null && soc > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {soc != null ? `${soc}%` : '—'}
                                </span>
                              </td>
                              <td className="p-3 text-center text-gray-600">{temp != null ? `${temp}°C` : '—'}</td>
                              <td className="p-3 text-center">
                                {(() => {
                                  if (soc == null && temp == null && cycles == null) return <span className="text-gray-400">—</span>;
                                  let status = 'normal', color = 'bg-green-100 text-green-700';
                                  if ((soc != null && soc < 20) || (temp != null && temp > 45) || (cycles != null && cycles > 3000)) { status = 'abnormal'; color = 'bg-red-100 text-red-700'; }
                                  else if ((soc != null && soc < 50) || (temp != null && temp > 35) || (cycles != null && cycles > 2000)) { status = 'warning'; color = 'bg-yellow-100 text-yellow-700'; }
                                  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status === 'normal' ? '正常' : status === 'warning' ? '注意' : '异常'}</span>;
                                })()}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => purchaseOpBattery(bu, idx)}
                                  disabled={isPurchasing || !isVerified()}
                                  className="btn-primary text-xs px-3 py-1.5"
                                >
                                  {!isVerified() ? '需认证' : isPurchasing ? '购买中...' : '立即购买'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Orders */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-6">交易记录</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无交易记录</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">资产</th>
                      <th className="text-center p-4">数量</th>
                      <th className="text-right p-4">单价</th>
                      <th className="text-right p-4">金额</th>
                      <th className="text-right p-4">来源</th>
                      <th className="text-right p-4">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td className="p-4"><div className="font-medium">{o.asset?.name || '-'}</div><div className="text-xs text-gray-400">{o.asset?.asset_code}</div></td>
                        <td className="p-4 text-center">{o.units}</td>
                        <td className="p-4 text-right">${o.unit_price}<div className="text-xs text-gray-400">≈ ¥{((o.unit_price || 0) * 7.25).toFixed(0)}</div></td>
                        <td className="p-4 text-right font-semibold">${o.total_amount}<div className="text-xs text-gray-400">≈ ¥{((o.total_amount || 0) * 7.25).toFixed(0)}</div></td>
                        <td className="p-4 text-right">
                          {o.order_source === 'store' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{o.store?.name || '门店'}</span>
                          ) : <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">在线</span>}
                        </td>
                        <td className="p-4 text-right text-gray-400">{new Date(o.created_at).toLocaleDateString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Dividends */}
        {activeTab === 'dividends' && (
          <div>
            <h2 className="text-xl font-bold mb-6">我的分红</h2>
            {dividendsLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">加载分红数据...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="text-green-100 text-sm mb-1">本月分红</div>
                    <div className="text-3xl font-bold">${dividendsThisMonth.toFixed(2)}</div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="text-amber-100 text-sm mb-1">累计分红</div>
                    <div className="text-3xl font-bold">${dividendsTotal.toFixed(2)}</div>
                  </div>
                </div>
                {/* 分红明细 - 持有电池 */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">分红明细</h3>
                  {batteryDetailsLoading ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500 text-sm">加载电池数据...</p>
                    </div>
                  ) : batteryDetails.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <p className="text-gray-500">暂无持有电池</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-4">编号</th>
                            <th className="text-left p-4">名称</th>
                            <th className="text-left p-4">起租日期</th>
                            <th className="text-right p-4">月租金</th>
                            <th className="text-right p-4">本月分红</th>
                            <th className="text-right p-4">累计分红</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batteryDetails.map((bd, idx) => (
                            <tr key={bd.unit_code || idx} className="border-t hover:bg-gray-50">
                              <td className="p-4 font-mono text-blue-700">{bd.unit_code}</td>
                              <td className="p-4">{bd.asset_name}</td>
                              <td className="p-4 text-gray-500">{bd.rent_start ? new Date(bd.rent_start).toLocaleDateString('zh-CN') : '-'}</td>
                              <td className="p-4 text-right">${(bd.monthly_rent || 0).toFixed(2)}<div className="text-xs text-gray-400">≈ ¥{((bd.monthly_rent || 0) * 7.25).toFixed(2)}</div></td>
                              <td className="p-4 text-right font-semibold text-green-600">${(bd.this_month_dividend || 0).toFixed(2)}</td>
                              <td className="p-4 text-right font-semibold text-amber-700">${(bd.cumulative_dividend || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Wallet */}
        {activeTab === 'wallet' && (
          <div>
            <h2 className="text-xl font-bold mb-6">我的钱包</h2>
            {walletLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">加载钱包数据...</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6">
                  <div className="text-purple-100 text-sm mb-1">钱包余额</div>
                  <div className="text-4xl font-bold">${walletBalance != null ? Number(walletBalance).toFixed(2) : '0.00'}</div>
                  <div className="flex space-x-3 mt-4">
                    <button onClick={() => setShowRechargeModal(true)} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-4 py-2 text-sm font-medium transition">
                      <ArrowDownCircle className="h-4 w-4" /><span>充值</span>
                    </button>
                    <button onClick={() => setShowWithdrawModal(true)} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-4 py-2 text-sm font-medium transition">
                      <ArrowUpCircle className="h-4 w-4" /><span>提现</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-700 mb-3">资金明细</h3>
                {walletTransactions.length === 0 ? (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <Banknote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无资金记录</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4">类型</th>
                          <th className="text-right p-4">金额</th>
                          <th className="text-right p-4">说明</th>
                          <th className="text-right p-4">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="border-t hover:bg-gray-50">
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tx.type === 'deposit' ? 'bg-green-100 text-green-700' :
                                tx.type === 'withdraw' ? 'bg-red-100 text-red-700' :
                                tx.type === 'dividend' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {tx.type === 'deposit' ? '充值' :
                                 tx.type === 'withdraw' ? '提现' :
                                 tx.type === 'dividend' ? '分红' :
                                 tx.type === 'trade' ? '交易' :
                                 tx.type === 'fee' ? '手续费' : tx.type || '其他'}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-semibold ${
                              (tx.type === 'deposit' || tx.type === 'dividend') ? 'text-green-600' :
                              (tx.type === 'withdraw' || tx.type === 'fee') ? 'text-red-600' :
                              'text-gray-900'
                            }`}>
                              {tx.type === 'withdraw' || tx.type === 'fee' ? '-' : '+'}${(tx.amount || 0).toFixed(2)}<div className="text-xs text-gray-400">≈ ¥{((tx.amount || 0) * 7.25).toFixed(2)}</div>
                            </td>
                            <td className="p-4 text-right text-gray-500 max-w-xs truncate">{tx.remark || tx.typeLabel || '—'}</td>
                            <td className="p-4 text-right text-gray-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('zh-CN') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Calculator */}
        {activeTab === 'calculator' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">收益测算工具</h2>
              <p className="text-gray-500 text-sm">选择电池型号和数量，自动测算投资额、月收益与回本周期</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border p-6 space-y-5">
                <h3 className="font-bold text-lg">选择电池型号与数量</h3>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">两轮/三轮换电</div>
                  {products.filter(p => p.category === 'swap').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{formatUSD(battery.monthlyRent)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">商用车电池</div>
                  {products.filter(p => p.category === 'vehicle').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{formatUSD(battery.monthlyRent)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">工商业储能</div>
                  {products.filter(p => p.category === 'ess').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{formatUSD(battery.monthlyRent)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">集装箱储能</div>
                  {products.filter(p => p.category === 'container').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{formatUSD(battery.monthlyRent)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {Object.values(calcBatteryCounts).some(v => Number(v) > 0) && (
                  <button onClick={() => setCalcBatteryCounts({})} className="mt-2 text-xs text-red-500 hover:text-red-700">清空全部选择</button>
                )}
              </div>

              <div className="space-y-4">
                {(() => {
                  const r = getInvestCalcResult();
                  if (!r) return (
                    <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                      <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">请在左侧选择电池型号并设置数量</p>
                    </div>
                  );
                  return (
                    <>
                      <div className="bg-gradient-to-br from-green-600 to-emerald-800 text-white rounded-xl p-6">
                        <p className="text-green-100 text-sm mb-1">投资收益</p>
                        <div className="text-4xl font-bold">{formatUSD(r.investorMonthly)}<span className="text-lg font-normal text-green-200 ml-2">/月</span></div>
                        <p className="text-green-100 text-sm mt-2">投资者分成 {(r.investorRate * 100).toFixed(0)}%</p>
                      </div>
                      <div className="bg-white rounded-xl border p-6 space-y-4">
                        <h3 className="font-bold">测算明细</h3>
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <p className="font-semibold text-gray-700 text-sm mb-2">电池部署清单</p>
                          {r.details.map(d => (<div key={d.id} className="flex justify-between"><span>{d.name} × {d.count}</span><span className="text-gray-700">{formatUSD(d.invest)}</span></div>))}
                        </div>
                        <hr className="border-gray-100" />
                        {[{ label: '总投资额', value: formatUSD(r.totalInvestment), bold: true }, { label: '电池月租总额', value: formatUSD(r.totalMonthlyRent) }].map((item, i) => (
                          <div key={i} className={`flex justify-between text-sm ${item.bold ? 'font-bold text-base border-t pt-3 mt-1 border-gray-100' : ''}`}>
                            <span className="text-gray-600">{item.label}</span><span className="text-gray-900">{item.value}</span>
                          </div>
                        ))}
                        <hr className="border-gray-100" />
                        <p className="text-xs text-gray-500 font-semibold mb-1">投资者收益明细</p>
                        {[
                          { label: `投资者月收益 (${(r.investorRate * 100).toFixed(0)}%)`, value: formatUSD(r.investorMonthly), color: 'text-green-600 font-bold' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.label}</span><span className={item.color}>{item.value}</span></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-blue-600">{r.investorAnnualReturn}%</div><div className="text-xs text-gray-500 mt-1">投资者年化回报</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-green-600">{isFinite(r.investorPaybackMonths) ? (r.investorPaybackMonths < 12 ? `${r.investorPaybackMonths.toFixed(1)}月` : `${(r.investorPaybackMonths / 12).toFixed(1)}年`) : '—'}</div><div className="text-xs text-gray-500 mt-1">投资者回本周期</div></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Purchase Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">购买确认</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">{selectedAsset.name}</div>
              <div className="text-sm text-gray-600">类型: {selectedAsset.battery_type} · 单价: ${selectedAsset.unit_price}<span className="text-xs text-gray-400 ml-1">≈ ¥{((selectedAsset.unit_price || 0) * 7.25).toFixed(0)}</span></div>
              <div className="text-sm text-green-600">预期年化收益: {selectedAsset.expected_roi}%</div>
            </div>
            <div className="mb-4">
              <label className="label">购买数量</label>
              <input type="number" min="1" max={selectedAsset.available_units} value={purchaseUnits}
                onChange={e => setPurchaseUnits(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedAsset.available_units)))}
                className="input-field" />
            </div>
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between"><span>总金额</span><span className="font-bold text-primary-600">${(Number(selectedAsset.unit_price || 0) * purchaseUnits).toFixed(2)}</span><div className="text-xs text-gray-400 mt-1">≈ ¥{((Number(selectedAsset.unit_price || 0) * purchaseUnits) * 7.25).toFixed(2)}</div></div>
              {storeRef && <div className="text-xs text-gray-500 mt-1">通过门店引导下单</div>}
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setSelectedAsset(null)} className="flex-1 btn-secondary">取消</button>
              <button onClick={handlePurchase} disabled={purchasing || !isVerified()} className="flex-1 btn-primary">{purchasing ? '购买中...' : isVerified() ? '确认购买' : '需认证'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">充值</h3>
            <div className="mb-4">
              <label className="label">充值金额 ($)</label>
              <input type="number" min="1" step="0.01" value={rechargeAmount}
                onChange={e => setRechargeAmount(e.target.value)}
                placeholder="请输入充值金额"
                className="input-field" />
            </div>
            <div className="flex space-x-4">
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }} className="flex-1 btn-secondary">取消</button>
              <button onClick={handleRecharge} disabled={recharging} className="flex-1 btn-primary">
                {recharging ? '充值中...' : '确认充值'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">提现申请</h3>
            <p className="text-xs text-gray-400 mb-4">提交后由 admin 审批，预计 1-3 个工作日处理</p>
            <div className="space-y-4">
              <div>
                <label className="label">提现金额 ($)</label>
                <input type="number" min="1" step="0.01" value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder="请输入提现金额"
                  className="input-field" />
              </div>
              <div>
                <label className="label">银行卡号</label>
                <input type="text" value={withdrawForm.bank_account}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_account: e.target.value })}
                  placeholder="请输入银行卡号"
                  className="input-field" />
              </div>
              <div>
                <label className="label">开户行</label>
                <input type="text" value={withdrawForm.bank_name}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                  placeholder="请输入开户行名称"
                  className="input-field" />
              </div>
              <div>
                <label className="label">持卡人姓名</label>
                <input type="text" value={withdrawForm.bank_holder}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_holder: e.target.value })}
                  placeholder="请输入持卡人姓名"
                  className="input-field" />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawForm({ amount: '', bank_account: '', bank_name: '', bank_holder: '' }); }} className="flex-1 btn-secondary">取消</button>
              <button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 btn-primary">
                {withdrawing ? '提交中...' : '确认提现'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
