'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assetAPI, orderAPI, dividendAPI } from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, TrendingUp, Battery, ShoppingCart, DollarSign, Calendar, BarChart3, Clock, Zap, Wallet, ArrowUpCircle, ArrowDownCircle, Send, CreditCard, Banknote, Loader2, Gift, AlertTriangle, Calculator, Network, MapPinned, RefreshCw } from 'lucide-react';
import { formatCurrency, localeCurrency, fetchRates } from '../../lib/currency';
import { formatDate } from '../../lib/date-format';
import { useTranslation } from 'react-i18next';

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

const BATTERY_CATEGORY_SVGS = {
  swap:     { bg: '#f97316', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="6" y1="12" x2="14" y2="12"/><polyline points="19 13 19 16 22 16"/><polyline points="22 11 19 8 19 11"/></svg>' },
  vehicle:  { bg: '#3b82f6', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="6" y1="12" x2="18" y2="12"/><polyline points="4 8 2 12 4 16"/><polyline points="20 8 22 12 20 16"/></svg>' },
  ess:      { bg: '#7c3aed', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="22" height="16" rx="3"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="20" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>' },
  container:{ bg: '#ef4444', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/></svg>' },
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


function resolveI18n(obj, i18nKey, fallback, i18n) {
  const i18nData = obj?.[i18nKey];
  if (!i18nData || typeof i18nData !== 'object') return fallback;
  return i18nData[i18n.language] || i18nData['zh-CN'] || fallback;
}

function InvestPageContent() {
  const { t, i18n } = useTranslation();
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

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

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
      alert(t('invest.alert.verifyFirst'));
      return;
    }
    setOpPurchasing(index);
    try {
      const orderResult = await orderAPI.createOrder({
        asset_id: batteryUnit.battery_asset_id, units: 1
      });
      alert(t('invest.alert.purchaseSuccess', { id: orderResult.order_id || orderResult.order?.order_id || orderResult.id }));
      setOperationalBatteries(prev => prev.filter((_, i) => i !== index));
      loadData();
    } catch (e) {
      alert(e.message || t('invest.alert.purchaseFailed'));
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
        console.error(t('invest.alert.opBatteryFailed'), e);
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
  // ─── 平台回购 (trade) ──────────────
  const [myUnits, setMyUnits] = useState([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [previewMap, setPreviewMap] = useState({});
  const [selling, setSelling] = useState(false);
  const [sellMsg, setSellMsg] = useState('');
  const [sellSuccess, setSellSuccess] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(true);

const getTxRemark = (tx, t, i18n) => {
  // 优先使用 DB 中的 remark_i18n（多语言），其次 remark（纯文本），否则基于 type 做 i18n
  if (tx.remark_i18n) return resolveI18n(tx, 'remark_i18n', tx.remark, i18n);
  if (tx.remark) return tx.remark;
  const typeMap = {
    deposit: t('wallet.typeDeposit'),
    withdraw: t('wallet.typeWithdraw'),
    dividend: t('wallet.typeDividend'),
    trade: t('wallet.typeTrade'),
    fee: t('wallet.typeFee'),
  };
  return typeMap[tx.type] || tx.typeLabel || '—';
};

const getPenaltyTierDisplay = (tier, t) => {
  const tierMap = {
    '12个月内（罚60%）': t('trade.penaltyTier.tier1'),
    '13-24个月（罚40%）': t('trade.penaltyTier.tier2'),
    '25-36个月（罚20%）': t('trade.penaltyTier.tier3'),
    '36个月以上（不罚）': t('trade.penaltyTier.tier4'),
  };
  return tierMap[tier] || tier;
};



  const products = batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS;

  const getBatteryTypeDisplay = (batteryType) => {
    if (!batteryType) return '—';
    const bt = batteryTypes.find(b => (b.id && b.id === batteryType) || b.name === batteryType || b.id === batteryType);
    if (bt) return bt.resolved_name || bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || batteryType;
    return batteryType;
  };

  useEffect(() => {
    fetch(`/api/battery-types?locale=${i18n.language}`)
      .then(r => r.json())
      .then(data => {
        if (data.battery_types) {
          const mapped = data.battery_types.map(bt => {
            const price = (typeof bt.unit_price === 'string' ? parseFloat(bt.unit_price) : bt.unit_price) || 0;
            const rent = (typeof bt.monthly_rent === 'string' ? parseFloat(bt.monthly_rent) : bt.monthly_rent) || 0;
            // 使用 API 解析后的多语言值
            const displayName = bt.resolved_name || bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name;
            const displayScenario = bt.resolved_scenario || bt.scenario_i18n?.[i18n.language] || bt.scenario_i18n?.['zh-CN'] || bt.scenario || '';
            let category = 'swap';
            const nameLower = (displayName || '').toLowerCase();
            if (nameLower.includes('集装箱') || nameLower.includes('container')) category = 'container';
            else if (nameLower.includes('工商业') || nameLower.includes('ess') || nameLower.includes('储能柜') || nameLower.includes('液冷柜') || nameLower.includes('风冷柜')) category = 'ess';
            else if (nameLower.includes('物流') || nameLower.includes('中巴') || nameLower.includes('大巴') || nameLower.includes('客车') || nameLower.includes('货车')) category = 'vehicle';
            return {
              id: bt.name,
              name: bt.name,
              name_i18n: bt.name_i18n,
              displayName: displayName,
              price: price,
              monthlyRent: rent,
              category: category,
              scene: bt.scenario || '',
              displayScene: displayScenario,
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
  }, [i18n.language]);

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
      details.push({ id: battery.id, name: battery.name, displayName: battery.displayName || battery.name, count, unitPrice: battery.price, invest, monthlyRent: battery.monthlyRent, totalRent: rent });
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

  useEffect(() => {
    if (user) loadData();
  }, [i18n.language]);

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
        assetAPI.getAssets(i18n.language),
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
      alert(t('invest.alert.purchaseSuccess', { id: orderResult.order_id }));
      setSelectedAsset(null);
      setPurchaseUnits(1);
      loadData();
    } catch (err) {
      const msg = err.message || t('invest.alert.purchaseFailed');
      alert(msg === 'Insufficient balance' ? t('invest.alert.insufficientBalance') : msg);
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
          const iconCfg = BATTERY_CATEGORY_SVGS[category] || BATTERY_CATEGORY_SVGS.swap;
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
      console.log('[loadWallet] profileRes.ok:', profileRes.ok, 'wallet.balance:', profileData.wallet?.balance, '_serverTime:', profileData._serverTime, '_version:', profileData._version);
      if (profileRes.ok && profileData.wallet) {
        setWalletBalance(profileData.wallet.balance);
      } else if (!profileRes.ok) {
        console.error('[loadWallet] profile API failed:', profileRes.status);
      }
      const txData = await txRes.json();
      if (txRes.ok) {
        setWalletTransactions(txData.transactions || txData.records || []);
      } else {
        console.error('[loadWallet] transactions API failed:', txRes.status);
      }
    } catch (e) { console.error('[loadWallet] error:', e); }
    finally { setWalletLoading(false); }
  };

  // 仅刷新交易明细（充值后调用，余额已由 POST 响应直接更新）
  const loadWalletTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('[loadWalletTransactions] fetching...');
      const txRes = await fetch('/api/wallet/transactions', { headers });
      const txData = await txRes.json();
      console.log('[loadWalletTransactions] response:', txRes.status, 'records:', txData.transactions?.length || txData.records?.length || 0);
      if (txRes.ok) {
        const txs = txData.transactions || txData.records || [];
        console.log('[loadWalletTransactions] setting', txs.length, 'transactions, first:', txs[0]?.txNo, txs[0]?.type, txs[0]?.amount);
        console.log('[loadWalletTransactions] ALL amounts:', txs.map(t => t.amount).join(','));
        setWalletTransactions(txs);
      } else {
        console.error('[loadWalletTransactions] API failed:', txRes.status, txData);
      }
    } catch (e) { console.error('[loadWalletTransactions] error:', e); }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) { alert(t('invest.alert.invalidAmount')); return; }
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
        const result = await res.json();
        console.log('[Recharge] POST response:', result);
        console.log('[Recharge] tx_no:', result.tx_no, '_api_version:', result._api_version);
        console.log('[Recharge] _verify_found:', result._verify_found, '_top_tx:', result._top_tx, '_top_amount:', result._top_amount);
        console.log('[Recharge] result.balance:', result.balance, 'type:', typeof result.balance);
        // 立即用 POST 响应中的最新余额更新 UI，不依赖后续 API 调用
        if (result.balance != null) {
          const newBal = Number(result.balance);
          console.log('[Recharge] setting walletBalance to:', newBal);
          setWalletBalance(newBal);
          console.log('[Recharge] setWalletBalance called, checking after microtask...');
          setTimeout(() => {
            console.log('[Recharge] DEBUG: current page version = 2026-07-07-v5');
            console.log('[Recharge] If you see this, the new code IS deployed. If not, Vercel is serving old code.');
          }, 100);
        } else {
          console.warn('[Recharge] result.balance is null/undefined, falling back to GET profile');
          loadWallet();
        }
        setShowRechargeModal(false);
        setRechargeAmount('');
        alert(t('invest.alert.rechargeSuccess'));
        console.log('[Recharge] POST done, scheduling loadWalletTransactions in 300ms...');
        // 延迟 300ms 后重试 2 次，确保 Supabase 事务已提交
        setTimeout(() => {
          console.log('[Recharge] calling loadWalletTransactions (1st attempt)');
          loadWalletTransactions().then(() => {
            // 2 秒后再重试一次作为兜底
            setTimeout(() => {
              console.log('[Recharge] calling loadWalletTransactions (2nd attempt)');
              loadWalletTransactions();
            }, 2000);
          });
        }, 300);
      } else {
        const err = await res.json();
        alert(err.error || t('invest.alert.rechargeFailed'));
      }
    } catch (e) { alert(t('invest.alert.rechargeFailed')); }
    finally { setRecharging(false); }
  };

  const handleWithdraw = async () => {
    const { amount, bank_account, bank_name, bank_holder } = withdrawForm;
    if (!amount || parseFloat(amount) <= 0) { alert(t('invest.alert.invalidWithdrawAmount')); return; }
    const missing = [];
    if (!bank_account) missing.push(t('invest.withdraw.bankAccount'));
    if (!bank_name) missing.push(t('invest.withdraw.bankName'));
    if (!bank_holder) missing.push(t('invest.withdraw.bankHolder'));
    if (missing.length > 0) { alert(t('invest.alert.fillFields', { fields: missing.join('、') })); return; }
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
        alert(t('invest.alert.withdrawSuccess'));
        setShowWithdrawModal(false);
        setWithdrawForm({ amount: '', bank_account: '', bank_name: '', account_holder: '' });
        await loadWallet();
      } else {
        const err = await res.json();
        alert(err.error || t('invest.alert.withdrawFailed'));
      }
    } catch (e) { alert(t('invest.alert.withdrawFailed')); }
    finally { setWithdrawing(false); }
  };

  // ─── 平台回购 (trade) ──────────────
  const loadMyUnits = async () => {
    setTradeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const listRes = await fetch('/api/trades/sell-to-platform?list=1', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (listRes.ok) {
        const json = await listRes.json();
        setMyUnits(json.units || []);
      }
    } catch (e) { console.error('Load my units error:', e); }
    finally { setTradeLoading(false); }
  };

  const fetchPreview = async (unitId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/trades/sell-to-platform?unitId=${unitId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setPreviewMap(prev => ({ ...prev, [unitId]: json }));
      }
    } catch (e) { /* ignore */ }
  };

  const toggleUnitSelection = (unitId) => {
    setSelectedUnitIds(prev => {
      const isAdding = !prev.includes(unitId);
      const next = isAdding ? [...prev, unitId] : prev.filter(id => id !== unitId);
      if (isAdding) fetchPreview(unitId);
      if (!isAdding) {
        setPreviewMap(p => { const { [unitId]: _, ...rest } = p; return rest; });
      }
      return next;
    });
  };

  const handleSellToPlatform = async () => {
    if (selectedUnitIds.length === 0) { setSellMsg(t('trade.selectFirst')); setSellSuccess(false); return; }
    setSelling(true); setSellMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/trades/sell-to-platform', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: selectedUnitIds }),
      });
      const json = await res.json();
      if (!res.ok) { setSellMsg(json.error || t('trade.sellFailed')); setSellSuccess(false); return; }
      setSellSuccess(true);
      setSellMsg(t('trade.sellSuccess', { total: json.totalBuyback.toFixed(2), totalCny: (json.totalBuyback * 7.25).toFixed(2), balance: json.newBalance.toFixed(2), balanceCny: (json.newBalance * 7.25).toFixed(2) }));
      setSelectedUnitIds([]);
      setPreviewMap({});
      loadMyUnits();
    } catch (e) { setSellSuccess(false); setSellMsg(t('trade.sellFailed')); }
    finally { setSelling(false); }
  };

  useEffect(() => {
    if (activeTab === 'trade') loadMyUnits();
  }, [activeTab]);


  const totalInvested = userAssets.reduce((s, ua) => s + (ua.total_invested || 0), 0);
  const activeCount = userAssets.filter(ua => (ua.units || 0) > 0).length;
  const purchasedCount = userAssets.reduce((count, ua) => {
    return count + (ua.battery_units || []).filter(bu => bu.sensor_longitude != null && bu.sensor_latitude != null).length;
  }, 0);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">{t('invest.header.title')}</h1>
          <p className="text-blue-100 mt-2">{t('invest.header.subtitle')}</p>
          {storeRef && <div className="mt-3 bg-white/20 backdrop-blur rounded-lg px-4 py-2 inline-block text-sm">{t('invest.header.storeRefBadge')}</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{formatCurrency(totalInvested, i18n.language)}</div><div className="text-blue-100 text-sm">{t('invest.header.totalInvest')}</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{formatCurrency(dividendsTotal, i18n.language)}</div><div className="text-blue-100 text-sm">{t('invest.header.totalDividends')}</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{activeCount}</div><div className="text-blue-100 text-sm">{t('invest.header.activeAssets')}</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{orders.length}</div><div className="text-blue-100 text-sm">{t('invest.header.orderCount')}</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'browse', label: t('invest.tabs.browse'), icon: Battery },
              { key: 'calculator', label: t('invest.tabs.calculator'), icon: Calculator },
              { key: 'portfolio', label: t('invest.tabs.portfolio'), icon: BarChart3 },
              { key: 'trade', label: t('invest.tabs.trade'), icon: RefreshCw },
              { key: 'orders', label: t('invest.tabs.orders'), icon: Clock },
              { key: 'dividends', label: t('invest.tabs.dividends'), icon: Gift },
              { key: 'wallet', label: t('invest.tabs.wallet'), icon: Wallet },
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
            <h2 className="text-xl font-bold mb-6">{t('invest.browse.title')}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map(asset => (
                <div key={asset.id} className="bg-white rounded-xl border hover:shadow-lg transition">
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-xl flex items-center justify-center overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Battery className="h-16 w-16 text-blue-300" />
                    )}
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-white/80 text-blue-700">{asset.resolved_battery_type || getBatteryTypeDisplay(asset.battery_type)}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900">{asset.resolved_name || asset.name}</h3>
                    <p className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />{resolveI18n(asset, 'location_i18n', asset.location, i18n)} · {asset.asset_code}
                    </p>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{asset.resolved_description || asset.description}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-sm">
                      <div><div className="text-gray-400">{t('invest.browse.unitPrice')}</div><div className="font-bold text-gray-900">{formatCurrency(asset.unit_price, i18n.language)}</div></div>
                      {asset.monthly_rent != null && <div><div className="text-gray-400">{t('invest.browse.monthlyRent')}</div><div className="font-bold text-gray-900">{formatCurrency(asset.monthly_rent, i18n.language)}{' '}<span className="text-xs text-gray-400">{t('invest.calculator.perMonth')}</span></div></div>}
                      <div><div className="text-gray-400">{t('invest.browse.annualReturn')}</div><div className="font-bold text-green-600 flex items-center"><TrendingUp className="h-3 w-3 mr-1" />{asset.annualized_return != null ? asset.annualized_return : asset.expected_roi}%</div></div>
                      <div><div className="text-gray-400">{t('invest.browse.available')}</div><div className="font-bold text-gray-900">{asset.available_units}{t('invest.browse.units')}</div></div>
                      <div><div className="text-gray-400">{t('invest.browse.total')}</div><div className="font-bold text-gray-500">{asset.total_units}{t('invest.browse.units')}</div></div>
                    </div>
                    <button onClick={() => setSelectedAsset(asset)} disabled={asset.available_units === 0}
                      className="w-full mt-4 btn-primary flex items-center justify-center space-x-2">
                      <ShoppingCart className="h-4 w-4" /><span>{asset.available_units > 0 ? t('invest.browse.buyNow') : t('invest.browse.soldOut')}</span>
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
                <span className="text-sm font-semibold text-gray-700">{t('invest.portfolio.mapTitle')}</span>
                <span className="text-xs text-gray-400 ml-2">{t('invest.portfolio.mapHint', { count: purchasedCount })}</span>
              </div>
              <div ref={investMapContainerRef} className="w-full" style={{ height: '360px' }} />
            </div>
            <h2 className="text-xl font-bold mb-6">{t('invest.myPortfolio')}</h2>
            {userAssets.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('invest.portfolio.empty')}</p>
                <button onClick={() => setActiveTab('browse')} className="btn-primary">{t('invest.portfolio.browseToInvest')}</button>
              </div>
            ) : (
              <div className="space-y-6">
                {userAssets.map(ua => (
                  <div key={ua.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{resolveI18n(ua, 'name_i18n', ua.name, i18n)}</h3>
                          <p className="text-sm text-gray-500">{ua.asset_code} · {ua.resolved_battery_type || getBatteryTypeDisplay(ua.battery_type)} · {resolveI18n(ua, 'location_i18n', ua.location, i18n)}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t('invest.portfolio.holding')}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">{t('invest.portfolio.holdingUnits', { count: ua.units })}</div>
                          <div className="font-bold text-lg">{ua.units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">{t('invest.investAmount')}</div>
                          <div className="font-bold text-lg">{formatCurrency((ua.units || 0) * (ua.average_cost || ua.unit_price || 0), i18n.language)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">{t('invest.portfolio.stockTotal')}</div>
                          <div className="font-bold text-lg">{ua.stock ?? ua.available_units ?? '-'} / {ua.total_units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">{t('invest.browse.annualReturn')}</div>
                          <div className="font-bold text-lg text-green-600">{ua.expected_roi}%</div>
                        </div>
                      </div>
                    </div>

                    {/* 电池单元明细 */}
                    {ua.battery_units && ua.battery_units.length > 0 && (
                      <div className="border-t">
                        <div className="px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600">
                          {t('invest.portfolio.batteryUnitDetail', { count: ua.battery_units.length })}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="text-left p-3 font-medium text-gray-500">{t('invest.portfolio.unitCode')}</th>
                                <th className="text-left p-3 font-medium text-gray-500">{t('invest.portfolio.siteName')}</th>
                                <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.batteryLevel')}</th>
                                <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.temperature')}</th>
                                <th className="text-center p-3 font-medium text-gray-500">GPS</th>
                                <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.cycles')}</th>
                                <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.health')}</th>
                                <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.lastOnline')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ua.battery_units.map((bu, idx) => (
                                <tr key={bu.holding_id || idx} className="border-t hover:bg-gray-50/50">
                                  <td className="p-3 font-mono font-medium text-blue-700">{bu.unit_code}</td>
                                  <td className="p-3 text-gray-600">{resolveI18n(bu, 'name_i18n', bu.site_name, i18n) || bu.site_id || '—'}</td>
                                  <td className="p-3 text-center">
                                    <span className={`font-medium ${(bu.sensor_battery_level ?? 100) > 50 ? 'text-green-600' : (bu.sensor_battery_level ?? 100) > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {bu.sensor_battery_level ?? '—'}{bu.sensor_battery_level != null ? '%' : ''}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-gray-600">{bu.sensor_temperature != null ? `${bu.sensor_temperature}°C` : '—'}</td>
                                  <td className="p-3 text-center font-mono text-xs">
                                    {bu.sensor_longitude != null && bu.sensor_latitude != null 
                                      ? <button onClick={() => handleGPSClick(bu.sensor_longitude, bu.sensor_latitude)} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{t('invest.portfolio.gps')}</button>
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
                                          {h.status === 'normal' ? t('invest.portfolio.healthNormal') : h.status === 'warning' ? t('invest.portfolio.healthWarning') : t('invest.portfolio.healthAbnormal')}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-3 text-center text-gray-400">
                                    {bu.sensor_last_online ? formatDate(bu.sensor_last_online, i18n.language) : '—'}
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
                <h2 className="text-xl font-bold mb-2">{t('invest.portfolio.opBatteries')}</h2>
                <p className="text-sm text-green-600 mb-4 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />{t('invest.portfolio.opBatteriesHint')}
                </p>
                {opBatteriesLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center">
                    <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-500 text-sm">{t('invest.portfolio.loadingOpBatteries')}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-500">{t('invest.portfolio.number')}</th>
                          <th className="text-left p-3 font-medium text-gray-500">{t('invest.portfolio.type')}</th>
                          <th className="text-left p-3 font-medium text-gray-500">{t('invest.portfolio.siteName')}</th>
                          <th className="text-center p-3 font-medium text-gray-500">SOC</th>
                          <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.temperature')}</th>
                          <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.health')}</th>
                          <th className="text-center p-3 font-medium text-gray-500">{t('invest.portfolio.action')}</th>
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
                              <td className="p-3 text-gray-600">{getBatteryTypeDisplay(bu.battery_type) || '—'}</td>
                              <td className="p-3 text-gray-600">{resolveI18n(bu, 'name_i18n', bu.site_name, i18n) || bu.site_id || '—'}</td>
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
                                  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status === 'normal' ? t('invest.portfolio.healthNormal') : status === 'warning' ? t('invest.portfolio.healthWarning') : t('invest.portfolio.healthAbnormal')}</span>;
                                })()}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => purchaseOpBattery(bu, idx)}
                                  disabled={isPurchasing || !isVerified()}
                                  className="btn-primary text-xs px-3 py-1.5"
                                >
                                  {!isVerified() ? t('invest.portfolio.needVerify') : isPurchasing ? t('invest.portfolio.purchasing') : t('invest.portfolio.buyNow')}
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


        {/* Tab: Calculator */}
        {activeTab === 'calculator' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('invest.calculator.title')}</h2>
              <p className="text-gray-500 text-sm">{t('invest.calculator.subtitle')}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border p-6 space-y-5">
                <h3 className="font-bold text-lg">{t('invest.calculator.selectModels')}</h3>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">{t('invest.calculator.catSwap')}</div>
                  {products.filter(p => p.category === 'swap').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('invest.calculator.perUnit')} · {t('invest.calculator.monthlyRentLabel')}{formatCurrency(battery.monthlyRent, i18n.language)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('invest.calculator.catVehicle')}</div>
                  {products.filter(p => p.category === 'vehicle').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('invest.calculator.perUnit')} · {t('invest.calculator.monthlyRentLabel')}{formatCurrency(battery.monthlyRent, i18n.language)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('invest.calculator.catEss')}</div>
                  {products.filter(p => p.category === 'ess').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('invest.calculator.perUnit')} · {t('invest.calculator.monthlyRentLabel')}{formatCurrency(battery.monthlyRent, i18n.language)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                        <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                        <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('invest.calculator.catContainer')}</div>
                  {products.filter(p => p.category === 'container').map(battery => (
                    <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('invest.calculator.perUnit')} · {t('invest.calculator.monthlyRentLabel')}{formatCurrency(battery.monthlyRent, i18n.language)}</div>
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
                  <button onClick={() => setCalcBatteryCounts({})} className="mt-2 text-xs text-red-500 hover:text-red-700">{t('invest.calculator.clearAll')}</button>
                )}
              </div>

              <div className="space-y-4">
                {(() => {
                  const r = getInvestCalcResult();
                  if (!r) return (
                    <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                      <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{t('invest.calculator.emptyHint')}</p>
                    </div>
                  );
                  return (
                    <>
                      <div className="bg-gradient-to-br from-green-600 to-emerald-800 text-white rounded-xl p-6">
                        <p className="text-green-100 text-sm mb-1">{t('invest.calculator.investIncome')}</p>
                        <div className="text-4xl font-bold">{formatCurrency(r.investorMonthly, i18n.language)}<span className="text-lg font-normal text-green-200 ml-2">{t('invest.calculator.perMonth')}</span></div>
                        <p className="text-green-100 text-sm mt-2">{t('invest.calculator.investorShare', { pct: (r.investorRate * 100).toFixed(0) })}</p>
                      </div>
                      <div className="bg-white rounded-xl border p-6 space-y-4">
                        <h3 className="font-bold">{t('invest.calculator.details')}</h3>
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <p className="font-semibold text-gray-700 text-sm mb-2">{t('invest.calculator.deployList')}</p>
                          {r.details.map(d => (<div key={d.id} className="flex justify-between"><span>{d.displayName || d.name} × {d.count}</span><span className="text-gray-700">{formatCurrency(d.invest, i18n.language)}</span></div>))}
                        </div>
                        <hr className="border-gray-100" />
                        {[{ label: t('invest.calculator.totalInvestment'), value: formatCurrency(r.totalInvestment, i18n.language), bold: true }, { label: t('invest.calculator.totalMonthlyRent'), value: formatCurrency(r.totalMonthlyRent, i18n.language) }].map((item, i) => (
                          <div key={i} className={`flex justify-between text-sm ${item.bold ? 'font-bold text-base border-t pt-3 mt-1 border-gray-100' : ''}`}>
                            <span className="text-gray-600">{item.label}</span><span className="text-gray-900">{item.value}</span>
                          </div>
                        ))}
                        <hr className="border-gray-100" />
                        <p className="text-xs text-gray-500 font-semibold mb-1">{t('invest.calculator.investorDetails')}</p>
                        {[
                          { label: t('invest.calculator.investorMonthlyEarnings', { pct: (r.investorRate * 100).toFixed(0) }), value: formatCurrency(r.investorMonthly, i18n.language), color: 'text-green-600 font-bold' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.label}</span><span className={item.color}>{item.value}</span></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-blue-600">{r.investorAnnualReturn}%</div><div className="text-xs text-gray-500 mt-1">{t('invest.calculator.annualReturn')}</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-green-600">{isFinite(r.investorPaybackMonths) ? (r.investorPaybackMonths < 12 ? `${r.investorPaybackMonths.toFixed(1)}${t('invest.calculator.months')}` : `${(r.investorPaybackMonths / 12).toFixed(1)}${t('invest.calculator.years')}`) : '—'}</div><div className="text-xs text-gray-500 mt-1">{t('invest.calculator.paybackPeriod')}</div></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}


        {/* Tab: Trade (平台回购) */}
        {activeTab === 'trade' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">{t('trade.title')}</h1>
            {tradeLoading ? (
              <div className="text-center py-12 text-gray-500">{t('trade.loading')}</div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{t('trade.myUnits')}</h2>
                    <button onClick={loadMyUnits} className="p-1 text-gray-400 hover:text-gray-600"><RefreshCw className="h-4 w-4" /></button>
                  </div>
                  {myUnits.length === 0
                    ? <div className="text-sm text-gray-400 text-center py-8">{t('trade.noUnits')}</div>
                    : <div className="space-y-2 max-h-96 overflow-y-auto">
                        {myUnits.map(unit => (
                          <div key={unit.id} onClick={() => toggleUnitSelection(unit.id)}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedUnitIds.includes(unit.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" checked={selectedUnitIds.includes(unit.id)} readOnly className="h-4 w-4" />
                                <Battery className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-sm">{unit.unit_code || unit.id?.slice(0, 8)}</span>
                              </div>
                              <span className="text-xs text-gray-500">{resolveI18n(unit, 'asset_name_i18n', unit.asset_name, i18n)}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{t('trade.purchasePrice')}: {formatCurrency(Number(unit.unit_price || 1000), i18n.language)}</div>
                          </div>))}
                      </div>}
                  {selectedUnitIds.length > 0 && (() => {
                    const selectedPreviews = selectedUnitIds.map(id => previewMap[id]).filter(Boolean);
                    const totalBuyback = selectedPreviews.reduce((sum, p) => sum + (p.buybackPrice || 0), 0);
                    return (
                      <button onClick={handleSellToPlatform} disabled={selling}
                        className="mt-4 w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                        {selling ? t('trade.processing') : `${t('trade.sellBtn')} ${selectedUnitIds.length} ${t('trade.unitsToPlatform')} — ${t('trade.total')} ${formatCurrency(totalBuyback, i18n.language)}`}
                      </button>
                    );
                  })()}
                  {sellMsg && (
                    <div className={`mt-3 p-2 rounded text-sm ${sellSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{sellMsg}</div>
                  )}
                </div>

                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />{t('trade.preview')}</h2>
                  {(() => {
                    const selectedPreviews = selectedUnitIds.map(id => previewMap[id]).filter(Boolean);
                    const totalBuyback = selectedPreviews.reduce((sum, p) => sum + (p.buybackPrice || 0), 0);
                    if (selectedPreviews.length === 0) return <div className="text-sm text-gray-400 text-center py-12">{t('trade.previewHint')}</div>;
                    return (
                      <div className="space-y-3">
                        {selectedPreviews.map((p, i) => {
                          const unit = myUnits.find(u => u.id === selectedUnitIds[i]);
                          return (
                            <div key={selectedUnitIds[i]} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
                                <span className="font-medium text-gray-700">{unit?.unit_code || selectedUnitIds[i]?.slice(0, 10)}</span>
                                <span className={`px-2 py-0.5 rounded-full font-medium ${p.penaltyRate > 30 ? 'bg-red-100 text-red-700' : p.penaltyRate > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {getPenaltyTierDisplay(p.tier, t)}
                                </span>
                              </div>
                              <div className="p-3 space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">{t('trade.purchasePrice')}</span><span className="font-medium">{formatCurrency(p.purchasePrice, i18n.language)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">{t('trade.holding')}</span><span className="font-medium">{p.monthsHeld?.toFixed(1)} {t('trade.months')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">{t('trade.residual')}</span><span className="font-medium">{formatCurrency(p.residualValue, i18n.language)} ({p.residualRate}%)</span></div>
                                {p.penaltyRate > 0 && (
                                  <div className="flex justify-between"><span className="text-red-500">{t('trade.penalty')} ({p.penaltyRate}%)</span><span className="font-medium text-red-500">-{formatCurrency(p.penaltyAmount, i18n.language)}</span></div>
                                )}
                                <div className="border-t pt-1.5 flex justify-between">
                                  <span className="font-medium text-primary-900">{t('trade.buybackPrice')}</span>
                                  <span className="font-bold text-primary-700">{formatCurrency(p.buybackPrice, i18n.language)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-primary-600">{t('trade.selectedUnits', { count: selectedPreviews.length })}</span>
                            <span className="text-2xl font-bold text-primary-700">{formatCurrency(totalBuyback, i18n.language)}</span>
                          </div>
                          
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Orders */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t('invest.tabs.orders')}</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('invest.orders.empty')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">{t('invest.orders.asset')}</th>
                      <th className="text-center p-4">{t('invest.orders.units')}</th>
                      <th className="text-right p-4">{t('invest.orders.unitPrice')}</th>
                      <th className="text-right p-4">{t('invest.orders.amount')}</th>
                      <th className="text-right p-4">{t('invest.orders.source')}</th>
                      <th className="text-right p-4">{t('invest.orders.time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td className="p-4"><div className="font-medium">{resolveI18n(o.asset, 'name_i18n', o.asset?.name, i18n) || '-'}</div><div className="text-xs text-gray-400">{o.asset?.asset_code}</div></td>
                        <td className="p-4 text-center">{o.units}</td>
                        <td className="p-4 text-right">{formatCurrency(o.unit_price || 0, i18n.language)}</td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(o.total_amount || 0, i18n.language)}</td>
                        <td className="p-4 text-right">
                          {o.order_source === 'platform' ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">{t('invest.orders.platform')}</span>
                          ) : o.order_source === 'store' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{o.store?.name || t('invest.orders.store')}</span>
                          ) : <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{t('invest.orders.online')}</span>}
                        </td>
                        <td className="p-4 text-right text-gray-400">{formatDate(o.created_at, i18n.language)}</td>
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
            <h2 className="text-xl font-bold mb-6">{t('invest.tabs.dividends')}</h2>
            {dividendsLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">{t('invest.dividends.loading')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="text-green-100 text-sm mb-1">{t('invest.dividends.thisMonth')}</div>
                    <div className="text-3xl font-bold">{formatCurrency(dividendsThisMonth, i18n.language)}</div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="text-amber-100 text-sm mb-1">{t('invest.dividends.totalDividends')}</div>
                    <div className="text-3xl font-bold">{formatCurrency(dividendsTotal, i18n.language)}</div>
                  </div>
                </div>
                {/* Dividend details - holdings */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">{t('invest.dividends.details')}</h3>
                  {batteryDetailsLoading ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500 text-sm">{t('invest.dividends.loadingBatteries')}</p>
                    </div>
                  ) : batteryDetails.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <p className="text-gray-500">{t('invest.dividends.noBatteries')}</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-4">{t('invest.dividends.unitCode')}</th>
                            <th className="text-left p-4">{t('invest.dividends.name')}</th>
                            <th className="text-left p-4">{t('invest.dividends.rentStart')}</th>
                            <th className="text-right p-4">{t('invest.dividends.monthlyRent')}</th>
                            <th className="text-right p-4">{t('invest.dividends.thisMonth')}</th>
                            <th className="text-right p-4">{t('invest.dividends.totalDividends')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batteryDetails.map((bd, idx) => (
                            <tr key={bd.unit_code || idx} className="border-t hover:bg-gray-50">
                              <td className="p-4 font-mono text-blue-700">{bd.unit_code}</td>
                              <td className="p-4">{resolveI18n(bd, 'name_i18n', bd.asset_name, i18n)}</td>
                              <td className="p-4 text-gray-500">{bd.rent_start ? formatDate(bd.rent_start, i18n.language) : '-'}</td>
                              <td className="p-4 text-right">{formatCurrency(bd.monthly_rent || 0, i18n.language)}</td>
                              <td className="p-4 text-right font-semibold text-green-600">{formatCurrency(bd.this_month_dividend || 0, i18n.language)}</td>
                              <td className="p-4 text-right font-semibold text-amber-700">{formatCurrency(bd.cumulative_dividend || 0, i18n.language)}</td>
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
            <h2 className="text-xl font-bold mb-6">{t('invest.wallet.myWallet')}</h2>
            {walletLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">{t('invest.wallet.loading')}</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6">
                  <div className="text-purple-100 text-sm mb-1">{t('invest.wallet.balance')}</div>
                  <div className="text-4xl font-bold">{walletBalance != null ? formatCurrency(Number(walletBalance), i18n.language) : formatCurrency(0, i18n.language)}</div>
                  <div className="flex space-x-3 mt-4">
                    <button onClick={() => setShowRechargeModal(true)} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-4 py-2 text-sm font-medium transition">
                      <ArrowDownCircle className="h-4 w-4" /><span>{t('invest.wallet.rechargeBtn')}</span>
                    </button>
                    <button onClick={() => setShowWithdrawModal(true)} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-4 py-2 text-sm font-medium transition">
                      <ArrowUpCircle className="h-4 w-4" /><span>{t('invest.wallet.withdrawBtn')}</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-700 mb-3">{t('invest.wallet.details')}</h3>
                {walletTransactions.length === 0 ? (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <Banknote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{t('invest.wallet.empty')}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4">{t('invest.portfolio.type')}</th>
                          <th className="text-right p-4">{t('invest.orders.amount')}</th>
                          <th className="text-right p-4">{t('invest.wallet.remark')}</th>
                          <th className="text-right p-4">{t('invest.orders.time')}</th>
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
                                {tx.type === 'deposit' ? t('invest.wallet.txDeposit') :
                                 tx.type === 'withdraw' ? t('invest.wallet.txWithdraw') :
                                 tx.type === 'dividend' ? t('invest.wallet.txDividend') :
                                 tx.type === 'trade' ? t('invest.wallet.txTrade') :
                                 tx.type === 'fee' ? t('invest.wallet.txFee') : tx.type || t('invest.wallet.txOther')}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-semibold ${
                              (tx.type === 'deposit' || tx.type === 'dividend') ? 'text-green-600' :
                              (tx.type === 'withdraw' || tx.type === 'fee') ? 'text-red-600' :
                              'text-gray-900'
                            }`}>
                              {tx.type === 'withdraw' || tx.type === 'fee' ? '-' : '+'}{formatCurrency(tx.amount || 0, i18n.language)}
                            </td>
                            <td className="p-4 text-right text-gray-500 max-w-xs truncate">{getTxRemark(tx, t, i18n)}</td>
                            <td className="p-4 text-right text-gray-400">{tx.createdAt ? formatDate(tx.createdAt, i18n.language) : '—'}</td>
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
      </div>

        {/* Purchase Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{t('invest.purchase.title')}</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">{selectedAsset.name}</div>
              <div className="text-sm text-gray-600">{t('invest.common.type')}: {getBatteryTypeDisplay(selectedAsset.battery_type)} · {t('invest.common.unitPrice')}: {formatCurrency(selectedAsset.unit_price || 0, i18n.language)}<span className="text-xs text-gray-400 ml-1"></span></div>
              <div className="text-sm text-green-600">{t('invest.browse.annualReturn')}: {selectedAsset.expected_roi}%</div>
            </div>
            <div className="mb-4">
              <label className="label">{t('invest.purchase.units')}</label>
              <input type="number" min="1" max={selectedAsset.available_units} value={purchaseUnits}
                onChange={e => setPurchaseUnits(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedAsset.available_units)))}
                className="input-field" />
            </div>
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between"><span>{t('invest.purchase.total')}</span><span className="font-bold text-primary-600">{formatCurrency(Number(selectedAsset.unit_price || 0) * purchaseUnits, i18n.language)}</span></div>
              {storeRef && <div className="text-xs text-gray-500 mt-1">{t('invest.purchase.viaStore')}</div>}
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setSelectedAsset(null)} className="flex-1 btn-secondary">{t('common.cancel')}</button>
              <button onClick={handlePurchase} disabled={purchasing || !isVerified()} className="flex-1 btn-primary">{purchasing ? t('invest.portfolio.purchasing') : isVerified() ? t('invest.purchase.confirm') : t('invest.portfolio.needVerify')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{t('invest.recharge.modalTitle')}</h3>
            <div className="mb-4">
              <label className="label">{t('invest.recharge.amountLabel')}</label>
              <input type="number" min="1" step="0.01" value={rechargeAmount}
                onChange={e => setRechargeAmount(e.target.value)}
                placeholder={t('invest.recharge.amountPlaceholder')}
                className="input-field" />
            </div>
            <div className="flex space-x-4">
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }} className="flex-1 btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleRecharge} disabled={recharging} className="flex-1 btn-primary">
                {recharging ? t('invest.recharge.recharging') : t('invest.recharge.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{t('invest.withdraw.title')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('invest.withdraw.hint')}</p>
            <div className="space-y-4">
              <div>
                <label className="label">{t('invest.withdraw.amountLabel')}</label>
                <input type="number" min="1" step="0.01" value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder={t('invest.withdraw.amountPlaceholder')}
                  className="input-field" />
              </div>
              <div>
                <label className="label">{t('invest.withdraw.bankAccount')}</label>
                <input type="text" value={withdrawForm.bank_account}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_account: e.target.value })}
                  placeholder={t('invest.withdraw.bankAccountPlaceholder')}
                  className="input-field" />
              </div>
              <div>
                <label className="label">{t('invest.withdraw.bankName')}</label>
                <input type="text" value={withdrawForm.bank_name}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                  placeholder={t('invest.withdraw.bankNamePlaceholder')}
                  className="input-field" />
              </div>
              <div>
                <label className="label">{t('invest.withdraw.bankHolder')}</label>
                <input type="text" value={withdrawForm.bank_holder}
                  onChange={e => setWithdrawForm({ ...withdrawForm, bank_holder: e.target.value })}
                  placeholder={t('invest.withdraw.bankHolderPlaceholder')}
                  className="input-field" />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawForm({ amount: '', bank_account: '', bank_name: '', bank_holder: '' }); }} className="flex-1 btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 btn-primary">
                {withdrawing ? t('invest.withdraw.submitting') : t('invest.withdraw.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Invest() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvestPageContent />
    </Suspense>
  );
}
