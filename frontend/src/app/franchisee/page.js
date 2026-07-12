'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/date-format';
import { franchiseeAPI, orderAPI, agentAPI, adminAPI, chatbotAPI, authAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import {
  Store, Battery, MapPin, Zap, Shield, TrendingUp, Send, Plus, QrCode, ClipboardList, BarChart3, Calculator, MessageCircle, Star, Globe, Users, DollarSign, Wallet, Phone, Mail, ChevronRight, X, Loader2, Search, Home, Building2, BadgeCheck, AlertTriangle, Clock, Award, Target, Lightbulb, UserPlus, Eye, ArrowLeft, CheckCircle, Edit2, Image, Upload, Lock
} from 'lucide-react';
import { formatCurrency, fetchRates } from '../../lib/currency';
import { getCities, getRegionCities } from '../../data/region-cities';

/* ========== 常量定义 ========== */

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

const getOrderTypeDisplay = (orderType, t) => {
  const map = {
    '购买': t('franchisee.orders.typePurchase'),
    '出售': t('franchisee.orders.typeSell'),
    '投资者绑定': t('franchisee.orders.typeInvestorBinding'),
    '代理商绑定': t('franchisee.orders.typeAgentBinding'),
    '线上订单': t('franchisee.orders.typeOnline'),
    '门店订单': t('franchisee.orders.typeStore'),
  };
  return map[orderType] || orderType || t('franchisee.store.orderDefault');
};

function resolveI18n(obj, i18nKey, fallback, i18n) {
  const i18nData = obj?.[i18nKey];
  if (!i18nData || typeof i18nData !== 'object') return fallback;
  return i18nData[i18n.language] || i18nData['zh-CN'] || fallback;
}

const getFranchiseLevels = (t) => [
  { level: t('franchisee.level.province'), fee: 68966, deposit: 27586, performanceTarget: 2068965, commission: '2%', revShare: '2%', area: t('franchisee.level.provinceArea'), color: 'from-blue-600 to-blue-800', badge: t('franchisee.level.highest'), totalInvestment: 482759, downstreamRate: t('franchisee.level.comm2Split2') },
  { level: t('franchisee.level.city'), fee: 27586, deposit: 6897, performanceTarget: 689655, commission: '3%', revShare: '3%', area: t('franchisee.level.cityArea'), color: 'from-blue-500 to-blue-700', badge: t('franchisee.level.recommended'), totalInvestment: 144828, downstreamRate: t('franchisee.level.comm3Split3') },
  { level: t('franchisee.level.district'), fee: 6897, deposit: 1379, performanceTarget: 137931, commission: '5%', revShare: '5%', area: t('franchisee.level.districtArea'), color: 'from-sky-500 to-sky-700', badge: t('franchisee.level.entry'), totalInvestment: 33103, downstreamRate: t('franchisee.level.comm5Split5') },
];

const getBenefits = (t) => [
  { icon: DollarSign, title: t('franchisee.benefit.commissionTitle'), desc: t('franchisee.benefit.commissionDesc') },
  { icon: TrendingUp, title: t('franchisee.benefit.revenueTitle'), desc: t('franchisee.benefit.revenueDesc') },
  { icon: Users, title: t('franchisee.benefit.downstreamTitle'), desc: t('franchisee.benefit.downstreamDesc') },
  { icon: Building2, title: t('franchisee.benefit.supportTitle'), desc: t('franchisee.benefit.supportDesc') },
  { icon: Award, title: t('franchisee.benefit.bindingTitle'), desc: t('franchisee.benefit.bindingDesc') },
];

const getObligations = (t) => [
  { num: 1, title: t('franchisee.obligation.storeBuild'), desc: t('franchisee.obligation.storeBuildDesc') },
  { num: 2, title: t('franchisee.obligation.team'), desc: t('franchisee.obligation.teamDesc') },
  { num: 3, title: t('franchisee.obligation.target'), desc: t('franchisee.obligation.targetDesc') },
  { num: 4, title: t('franchisee.obligation.compliance'), desc: t('franchisee.obligation.complianceDesc') },
  { num: 5, title: t('franchisee.obligation.service'), desc: t('franchisee.obligation.serviceDesc') },
];

const getRiskControls = (t) => [
  { icon: Battery, title: t('franchisee.risk.battery'), items: [t('franchisee.risk.battery1'), t('franchisee.risk.battery2'), t('franchisee.risk.battery3'), t('franchisee.risk.battery4'), t('franchisee.risk.battery5')] },
  { icon: Shield, title: t('franchisee.risk.fund'), items: [t('franchisee.risk.fund1'), t('franchisee.risk.fund2'), t('franchisee.risk.fund3'), t('franchisee.risk.fund4'), t('franchisee.risk.fund5')] },
  { icon: Zap, title: t('franchisee.risk.lease'), items: [t('franchisee.risk.lease1'), t('franchisee.risk.lease2'), t('franchisee.risk.lease3'), t('franchisee.risk.lease4'), t('franchisee.risk.lease5')] },
];

const getAgentTypes = (t) => [
  {
    key: 'province_agent',
    label: t('franchisee.agentType.province'),
    feeUsd: 68966,
    depositUsd: 27586,
    performanceTargetUsd: 2068965,
    commission: '2%',
    revShare: '2%',
    area: t('franchisee.agentType.provinceArea'),
    color: 'from-blue-600 to-blue-800',
    desc: t('franchisee.agentType.provinceDesc'),
    benefits: [t('franchisee.agentType.provinceBenefit1'), t('franchisee.agentType.provinceBenefit2'), t('franchisee.agentType.provinceBenefit3'), t('franchisee.agentType.provinceBenefit4'), t('franchisee.agentType.provinceBenefit5')]},
  {
    key: 'city_franchisee',
    label: t('franchisee.agentType.city'),
    feeUsd: 27586,
    depositUsd: 6897,
    performanceTargetUsd: 689655,
    commission: '3%',
    revShare: '3%',
    area: t('franchisee.agentType.cityArea'),
    color: 'from-blue-500 to-blue-700',
    desc: t('franchisee.agentType.cityDesc'),
    benefits: [t('franchisee.agentType.cityBenefit1'), t('franchisee.agentType.cityBenefit2'), t('franchisee.agentType.cityBenefit3'), t('franchisee.agentType.cityBenefit4'), t('franchisee.agentType.cityBenefit5')]},
];

const PROVINCES = [
  '北京', '天津', '上海', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '广西', '内蒙古', '西藏', '宁夏', '新疆',
  '香港', '澳门', '台湾',
];

const REGIONS = [
  { code: 'cn', name: '中国大陆', cities: ['北京','上海','广州','深圳','杭州','成都','武汉','南京','重庆','其它'] },
  { code: 'hk', name: '中国香港', cities: ['香港岛','九龙','新界'] },
  { code: 'tw', name: '中国台湾', cities: ['台北','新北','桃园','台中','高雄','台南'] },
  { code: 'mo', name: '中国澳门', cities: ['澳门半岛','氹仔','路环'] },
  { code: 'bd', name: '孟加拉', cities: ['达卡','吉大港','库尔纳','拉杰沙希','锡尔赫特','巴里萨尔','其它'] },
  { code: 'kh', name: '柬埔寨', cities: ['金边','暹粒','西哈努克','马德望','贡布','磅湛','其它'] },
  { code: 'other', name: '其他国家', cities: [] },
];

// 区域 & 城市翻译 key 映射（用于 applyStore 多语言下拉选项）
const REGION_KEY_MAP = {
  cn: 'franchisee.applyStore.regionCn',
  hk: 'franchisee.applyStore.regionHk',
  tw: 'franchisee.applyStore.regionTw',
  mo: 'franchisee.applyStore.regionMo',
  bd: 'franchisee.applyStore.regionBd',
  kh: 'franchisee.applyStore.regionKh',
  other: 'franchisee.applyStore.regionOther'};

const CITY_KEY_MAP = {
  '北京': 'franchisee.applyStore.cityBeijing',
  '上海': 'franchisee.applyStore.cityShanghai',
  '广州': 'franchisee.applyStore.cityGuangzhou',
  '深圳': 'franchisee.applyStore.cityShenzhen',
  '杭州': 'franchisee.applyStore.cityHangzhou',
  '成都': 'franchisee.applyStore.cityChengdu',
  '武汉': 'franchisee.applyStore.cityWuhan',
  '南京': 'franchisee.applyStore.cityNanjing',
  '重庆': 'franchisee.applyStore.cityChongqing',
  '香港岛': 'franchisee.applyStore.cityHkIsland',
  '九龙': 'franchisee.applyStore.cityKowloon',
  '新界': 'franchisee.applyStore.cityNewTerritories',
  '台北': 'franchisee.applyStore.cityTaipei',
  '新北': 'franchisee.applyStore.cityNewTaipei',
  '桃园': 'franchisee.applyStore.cityTaoyuan',
  '台中': 'franchisee.applyStore.cityTaichung',
  '高雄': 'franchisee.applyStore.cityKaohsiung',
  '台南': 'franchisee.applyStore.cityTainan',
  '澳门半岛': 'franchisee.applyStore.cityMacauPeninsula',
  '氹仔': 'franchisee.applyStore.cityTaipa',
  '路环': 'franchisee.applyStore.cityColoane',
  '达卡': 'franchisee.applyStore.cityDhaka',
  '吉大港': 'franchisee.applyStore.cityChittagong',
  '库尔纳': 'franchisee.applyStore.cityKhulna',
  '拉杰沙希': 'franchisee.applyStore.cityRajshahi',
  '锡尔赫特': 'franchisee.applyStore.citySylhet',
  '巴里萨尔': 'franchisee.applyStore.cityBarisal',
  '金边': 'franchisee.applyStore.cityPhnomPenh',
  '暹粒': 'franchisee.applyStore.citySiemReap',
  '西哈努克': 'franchisee.applyStore.citySihanoukville',
  '马德望': 'franchisee.applyStore.cityBattambang',
  '贡布': 'franchisee.applyStore.cityKampot',
  '磅湛': 'franchisee.applyStore.cityKampongCham',
  '其它': 'franchisee.applyStore.cityOther'};

const TOP_CASES = []; // 改为从API动态加载

const CHAT_QA = {
  '加盟费用': null,
  '收益分享': null,
  '开店条件': null,
  '区域保护': null,
  '电池产品': null,
  '风控保障': null,
  '加盟流程': null,
  '退出机制': null,
  '代理层级': null,
  '投资回报': null,
  default: '感谢您的咨询!如需了解加盟费用、收益分享、开店条件、区域保护等,请输入具体关键词。也可拨打加盟热线:400-1KWH-888 或发邮件至 franchise@1kwh.store。'};

/* ========== 主组件 ========== */

export default function Franchisee() {
  const { user, isProvinceAgent } = useAuth();
  const { t, i18n } = useTranslation();

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stores, setStores] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  // === 门店详情 & 店员注册 ===
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [storeDetail, setStoreDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showStaffRegister, setShowStaffRegister] = useState(false);
  const [staffForm, setStaffForm] = useState({ username: '', email: '', password: '', phone: '' });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffResult, setStaffResult] = useState(null);

  // === 新增门店 ===
  const [showAddStore, setShowAddStore] = useState(false);
  const [addStoreForm, setAddStoreForm] = useState({ name: '', city: '', address: '', phone: '' });
  const [addStoreSubmitting, setAddStoreSubmitting] = useState(false);
  const [hasApproved, setHasApproved] = useState(false);
  const [batterySites, setBatterySites] = useState([]); // battery-live sites for cabinet display
  const [batterySitesLoaded, setBatterySitesLoaded] = useState(false);

  // 申请表单
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({ store_name: '', region: 'cn', city: '北京', custom_city: '', custom_country: '', district: '', address: '', phone: '', reason: '', province_agent_id: '', city_agent_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [agentStatus, setAgentStatus] = useState({ has_province_agent: false, province_agents: [], has_city_agent: false, city_agents: [], direct_headquarters: false });
  const [agentOptionsLoading, setAgentOptionsLoading] = useState(false);

  // === 代理申请（agent-apply Tab） ===
  const [applyAgentType, setApplyAgentType] = useState('');
  const [agentForm, setAgentForm] = useState({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  const [agentResultMsg, setAgentResultMsg] = useState(null);
  const [approvedAgents, setApprovedAgents] = useState([]);
  const [parentAgentId, setParentAgentId] = useState('');
  const [claimedCities, setClaimedCities] = useState([]);
  const [isUserProvinceAgent, setIsUserProvinceAgent] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [agentApps, setAgentApps] = useState([]);

  // 收益测算
  const [calcStoreType, setCalcStoreType] = useState('city');
  const [calcBatteryCounts, setCalcBatteryCounts] = useState({});
  const [calcDownstreamSales, setCalcDownstreamSales] = useState('');

  // === 代理审批 ===
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [agentType, setAgentType] = useState(''); // 'province_agent' | 'city_franchisee'
  // === 我的门店/加盟商管理 ===
  const [managedSearch, setManagedSearch] = useState('');
  const [managedData, setManagedData] = useState(null);
  const [managedFranchiseesData, setManagedFranchiseesData] = useState(null);
  const [managedLoading, setManagedLoading] = useState(false);
  const [provinceStores, setProvinceStores] = useState(null);
  const [provinceStoresLoading, setProvinceStoresLoading] = useState(false);
  const [storeOrders, setStoreOrders] = useState([]);
  // === 电池类型数据（从 API 动态获取，替代硬编码 BATTERY_PRODUCTS） ===
  const [batteryTypes, setBatteryTypes] = useState([]);
  const [batteryTypesLoaded, setBatteryTypesLoaded] = useState(false);
  
  // 合并自有引导订单+店员帮注册订单
  const allStoreOrders = useMemo(
    () => [...orders.filter(o => o.store_id), ...storeOrders].map(o => {
      // {t('franchisee.calculator.monthlyRentLabel')}兜底：API standard_monthly_rent → DB monthly_rent → batteryTypes（来自 /api/battery-types）
      let resolvedRent = o.standard_monthly_rent || o.monthly_rent || 0;
      if (!resolvedRent && o.product_id && batteryTypes.length > 0) {
        const bp = batteryTypes.find(p => p.name === o.product_id || p.id === o.product_id);
        if (bp) resolvedRent = (bp.monthlyRent || bp.monthly_rent || 0) * (o.units || 1);
      }
      return { ...o, _monthlyRent: resolvedRent };
    }),
    [orders, storeOrders, batteryTypes]
  );
  
  // === 优秀案例 ===
  const [topCases, setTopCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  
  // === 门店编辑 ===
  const [showEditStore, setShowEditStore] = useState(false);
  const [editStoreForm, setEditStoreForm] = useState({ id: '', name: '', city: '', address: '', phone: '', photo_url: '', images: [] });
  const [editStoreSubmitting, setEditStoreSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealStoreId, setAppealStoreId] = useState(null);
  const [appealStoreName, setAppealStoreName] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  // === 提现申请 ===
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bank_name: '', bank_account: '', bank_holder: '', business_license_url: '', invoice_info_url: '', vat_invoice_url: '' });
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawBalance, setWithdrawBalance] = useState(0);
  const [withdrawBreakdown, setWithdrawBreakdown] = useState({ total_earned: 0, total_withdrawn: 0 });
  // === {t('franchisee.earnings.pageTitle')} ===
  const [earningsData, setEarningsData] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  // === {t('franchisee.wallet.title')} ===
  const [walletData, setWalletData] = useState({ franchiseFee: 0, depositAmount: 0, performanceTarget: 0, cumulativePerformance: 0, cumulativeEarnings: 0, pendingEarnings: 0, monthlyRevenue: 0, totalBalance: 0, withdrawableBalance: 0, preTargetWithdrawable: 0, postTargetWithdrawable: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState('total'); // 'total' | 'preTarget' | 'postTarget'
  // === 提现模态框 ===
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawModalForm, setWithdrawModalForm] = useState({ amount: '', bank_name: '', bank_account: '', bank_holder: '', business_license_url: '', invoice_info_url: '', vat_invoice_url: '' });
  const [withdrawModalSubmitting, setWithdrawModalSubmitting] = useState(false);
  const [withdrawModalUploading, setWithdrawModalUploading] = useState({});
  // === 退保证金模态框 ===
  const [showDepositRefundModal, setShowDepositRefundModal] = useState(false);
  const [depositRefundForm, setDepositRefundForm] = useState({ bank_name: '', bank_account: '', bank_holder: '', business_license_url: '' });
  const [depositRefundSubmitting, setDepositRefundSubmitting] = useState(false);
  const [depositRefundUploading, setDepositRefundUploading] = useState({});
  const [selectedStore, setSelectedStore] = useState(null);
  const [overviewPerformance, setOverviewPerformance] = useState(null);
  // === 概览信息卡片 ===
  const [infoCards, setInfoCards] = useState({ level: '', province: '', city: '', parentAgentName: '', monthlyRevenue: 0, ownStoreCount: 0, franchisedStoreCount: 0, managedStoreCount: 0, managedFranchiseeCount: 0 });
  const [infoCardsLoading, setInfoCardsLoading] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // AI 对话
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: t('franchisee.chat.greeting') },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  /* ===== 数据加载 ===== */
  // 加载电池类型数据（公开 API，无需角色鉴权）
  useEffect(() => {
    const loadBatteryTypes = async () => {
      try {
        const res = await fetch(`/api/battery-types?locale=${i18n.language}`);
        const data = await res.json();
        if (data.battery_types) {
          const mapped = data.battery_types.map(bt => {
            // 映射 API 数据到组件使用的字段名
            const price = (typeof bt.unit_price === 'string' ? parseFloat(bt.unit_price) : bt.unit_price) || 0;
            const rent = (typeof bt.monthly_rent === 'string' ? parseFloat(bt.monthly_rent) : bt.monthly_rent) || 0;
            // 使用 API 解析后的多语言值
            const displayName = bt.resolved_name || bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name;
            const displayScenario = bt.resolved_scenario || bt.scenario_i18n?.[i18n.language] || bt.scenario_i18n?.['zh-CN'] || bt.scenario || '';
            // 推断 category
            let category = 'swap';
            const nameLower = (displayName || '').toLowerCase();
            if (nameLower.includes('集装箱') || nameLower.includes('container')) category = 'container';
            else if (nameLower.includes('工商业') || nameLower.includes('ess') || nameLower.includes('储能柜') || nameLower.includes('液冷柜') || nameLower.includes('风冷柜')) category = 'ess';
            else if (nameLower.includes('物流') || nameLower.includes('中巴') || nameLower.includes('大巴') || nameLower.includes('客车') || nameLower.includes('货车')) category = 'vehicle';
            return {
              id: bt.name,
              name: bt.name,
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
              unit_price: price,
              monthly_rent: rent};
          });
          setBatteryTypes(mapped);
        }
      } catch (e) { console.error('Failed to load battery types:', e); }
      finally { setBatteryTypesLoaded(true); }
    };
    loadBatteryTypes();
  }, [i18n.language]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      router.push('/');
      return;
    }
    loadData();
  }, [user]);

  // 加载概览信息卡片（依 stores/applications/agent 类型变化）
  useEffect(() => {
    if (stores.length || applications.length || isAgent) {
      loadInfoCards();
    }
  }, [stores, applications, agentType, managedData, provinceStores]);

  // 加载代理申请状态
  useEffect(() => {
    if (user) loadAgentStatus();
  }, [user]);

  const loadData = async () => {
    try {
      const [storesRes, appsRes, ordersRes, agentRes, storeOrdersRes] = await Promise.all([
        franchiseeAPI.getMyStores(),
        franchiseeAPI.getMyApplications(),
        orderAPI.getMyOrders().catch(() => ({ orders: [] })),
        agentAPI.getMyApplications().catch(() => ({ applications: [] })),
        franchiseeAPI.getStoreOrders().catch(() => ({ orders: [] })),
      ]);
      setStores(storesRes.stores || []);
      setApplications(appsRes.applications || []);
      setOrders(ordersRes.orders || []);
      setStoreOrders(storeOrdersRes.orders || []);
      const approved = [...(appsRes.applications || []), ...(agentRes.applications || [])]
        .some(a => a.status === 'approved');
      setHasApproved(!!approved);
      
      // 加载电池实时数据用于展示换电柜详情
      if (appsRes.applications?.some(a => a.status === 'approved')) {
        try {
          const batteryRes = await fetch('/api/battery-units/live').then(r => r.json());
          if (batteryRes?.data?.siteGroups) {
            setBatterySites(batteryRes.data.siteGroups);
          } else if (batteryRes?.siteGroups) {
            setBatterySites(batteryRes.siteGroups);
          }
        } catch (_) {}
        setBatterySitesLoaded(true);
      }
      // 检查用户是否已审批通过的代理
      const approvedAgent = (agentRes.applications || []).find(
        a => a.status === 'approved' && (a.agent_type === 'province_agent' || a.agent_type === 'city_franchisee')
      );
      if (approvedAgent) {
        setIsAgent(true);
        setAgentType(approvedAgent.agent_type);
        // 立即加载下辖门店数据以合并首页统计
        try {
          const managedRes = await agentAPI.getManaged('stores', '');
          setManagedData(managedRes);
        } catch (_) {}
      } else if (user?.agentType) {
        // Fallback: use agent_type from auth context (synced by DB trigger)
        setIsAgent(true);
        setAgentType(user.agentType);
        try {
          const managedRes = await agentAPI.getManaged('stores', '');
          setManagedData(managedRes);
        } catch (_) {}
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadReviewData = async () => {
    setReviewLoading(true);
    try {
      const data = await agentAPI.getReviewList();
      setReviewData(data);
    } catch (e) { console.error(e); }
    finally { setReviewLoading(false); }
  };

  const loadManaged = async (type, search) => {
    setManagedLoading(true);
    try {
      const data = await agentAPI.getManaged(type, search);
      if (type === 'franchisees') {
        setManagedFranchiseesData(data);
      } else {
        setManagedData(data);
      }
    } catch (e) { console.error(e); }
    finally { setManagedLoading(false); }
  };

  const loadProvinceStores = async (search) => {
    setProvinceStoresLoading(true);
    try {
      const data = await agentAPI.getManaged('stores', search);
      setProvinceStores(data);
    } catch (e) { console.error(e); }
    finally { setProvinceStoresLoading(false); }
  };

  const loadTopCases = async () => {
    setCasesLoading(true);
    try {
      const res = await fetch('/api/stores/top-cases');
      const data = await res.json();
      if (res.ok) setTopCases(data.stores || []);
    } catch (e) { console.error(e); }
    finally { setCasesLoading(false); }
  };

  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const res = await fetch('/api/withdrawals', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      if (data.balance !== undefined) setWithdrawBalance(data.balance);
      if (data.breakdown) setWithdrawBreakdown(data.breakdown);
    } catch {}
    setWithdrawalsLoading(false);
  };

  const loadEarnings = async () => {
    setEarningsLoading(true);
    try {
      // 所有加盟商（含区县门店）统一调用 agent 收益 API；若鉴权失败则显示空数据
      const data = await agentAPI.getEarnings();
      setEarningsData(data);
    } catch (err) {
      console.error('loadEarnings error:', err);
      setEarningsData({ self_earnings: { stores: [], purchase_commission: 0, rental_share: 0, total: 0 }, grand_total: 0 });
    }
    finally { setEarningsLoading(false); }
  };

  const loadWalletData = async () => {
    setWalletLoading(true);
    try {
      // 确保收益数据已加载（先点“{t('franchisee.wallet.title')}”时 earningsData 可能为空，余额会全为0）
      let earnings = earningsData;
      if (!earnings) {
        try {
          earnings = await agentAPI.getEarnings();
          setEarningsData(earnings);
        } catch (_) {
          earnings = { self_earnings: { stores: [], total_purchase_amount: 0 }, city_earnings: { stores: [], total_purchase_amount: 0 }, grand_total: 0 };
        }
      }
      // 从 applications 和 agentApplications 读取保证金和{t('franchisee.wallet.performanceTarget')}
      const franchiseFeeApp = (applications || []).find(a => a.status === 'approved');
      const agentApp = (applications || []).concat(
        ...(await agentAPI.getMyApplications().catch(() => ({ applications: [] }))).applications || []
      ).find(a => a.status === 'approved' && (a.agent_type === 'province_agent' || a.agent_type === 'city_franchisee'));

      // 辅助函数：从 FRANCHISE_LEVELS 常量解析金额
      const parseAmount = (val) => { if (!val && val !== 0) return 0; return Number(val); };

      // 根据 agentType 在 FRANCHISE_LEVELS 中找到对应等级常量
      const franchiseeLevels = getFranchiseLevels(t);
      const levelKey = agentType === 'province_agent' ? t('franchisee.level.province') : agentType === 'city_franchisee' ? t('franchisee.level.city') : t('franchisee.level.district');
      const levelConst = franchiseeLevels.find(l => l.level === levelKey);

      // 加盟费：优先 API 返回，其次 FRANCHISE_LEVELS 常量兜底
      const franchiseFee = franchiseFeeApp?.franchise_fee || (levelConst ? parseAmount(levelConst.fee) : 0);
      // 保证金：优先 agent 申请，其次 franchise 申请，最后 FRANCHISE_LEVELS 常量兜底
      const depositAmount = agentApp?.deposit_amount || franchiseFeeApp?.deposit_amount || (levelConst ? parseAmount(levelConst.deposit) : 0);
      // {t('franchisee.wallet.performanceTarget')}：优先 agent 申请中的 target，其次 FRANCHISE_LEVELS 常量兜底
      const perfTarget = agentApp?.performance_target
        || franchiseFeeApp?.performance_target
        || (levelConst ? parseAmount(levelConst.performanceTarget) : (
          agentType === 'province_agent' ? 10000000
          : agentType === 'city_franchisee' ? 5000000
          : 1000000
        ));
      // 直接调用 performance API 计算{t('franchisee.wallet.monthlyPerformance')}（所有门店 + 管辖门店去重）
      let monthlyRevenue = 0;
      if (stores && stores.length > 0) {
        const allStoreIds = [...new Set(stores.map(s => s.id))];
        const results = await Promise.all(allStoreIds.map(id =>
          fetch(`/api/franchisee/stores/${id}/performance`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(r => r.json()).then(d => d.monthly_total || 0).catch(() => 0)
        ));
        monthlyRevenue = results.reduce((a, b) => a + b, 0);
      }
      // {t('franchisee.wallet.cumulativePerformance')} = 所有门店的购买总金额（{t('franchisee.overview.ownStores')} + 加盟），仅用于达标判断
      const selfPurchaseAmount = (earnings?.self_earnings?.total_purchase_amount || 0);
      const cityPurchaseAmount = (earnings?.city_earnings?.total_purchase_amount || 0);
      const cumulativePerf = selfPurchaseAmount + cityPurchaseAmount;
      // 累计收益 = 来自“{t('franchisee.earnings.pageTitle')}”页面的{t('franchisee.earnings.totalLabel')}（{t('franchisee.earnings.commission')}+租金{t('franchisee.earnings.share')}），用于余额计算
      const cumulativeEarnings = (earnings?.settled_total || 0);
      const pendingEarnings = (earnings?.pending_total || 0);

      // 拉取提现记录，用于计算余额
      let totalWithdrawn = 0;
      let pendingWithdrawAmount = 0;
      try {
        const wRes = await fetch('/api/withdrawals', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const wData = await wRes.json();
        if (wData.withdrawals) {
          setWithdrawals(wData.withdrawals);
          totalWithdrawn = wData.withdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
          pendingWithdrawAmount = wData.withdrawals
            .filter(w => w.status === 'pending')
            .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
        }
        if (wData.balance !== undefined) setWithdrawBalance(wData.balance);
        if (wData.breakdown) setWithdrawBreakdown(wData.breakdown);
      } catch (_) {}

      // 加盟商余额 = 保证金 + 已结算收益 - 已提现
      const bizBalance = depositAmount + cumulativeEarnings - totalWithdrawn;
      const totalBalance = Math.max(0, bizBalance);
      // 业绩是否达标（用业绩判断，不用收益）
      const isTargetMet = perfTarget > 0 && cumulativePerf >= perfTarget;
      // 达标前：{t('franchisee.wallet.withdrawableLabel')} = 收益 - 待处理提现
      const preTargetWithdrawable = cumulativeEarnings - pendingWithdrawAmount;
      // 达标后：{t('franchisee.wallet.withdrawableLabel')} = 保证金 + 收益 - 已提现
      const postTargetWithdrawable = depositAmount + cumulativeEarnings - totalWithdrawn;
      // 当前{t('franchisee.wallet.withdrawableLabel')}
      const withdrawableBalance = isTargetMet ? postTargetWithdrawable : preTargetWithdrawable;

      setWalletData({
        franchiseFee,
        depositAmount,
        performanceTarget: perfTarget,
        cumulativePerformance: cumulativePerf,
        cumulativeEarnings: cumulativeEarnings,
        pendingEarnings: pendingEarnings,
        monthlyRevenue,
        totalBalance: Math.max(0, totalBalance),
        withdrawableBalance: Math.max(0, withdrawableBalance),
        preTargetWithdrawable: Math.max(0, preTargetWithdrawable),
        postTargetWithdrawable: Math.max(0, postTargetWithdrawable)});
    } catch (err) { console.error(err); }
    finally { setWalletLoading(false); }
  };

  // === 代理申请函数 ===
  const loadAgentStatus = async () => {
    try {
      const data = await agentAPI.getMyApplications();
      setAgentApps(data.applications || []);
      const agentData = await agentAPI.getApproved();
      setApprovedAgents(agentData.agents || []);
      const isProvince = (data.applications || []).some(
        a => a.agent_type === 'province_agent' && a.status === 'approved'
      );
      setIsUserProvinceAgent(isProvince);
    } catch (e) { console.error(e); }
  };

  const handleParentChange = async (agentId) => {
    setParentAgentId(agentId);
    if (!agentId) { setAvailableCities([]); setClaimedCities([]); return; }
    const parentAgent = approvedAgents.find(a => String(a.id) === String(agentId));
    if (!parentAgent) return;
    const province = parentAgent.city || parentAgent.region;
    setAgentForm(prev => ({ ...prev, city: '' }));
    try {
      const data = await agentAPI.getClaimedCities(province);
      const claimed = data.claimed_cities || [];
      setClaimedCities(claimed);
      const allCities = getCities(province);
      if (allCities.length > 0) {
        setAvailableCities(allCities.filter(c => !claimed.includes(c)));
      } else {
        const regionCities = getRegionCities(parentAgent.region || 'cn');
        setAvailableCities(regionCities.filter(c => !claimed.includes(c)));
      }
    } catch (e) {
      console.error(e);
      const allCities = getCities(province);
      if (allCities.length > 0) setAvailableCities(allCities);
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    if (!applyAgentType) { alert(t('franchisee.applyAgent.selectType')); return; }
    if (!agentForm.full_name.trim()) { alert('请填写姓名'); return; }
    if (!agentForm.phone.trim()) { alert('请填写联系电话'); return; }
    setAgentSubmitting(true);
    setAgentResultMsg(null);
    try {
      const payload = { agent_type: applyAgentType, ...agentForm };
      if (applyAgentType === 'city_franchisee') payload.parent_agent_id = parentAgentId;
      await agentAPI.apply(payload);
      setAgentResultMsg({ type: 'success', text: t('franchisee.alert.agentSubmitted') });
      setAgentForm({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
      setApplyAgentType('');
      setParentAgentId('');
      loadAgentStatus();
    } catch (err) {
      setAgentResultMsg({ type: 'error', text: err.message || t('franchisee.alert.submitFailed') });
    } finally { setAgentSubmitting(false); }
  };

  const loadInfoCards = async () => {
    setInfoCardsLoading(true);
    try {
      const approvedApp = (applications || []).find(a => a.status === 'approved');

      // {t('franchisee.overview.ownStores')}门店: is_managed=false 且 owner_id 是当前用户（双重校验）
      // 加盟门店: is_managed=true 或 owner_id≠当前用户
      const ownStores = (stores || []).filter(s => !s.is_managed && s.owner_id === user?.id);
      const franchisedStores = (stores || []).filter(s => s.is_managed || s.owner_id !== user?.id);

      // 管辖门店：来自 managedData（市级）/ provinceStores 或 managedData 兜底（省级）
      const managedArr = agentType === 'city_franchisee' ? (managedData?.stores || [])
        : agentType === 'province_agent' ? (provinceStores?.stores || managedData?.stores || [])
        : [];

      // 汇总所有门店{t('franchisee.wallet.monthlyPerformance')}（{t('franchisee.overview.ownStores')}门店业绩 + 加盟门店业绩的总和，按 id 去重）
      const allStoresMap = new Map();
      for (const s of stores) allStoresMap.set(s.id, s);
      for (const s of managedArr) allStoresMap.set(s.id, s);
      const allStores = Array.from(allStoresMap.values());
      let monthlyRevenue = 0;
      if (allStores.length > 0) {
        const results = await Promise.all(allStores.map(s =>
          fetch(`/api/franchisee/stores/${s.id}/performance`, {
            headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}` }
          }).then(r => r.json()).then(d => d.monthly_total || 0).catch(() => 0)
        ));
        monthlyRevenue = results.reduce((a, b) => a + b, 0);
      }

      // --- 省市 & 上级代理 ---
      // 区县加盟店：从{t('franchisee.applyStore.parentCityFranchisee')}的 application 数据获取 region、city、名称
      // 这些字段由 API 端 join agent_applications 后返回
      let parentAgentName = approvedApp?.parent_agent_name || '';
      let displayRegionCode = approvedApp?.parent_agent_region || '';
      let displayRawCity = approvedApp?.parent_agent_city || '';

      // 解析省市显示名称
      const regionName = REGIONS.find(r => r.code === displayRegionCode)?.name || displayRegionCode || '—';
      const cityParts = displayRawCity.split('·');
      const actualCity = cityParts.length > 1 ? cityParts[1] : displayRawCity;

      // 加盟等级
      let level = '区县加盟店';
      if (agentType === 'province_agent') level = t('franchisee.earnings.provinceAgent');
      else if (agentType === 'city_franchisee') level = t('franchisee.earnings.cityFranchisee');

      // 管辖门店/加盟商计数
      let managedStoreCount = 0;
      let managedFranchiseeCount = 0;
      if (agentType === 'province_agent') {
        // 省代：管辖门店来自 provinceStores 或 managedData
        managedStoreCount = (provinceStores?.stores || managedData?.stores || []).length;
        // 获取加盟商数据（独立调用 type=franchisees）
        try {
          const frRes = await agentAPI.getManaged('franchisees', '');
          managedFranchiseeCount = frRes?.franchisee_groups
            ? Object.values(frRes.franchisee_groups).reduce((sum, g) => sum + (g?.length || 0), 0)
            : frRes?.franchisees?.length || 0;
        } catch (_) {}
      } else if (agentType === 'city_franchisee') {
        managedStoreCount = (managedData?.stores || []).length;
      }

      setInfoCards({
        level,
        province: regionName,
        city: actualCity,
        parentAgentName: parentAgentName || (approvedApp?.parent_agent_id ? '已指定' : t('franchisee.status.none')),
        monthlyRevenue,
        ownStoreCount: ownStores.length,
        franchisedStoreCount: franchisedStores.length,
        managedStoreCount,
        managedFranchiseeCount});
    } catch (err) { console.error(err); }
    finally { setInfoCardsLoading(false); }
  };

  const handleDepositRefund = async () => {
    if (!walletData.depositAmount || walletData.depositAmount <= 0) { alert('没有可退的保证金'); return; }
    // 打开退保证金模态框
    setDepositRefundForm(prev => ({
      bank_name: prev.bank_name || '',
      bank_account: prev.bank_account || '',
      bank_holder: prev.bank_holder || '',
      business_license_url: prev.business_license_url || withdrawForm.business_license_url || withdrawModalForm.business_license_url || ''}));
    setShowDepositRefundModal(true);
  };

  const handleDepositRefundSubmit = async (e) => {
    e.preventDefault();
    if (!depositRefundForm.bank_name || !depositRefundForm.bank_account || !depositRefundForm.bank_holder) {
      alert('请填写银行账户信息'); return;
    }
    if (!depositRefundForm.business_license_url) { alert('请上传盖章的营业执照'); return; }
    setDepositRefundSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          type: 'deposit_refund',
          amount: walletData.depositAmount,
          bank_name: depositRefundForm.bank_name,
          bank_account: depositRefundForm.bank_account,
          bank_holder: depositRefundForm.bank_holder,
          business_license_url: depositRefundForm.business_license_url})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('franchisee.alert.submitFailed'));
      alert('退保证金申请已提交，等待 admin 审批');
      setShowDepositRefundModal(false);
      loadWalletData();
    } catch (err) { alert(err.message); }
    finally { setDepositRefundSubmitting(false); }
  };

  const handleDepositRefundFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDepositRefundUploading({ business_license_url: true });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/photo', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDepositRefundForm(prev => ({ ...prev, business_license_url: data.url }));
    } catch { alert('上传失败'); }
    finally { setDepositRefundUploading({}); }
  };

  const handleWithdrawModalSubmit = async (e) => {
    e.preventDefault();
    if (!withdrawModalForm.amount || !withdrawModalForm.bank_name || !withdrawModalForm.bank_account || !withdrawModalForm.bank_holder) {
      alert('请填写完整信息'); return;
    }
    if (!withdrawModalForm.business_license_url) { alert('请上传盖章的营业执照'); return; }
    if (!withdrawModalForm.invoice_info_url) { alert('请上传开票资料'); return; }
    if (!withdrawModalForm.vat_invoice_url) { alert('请上传发票'); return; }
    setWithdrawModalSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ type: 'commission_withdraw', ...withdrawModalForm })});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('franchisee.alert.submitFailed'));
      alert('提现申请已提交，等待 admin 审批');
      setShowWithdrawModal(false);
      await loadWalletData();
    } catch (err) { alert(err.message); }
    finally { setWithdrawModalSubmitting(false); }
  };

  const handleWithdrawModalFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWithdrawModalUploading(prev => ({ ...prev, [field]: true }));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/photo', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setWithdrawModalForm(prev => ({ ...prev, [field]: data.url }));
    } catch { alert('上传失败'); }
    finally { setWithdrawModalUploading(prev => ({ ...prev, [field]: false })); }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) { alert('请输入提现金额'); return; }
    if (!withdrawForm.bank_name || !withdrawForm.bank_account || !withdrawForm.bank_holder) { alert('请填写银行账户信息'); return; }
    if (!withdrawForm.business_license_url) { alert('请上传营业执照'); return; }
    if (!withdrawForm.invoice_info_url) { alert('请上传开票资料'); return; }
    if (!withdrawForm.vat_invoice_url) { alert('请上传增值税专用发票'); return; }
    setWithdrawSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          amount: parseFloat(withdrawForm.amount),
          bank_name: withdrawForm.bank_name,
          bank_account: withdrawForm.bank_account,
          bank_holder: withdrawForm.bank_holder,
          business_license_url: withdrawForm.business_license_url,
          invoice_info_url: withdrawForm.invoice_info_url,
          vat_invoice_url: withdrawForm.vat_invoice_url})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('franchisee.alert.submitFailed'));
      alert('提现申请已提交，等待审核');
      setShowWithdrawForm(false);
      setWithdrawForm({ amount: '', bank_name: '', bank_account: '', bank_holder: '', business_license_url: '', invoice_info_url: '', vat_invoice_url: '' });
      loadWithdrawals();
    } catch (err) { alert(err.message); }
    setWithdrawSubmitting(false);
  };

  const handleWithdrawFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/photo', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setWithdrawForm(prev => ({ ...prev, [field]: data.url }));
    } catch { alert('上传失败'); }
  };

  const handleEditStore = async (e) => {
    e.preventDefault();
    if (!editStoreForm.name.trim()) { alert('请输入门店名称'); return; }
    setEditStoreSubmitting(true);
    try {
      const res = await fetch(`/api/franchisee/stores/${editStoreForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          name: editStoreForm.name,
          city: editStoreForm.city,
          address: editStoreForm.address,
          phone: editStoreForm.phone,
          photo_url: editStoreForm.photo_url,
          images: editStoreForm.images})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('franchisee.alert.updateFailed'));
      setShowEditStore(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditStoreSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const urls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/photo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('franchisee.alert.uploadFailed'));
        urls.push(data.url);
      }
      setEditStoreForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    } catch (err) {
      alert(t('franchisee.alert.photoUploadFailed') + err.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removeStoreImage = (index) => {
    setEditStoreForm(prev => {
      const images = prev.images || [];
      if (index < images.length) {
        // 从 images 数组中删除
        return { ...prev, images: images.filter((_, i) => i !== index) };
      } else {
        // 删除的是 photo_url
        return { ...prev, photo_url: '' };
      }
    });
  };

  const handleManagedStoreStatus = async (storeId, newStatus, storeName) => {
    if (!window.confirm(t('franchisee.confirm.toggleStore', { action: newStatus === 'suspended' ? t('franchisee.action.suspend') : t('franchisee.action.resume'), name: storeName }))) return;
    try {
      await adminAPI.updateStoreStatus(storeId, newStatus);
      loadManaged();
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleDeleteManagedStore = async (storeId, storeName) => {
    if (!window.confirm(t('franchisee.confirm.closeStore', { name: storeName }))) return;
    try {
      await adminAPI.deleteStore(storeId);
      loadManaged();
    } catch (err) {
      alert('操作失败');
    }
  };

  // === 省代-管辖门店操作（刷新 provinceStores） ===
  const handleProvinceStoreStatus = async (storeId, newStatus, storeName) => {
    if (!window.confirm(t('franchisee.confirm.toggleStore', { action: newStatus === 'suspended' ? t('franchisee.action.suspend') : t('franchisee.action.resume'), name: storeName }))) return;
    try {
      await adminAPI.updateStoreStatus(storeId, newStatus);
      loadProvinceStores(managedSearch);
    } catch (err) { alert('操作失败'); }
  };

  const handleProvinceStoreDelete = async (storeId, storeName) => {
    if (!window.confirm(t('franchisee.confirm.closeStoreIrreversible', { name: storeName }))) return;
    try {
      await adminAPI.deleteStore(storeId);
      loadProvinceStores(managedSearch);
    } catch (err) { alert('操作失败'); }
  };

  // === 省代管理加盟商（agent级别操作）===
  const handleManagedFranchiseeStatus = async (franchiseeId, newStatus, franchiseeName) => {
    if (!window.confirm(t('franchisee.confirm.toggleFranchisee', { action: newStatus === 'suspended' ? t('franchisee.action.suspend') : t('franchisee.action.resume'), name: franchiseeName }))) return;
    try {
      await adminAPI.updateManagedAgent(franchiseeId, { status: newStatus });
      loadManaged('franchisees', managedSearch);
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleDeleteManagedFranchisee = async (franchiseeId, franchiseeName) => {
    if (!window.confirm(t('franchisee.confirm.closeFranchiseeIrreversible', { name: franchiseeName }))) return;
    try {
      await adminAPI.deleteManagedAgent(franchiseeId);
      loadManaged('franchisees', managedSearch);
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleAppeal = async () => {
    if (!appealReason.trim()) { alert('请输入申诉理由'); return; }
    setAppealSubmitting(true);
    try {
      const res = await fetch('/api/stores/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ store_id: appealStoreId, reason: appealReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('franchisee.alert.appealFailed'));
      alert('申诉已提交，等待管理员审核');
      setShowAppealModal(false);
      setAppealReason('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAppealSubmitting(false);
    }
  };

  /* ===== 门店详情 ===== */
  const openStoreDetail = async (storeId) => {
    setSelectedStoreId(storeId);
    setDetailLoading(true);
    setStoreDetail(null);
    try {
      const [detailData, perfRes] = await Promise.all([
        franchiseeAPI.getStoreDetail(storeId),
        fetch(`/api/franchisee/stores/${storeId}/performance`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
      ]);
      console.log('[openStoreDetail] perfRes:', perfRes);
      console.log('[openStoreDetail] monthly_total:', perfRes?.monthly_total);
      const merged = { ...detailData, ...perfRes };
      console.log('[openStoreDetail] merged.monthly_total:', merged.monthly_total);
      setStoreDetail(merged);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  /* ===== 店员帮投资者注册 ===== */
  const handleStaffRegister = async (e) => {
    e.preventDefault();
    if (!staffForm.username.trim() || !staffForm.email.trim() || !staffForm.password.trim()) {
      alert('请填写用户名、邮箱和密码');
      return;
    }
    setStaffSubmitting(true);
    setStaffResult(null);
    try {
      const data = await franchiseeAPI.staffRegisterInvestor({
        ...staffForm,
        store_id: selectedStoreId});
      setStaffResult({ success: true, msg: `投资者 ${data.investor?.username || staffForm.username} 注册成功！已绑定门店 编码: ${storeDetail?.store_code || data.store_code || selectedStoreId}` });
      setStaffForm({ username: '', email: '', password: '', phone: '' });
      // 刷新门店详情
      openStoreDetail(selectedStoreId);
    } catch (err) {
      setStaffResult({ success: false, msg: err.message || t('franchisee.alert.registerFailed') });
    }
    finally { setStaffSubmitting(false); }
  };

  /* ===== 新增门店 ===== */
  const handleAddStore = async (e) => {
    e.preventDefault();
    if (!addStoreForm.name.trim()) { alert('请填写门店名称'); return; }
    setAddStoreSubmitting(true);
    try {
      await franchiseeAPI.addStore(addStoreForm);
      alert('门店创建成功！');
      setShowAddStore(false);
      setAddStoreForm({ name: '', city: '', address: '', phone: '' });
      loadData();
    } catch (err) { alert(err.message || t('franchisee.alert.createFailed')); }
    finally { setAddStoreSubmitting(false); }
  };

  /* ===== 申请开店 ===== */
  const loadAgentOptions = useCallback(async (region, city) => {
    if (!region || !showApplyForm) return;
    // 仅中国大陆地区加载代理选项
    if (region !== 'cn') {
      setAgentStatus({ has_province_agent: false, province_agents: [], has_city_agent: false, city_agents: [], direct_headquarters: true });
      return;
    }
    setAgentOptionsLoading(true);
    try {
      const data = await franchiseeAPI.getAgentOptions(region, city);
      setAgentStatus(data);
      setApplyForm(prev => ({
        ...prev,
        province_agent_id: data.has_province_agent ? prev.province_agent_id : '',
        city_agent_id: data.has_city_agent ? prev.city_agent_id : ''}));
    } catch (e) { console.error(e); }
    finally { setAgentOptionsLoading(false); }
  }, [showApplyForm]);

  // 当申请表单打开且 region/city 变化时，重新加载代理选项
  useEffect(() => {
    if (showApplyForm && applyForm.region && applyForm.city) {
      loadAgentOptions(applyForm.region, applyForm.city);
    }
  }, [showApplyForm, applyForm.region, applyForm.city, loadAgentOptions]);

  // 概览页{t('franchisee.wallet.monthlyPerformance')}汇总
  useEffect(() => {
    if (activeTab !== 'overview') return;
    const loadPerf = async () => {
      // 去重：{t('franchisee.overview.ownStores')}门店业绩 + 加盟门店业绩的总和
      const managedArr = managedData?.stores || [];
      const allStoresMap = new Map();
      for (const s of stores) allStoresMap.set(s.id, s);
      for (const s of managedArr) allStoresMap.set(s.id, s);
      const all = Array.from(allStoresMap.values());
      if (all.length === 0) { setOverviewPerformance(null); return; }
      let total = 0;
      const results = await Promise.all(all.map(s =>
        fetch(`/api/franchisee/stores/${s.id}/performance`, {
          headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}` }
        }).then(r => r.json()).then(d => d.monthly_total || 0).catch(() => 0)
      ));
      total = results.reduce((a, b) => a + b, 0);
      setOverviewPerformance({ monthly_total: total, store_count: all.length });
    };
    if (agentType === 'city_franchisee') loadManaged('stores', '');
    if (agentType === 'province_agent') { loadManaged('franchisees', ''); loadProvinceStores(''); }
    loadPerf();
  }, [activeTab, agentType, isAgent]);

  const openApplyForm = () => {
    if (user?.kyc_status !== 'approved') {
      alert('请先完成实名认证后再申请开店');
      router.push('/profile');
      return;
    }
    setShowApplyForm(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (user?.kyc_status !== 'approved') { alert('请先完成实名认证后再提交开店申请'); return; }
    if (!applyForm.store_name.trim()) { alert('请填写门店名称'); return; }
    if (!applyForm.district.trim()) { alert('请填写区县所在地'); return; }
    if (!applyForm.address.trim()) { alert('请填写详细地址'); return; }
    if (!applyForm.reason.trim()) { alert('请填写申请理由'); return; }
    setSubmitting(true);
    try {
      const regionInfo = REGIONS.find(r => r.code === applyForm.region);
      let cityValue;
      if (applyForm.region === 'cn') {
        const actualCity = applyForm.city === '其它' ? applyForm.custom_city : applyForm.city;
        cityValue = `${t('franchisee.region.chinaMainland')}·${actualCity}`;
      } else if (applyForm.region === 'other') {
        cityValue = `${applyForm.custom_country}·${applyForm.custom_city}`;
      } else {
        const actualCity = applyForm.city === '其它' ? applyForm.custom_city : applyForm.city;
        cityValue = `${regionInfo.name}·${actualCity}`;
      }
      // parent_agent_id 优先级：市级ID > 省级ID > null
      const parent_agent_id = applyForm.city_agent_id || applyForm.province_agent_id || null;
      const agent_type = applyForm.city_agent_id ? 'city' : (applyForm.province_agent_id ? 'province' : null);
      const payload = {
        ...applyForm,
        city: cityValue,
        parent_agent_id: parent_agent_id || undefined,
        agent_type: agent_type || undefined};
      await franchiseeAPI.submitApplication(payload);
      alert('申请已提交!平台将在3个工作日内审核。');
      setShowApplyForm(false);
      loadData();
    } catch (err) { alert(err.message || t('franchisee.alert.submitFailed')); }
    finally { setSubmitting(false); }
  };

  /* ===== 收益测算 ===== */
  const getCalcResult = () => {
    const selfCommissionRate = 0.05; // 销售抽佣 5%（按总投资额）
    const selfRentalRate = 0.05; // {t('franchisee.overview.ownStores')}{t('franchisee.calculator.monthlyRentLabel')}{t('franchisee.earnings.share')} 5%（市级/省级统一）
    const downstreamCommissionRate = { province: 0.02, city: 0.03, district: 0 }[calcStoreType] || 0;
    const downstreamRentalRate = { province: 0.02, city: 0.03, district: 0 }[calcStoreType] || 0;
    const investorRate = 0.70;
    const hqRate = 0.20;

    let totalInvestment = 0;
    let totalMonthlyRent = 0;
    const details = [];

    const products = batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS;
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

    // 加盟商收益 = 自销{t('franchisee.earnings.commission')}(总投资额×5%,一次性) + 自销租金({t('franchisee.calculator.monthlyRentLabel')}池×5%,月度) + 下级抽佣(销售额×N%,一次性)+{t('franchisee.earnings.share')}({t('franchisee.calculator.monthlyRentLabel')}×N%,月度)
    const selfCommissionAmount = totalInvestment * selfCommissionRate;
    const selfRentalAmount = totalMonthlyRent * selfRentalRate;

    const downstreamAnnualSales = parseFloat(calcDownstreamSales) * 10000 || 0;
    const downstreamCommissionAnnual = downstreamAnnualSales * downstreamCommissionRate;  // 一次性{t('franchisee.earnings.commission')}
    const downstreamRentalMonthly = (downstreamAnnualSales / 21) * downstreamRentalRate;  // 销售额/21=预估{t('franchisee.calculator.monthlyRentLabel')},再×{t('franchisee.earnings.share')}比例

    const franchiseeMonthly = selfRentalAmount + downstreamRentalMonthly;  // 月度收入不含{t('franchisee.earnings.commission')}
    const franchiseeAnnual = franchiseeMonthly * 12 + selfCommissionAmount + downstreamCommissionAnnual;  // 年收入 = 月度×12 + 一次性{t('franchisee.earnings.commission')}
    const investorMonthly = totalMonthlyRent * investorRate;
    const investorAnnual = investorMonthly * 12;
    const investorPaybackMonths = investorMonthly > 0 ? totalInvestment / investorMonthly : Infinity;
    const investorAnnualReturn = totalInvestment > 0 ? ((investorAnnual / totalInvestment) * 100).toFixed(1) : '0';

    return {
      details, totalInvestment, totalMonthlyRent, franchiseeMonthly, franchiseeAnnual, investorMonthly,
      investorAnnual, investorPaybackMonths, investorAnnualReturn, selfCommissionRate, selfRentalRate,
      downstreamCommissionRate, downstreamRentalRate, downstreamAnnualSales, selfCommissionAmount,
      selfRentalAmount, downstreamCommissionAnnual, downstreamRentalMonthly, hqRate};
  };

  /* ===== AI 对话 ===== */
  const handleChat = async () => {
    const q = chatInput.trim();
    if (!q) return;
    const userMsg = { role: 'user', text: q };
    const botPlaceholder = { role: 'bot', text: '' };
    setChatMessages(prev => [...prev, userMsg, botPlaceholder]);
    setChatInput('');

    try {
      const res = await fetch('/api/advisor/franchisee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] })});

      if (!res.ok) throw new Error(res.statusText);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setChatMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'bot', text: fullText };
          return copy;
        });
      }
    } catch (e) {
      // fallback to local CHAT_QA
      let reply = CHAT_QA.default;
      for (const [kw, ans] of Object.entries(CHAT_QA)) {
        if (kw === 'default' || ans === null) continue;
        if (q.includes(kw)) { reply = ans; break; }
      }
      setChatMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'bot', text: reply };
        return copy;
      });
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  /* ===== 辅助 ===== */
  const activeStores = stores.filter(s => s.status === 'active');
  const managedStores = (managedData?.stores || []).filter(s => s.status === 'active' && !activeStores.find(as => as.id === s.id));
  const allStoresForStats = [...activeStores, ...managedStores];

  const handleReview = async (type, id, status) => {
    try {
      await agentAPI.reviewApplication(id, { type, status });
      loadReviewData();
    } catch (err) { alert(err.message || t('franchisee.alert.approvalFailed')); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />{t('common.loading')}</div>;

  /* ===== 渲染 ===== */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== Hero ===== */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-3xl font-black">1</div>
                <div>
                  <div className="text-sm text-blue-200">{t('franchisee.hero.subtitle')}</div>
                  <h1 className="text-3xl font-bold">{t('franchisee.hero.title')}</h1>
                </div>
              </div>
              <p className="text-blue-200">{t('franchisee.hero.welcomeBack', { name: user?.username })}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {[
              { label: t('franchisee.stats.stores'), value: allStoresForStats.length },
              { label: t('franchisee.stats.batteries'), value: allStoresForStats.reduce((s, st) => s + (st.total_batteries || 0), 0) },
              { label: t('franchisee.stats.orders'), value: allStoreOrders.length },
              { label: t('franchisee.stats.applications'), value: applications.length },
              { label: t('franchisee.stats.globalSites'), value: '100+' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-3xl font-bold">{item.value}</div>
                <div className="text-blue-200 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { key: 'overview', label: t('franchisee.tab.overview'), icon: BarChart3 },
              { key: 'rules', label: t('franchisee.tab.rules'), icon: Shield },
              { key: 'calculator', label: t('franchisee.tab.calculator'), icon: Calculator },
              { key: 'cases', label: t('franchisee.tab.cases'), icon: Star },
              { key: 'apply', label: t('franchisee.tab.apply'), icon: Plus },
              { key: 'agent-apply', label: t('franchisee.tab.agent'), icon: Award },
              ...(isAgent || hasApproved ? [{ key: 'earnings', label: t('franchisee.tab.revenue'), icon: TrendingUp }] : []),
              ...(isAgent || hasApproved ? [{ key: 'wallet', label: t('franchisee.tab.wallet'), icon: Wallet }] : []),
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedStoreId(null); if (t.key === 'cases') loadTopCases(); if (t.key === 'earnings') { loadEarnings(); loadWalletData(); } if (t.key === 'wallet') loadWalletData(); if (t.key === 'agent-apply') loadAgentStatus(); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" /><span>{t.label}</span>
              </button>
            ))}
            {/* 代理审批 Tab - 省级总代理可见 */}
            {isAgent && agentType === 'province_agent' && (
              <button onClick={() => { setActiveTab('review-agent'); setSelectedStoreId(null); loadReviewData(); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'review-agent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <BadgeCheck className="h-4 w-4" /><span>{t("franchisee.tab.approvals")}</span>
              </button>
            )}
            {/* 开店审批 Tab - 省级/市级可见 */}
            {isAgent && (
              <button onClick={() => { setActiveTab('review-store'); setSelectedStoreId(null); loadReviewData(); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'review-store' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <ClipboardList className="h-4 w-4" /><span>{t("franchisee.tab.adminStores")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Tab 内容区 ===== */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ==================== Tab: 概览 ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 角色身份标签 */}
            {isAgent && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                agentType === 'province_agent' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}>
                <BadgeCheck className="h-4 w-4" />
                {agentType === 'province_agent' ? t('franchisee.level.province') : t('franchisee.level.city')}
                <span className="font-normal text-gray-500">|</span>
                <span className="font-normal text-gray-500 text-xs">
                  {agentType === 'province_agent' ? t('franchisee.overview.provinceRoleDesc') : t('franchisee.overview.cityRoleDesc')}
                </span>
              </div>
            )}

            {/* --- 区县/门店加盟商概览信息卡片 --- */}
            {!isAgent && (() => {
              const regionDisplay = infoCards.province && infoCards.city
                ? `${infoCards.province} ${infoCards.city}`
                : infoCards.province || infoCards.city || '—';
              const perfMonthly = infoCards.monthlyRevenue || 0;
              return (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Home className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{t('franchisee.level.district')}</h2>
                      <p className="text-xs text-gray-500">{t('franchisee.overview.storeLevelDesc')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.provinceAndCity')}</p>
                      <p className="font-semibold text-gray-900">{regionDisplay}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.parentAgent')}</p>
                      <p className="font-semibold text-gray-900">
                        {infoCards.parentAgentName || t('franchisee.common.none')}
                      </p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.monthlySummary')}</p>
                      <p className="font-semibold text-green-600 text-lg">{formatCurrency(perfMonthly, i18n.language)}<span className="text-xs text-gray-400 ml-2"></span></p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* --- 市级加盟商概览信息卡片 --- */}
            {isAgent && agentType === 'city_franchisee' && (() => {
              const perfMonthly = infoCards.monthlyRevenue || overviewPerformance?.monthly_total || 0;
              const ownStores = infoCards.ownStoreCount;
              const franchisedStores = infoCards.franchisedStoreCount;
              return (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
                      <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{t('franchisee.level.city')}</h2>
                      <p className="text-xs text-gray-500">
                        {t('franchisee.overview.ownStores')} {ownStores} {t('franchisee.table.unitStores')} · {t('franchisee.overview.franchiseStores')} {franchisedStores} {t('franchisee.table.unitStores')}
                        {managedData?.region ? ` · ${t('franchisee.overview.regionLabel')}: ${managedData.region}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.monthlyPerformanceSelfAndFranchisee')}</p>
                      <p className="font-semibold text-green-600 text-lg">{formatCurrency(perfMonthly, i18n.language)}<span className="text-xs text-gray-400 ml-2"></span></p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.selfStores')}</p>
                      <p className="font-semibold text-gray-900">{ownStores} {t('franchisee.table.unitStores')}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.franchiseStores')}</p>
                      <p className="font-semibold text-gray-900">{franchisedStores} {t('franchisee.table.unitStores')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* --- 省级总代理概览信息卡片 --- */}
            {isAgent && agentType === 'province_agent' && (() => {
              const perfMonthly = infoCards.monthlyRevenue || overviewPerformance?.monthly_total || 0;
              const ownStores = infoCards.ownStoreCount;
              const franchisedStores = infoCards.franchisedStoreCount;
              const managedStores = infoCards.managedStoreCount;
              const managedFranchisees = infoCards.managedFranchiseeCount;
              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{t('franchisee.level.province')}</h2>
                      <p className="text-xs text-gray-500">
                        {t('franchisee.overview.ownStores')} {ownStores} {t('franchisee.table.unitStores')} · {t('franchisee.overview.franchiseStores')} {franchisedStores} {t('franchisee.table.unitStores')} · {t('franchisee.overview.provinceManaged')}
                        {managedData?.region ? ` · ${managedData.region}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.monthlyPerformanceSelfAndProvince')}</p>
                      <p className="font-semibold text-green-600 text-lg">{formatCurrency(perfMonthly, i18n.language)}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t("franchisee.overview.selfStores")}</p>
                      <p className="font-semibold text-gray-900">{ownStores} {t("franchisee.table.unitStores")}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.myFranchisees')}</p>
                      <p className="font-semibold text-gray-900">{managedFranchisees} {t('franchisee.table.unitStores')}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{t('franchisee.overview.provinceManagedStores')}</p>
                      <p className="font-semibold text-gray-900">{managedStores} {t('franchisee.table.unitStores')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 门店列表 / 门店详情 */}
            {selectedStoreId ? (
              <div>
                <button onClick={() => setSelectedStoreId(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
                  <ArrowLeft className="h-4 w-4" /> {t('franchisee.overview.backToStoreList')}
                </button>
                {detailLoading ? (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('franchisee.store.loading')}</div>
                ) : storeDetail ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{storeDetail.name}</h2>
                          <p className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {storeDetail.city} · {storeDetail.address || '—'} · {t('franchisee.store.code')}: <span className="font-mono text-blue-600">{storeDetail.store_code || '—'}</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${storeDetail.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{storeDetail.status === 'active' ? t('franchisee.status.operational') : t('franchisee.store.pendingActivation')}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{storeDetail.total_batteries || 0}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('franchisee.stats.batteries')}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{(storeDetail.revenue_share || 0.3) * 100}%</div>
                          <div className="text-xs text-gray-500 mt-1">{t('franchisee.revenue.rentalSplit')}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">{(storeDetail.bound_investor_count) || 0}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('franchisee.overview.boundInvestors')}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{formatCurrency(storeDetail.monthly_total || 0, i18n.language)}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('franchisee.overview.monthlyPerformance')}</div>
                        </div>
                      </div>
                    </div>

                    {/* 门店照片 */}
                    {((storeDetail.images && storeDetail.images.length > 0) || storeDetail.photo_url) && (
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-lg mb-4">{t('franchisee.storePhoto')}</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {[...(storeDetail.images || []), ...(storeDetail.photo_url ? [storeDetail.photo_url] : [])].map((url, i) => (
                            <img key={i} src={url} alt={`${storeDetail.name} ${t('franchisee.store.storePhoto')} ${i + 1}`}
                              className="w-48 h-36 object-cover rounded-lg bg-gray-50 flex-shrink-0" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 绑定投资者列表 */}
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{t('franchisee.overview.boundInvestors')}</h3>
                        {!storeDetail.is_managed && (
                        <button onClick={() => { setShowStaffRegister(true); setStaffResult(null); }}
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                          <UserPlus className="h-4 w-4" /> {t('franchisee.modal.registerInvestor')}
                        </button>
                        )}
                      </div>
                      {storeDetail.bound_investors?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-3">{t('franchisee.table.code')}</th>
                                <th className="text-left p-3">{t('franchisee.table.username')}</th>
                                <th className="text-left p-3">{t('franchisee.table.email')}</th>
                                <th className="text-right p-3">{t('franchisee.table.bindTime')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {storeDetail.bound_investors.map((inv, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-3 font-mono text-xs text-blue-600">{inv.investor_code || '—'}</td>
                                  <td className="p-3 font-medium">{inv.username}</td>
                                  <td className="p-3 text-gray-500">{inv.email}</td>
                                  <td className="p-3 text-right text-gray-400">{formatDate(inv.bound_at, i18n.language)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">{t('franchisee.overview.noBoundInvestors')}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-500">{t('franchisee.store.loadFailed')}</div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t('franchisee.myStores')}</h2>
                  </div>
                  {stores.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">{t('franchisee.noStoreGoApply', { applyTitle: t('franchisee.apply.title') })}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* {t('franchisee.store.selfOperated')} */}
                      {(() => {
                        const selfStores = stores.filter(s => s.store_type !== 'franchised' && !s.is_managed && s.owner_id === user?.id);
                        if (selfStores.length === 0) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Store className="h-4 w-4 text-blue-600" />
                              <h3 className="font-bold text-gray-900">{t('franchisee.overview.selfStores')}</h3>
                              <span className="text-xs text-gray-400">（{selfStores.length} {t('franchisee.table.unitStores')}）</span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              {selfStores.map(s => (
                                <div key={s.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition relative group">
                                  {(s.images?.[0] || s.photo_url) && <img src={s.images?.[0] || s.photo_url} alt={s.name} className="w-full h-48 object-cover rounded-lg mb-3 bg-gray-50" />}
                                  <div className="flex justify-between items-start mb-3">
                                    <div><h3 className="font-bold text-gray-900">{s.name}</h3>
                                      <p className="flex items-center text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 mr-1" />{s.city}</p>
                                      {s.store_code && <p className="text-xs font-mono text-blue-600 mt-0.5">{s.store_code}</p>}</div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-orange-100 text-orange-700' : s.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? t('franchisee.store.statusActive') : s.status === 'pending' ? t('franchisee.status.pending') : s.status === 'suspended' ? t('franchisee.store.statusSuspended') : t('franchisee.store.statusClosed')}</span>
                                      {s.status === 'pending' && s.appeal_reason && (
                                        <span className="text-xs text-orange-600">{t('franchisee.store.appeal')}: {s.appeal_reason}</span>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                                        className="opacity-0 group-hover:opacity-100 transition p-1 text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {s.status === 'closed' && (
                                        <button onClick={(e) => { e.stopPropagation(); setAppealStoreId(s.id); setAppealStoreName(s.name); setAppealReason(''); setShowAppealModal(true); }}
                                          className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                                          {t('franchisee.store.appealReason')}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-400">{t('franchisee.store.activeBatteries')}:</span> <span className="font-semibold">{s.total_batteries || 0}</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.revenue.rentalSplit')}:</span> <span className="font-semibold">{(s.revenue_share || 0.3) * 100}%</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.overview.monthlyPerformance')}:</span> <span className="font-semibold text-green-600">{formatCurrency(s.monthly_sales || 0, i18n.language)}</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.overview.totalPerformance')}:</span> <span className="font-semibold text-blue-600">{formatCurrency(s.total_sales || 0, i18n.language)}</span></div>
                                  </div>
                                  <div onClick={() => openStoreDetail(s.id)} className="mt-3 text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                                    <Eye className="h-3 w-3" /> {t('franchisee.button.viewDetails')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* {t('franchisee.store.franchise')} */}
                      {(() => {
                        const franchisedStores = stores.filter(s => s.store_type === 'franchised' || s.is_managed || s.owner_id !== user?.id);
                        if (franchisedStores.length === 0) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Store className="h-4 w-4 text-green-600" />
                              <h3 className="font-bold text-gray-900">{t('franchisee.overview.franchiseStores')}</h3>
                              <span className="text-xs text-gray-400">（{franchisedStores.length} {t('franchisee.table.unitStores')}）</span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              {franchisedStores.map(s => (
                                <div key={s.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition relative group">
                                  {(s.images?.[0] || s.photo_url) && <img src={s.images?.[0] || s.photo_url} alt={s.name} className="w-full h-48 object-cover rounded-lg mb-3 bg-gray-50" />}
                                  <div className="flex justify-between items-start mb-3">
                                    <div><h3 className="font-bold text-gray-900">{s.name}</h3>
                                      <p className="flex items-center text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 mr-1" />{s.city}</p>
                                      {s.store_code && <p className="text-xs font-mono text-blue-600 mt-0.5">{s.store_code}</p>}</div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-orange-100 text-orange-700' : s.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? t('franchisee.store.statusActive') : s.status === 'pending' ? t('franchisee.status.pending') : s.status === 'suspended' ? t('franchisee.store.statusSuspended') : t('franchisee.store.statusClosed')}</span>
                                      {s.status === 'pending' && s.appeal_reason && (
                                        <span className="text-xs text-orange-600">{t('franchisee.store.appealReason')}: {s.appeal_reason}</span>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                                        className="opacity-0 group-hover:opacity-100 transition p-1 text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {s.status === 'closed' && (
                                        <button onClick={(e) => { e.stopPropagation(); setAppealStoreId(s.id); setAppealStoreName(s.name); setAppealReason(''); setShowAppealModal(true); }}
                                          className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                                          {t('franchisee.store.appealReason')}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-400">{t('franchisee.calculator.battery')}:</span> <span className="font-semibold">{s.total_batteries || 0}</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.calculator.split')}:</span> <span className="font-semibold">{(s.revenue_share || 0.3) * 100}%</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.calculator.monthlyTarget')}:</span> <span className="font-semibold text-green-600">{formatCurrency(s.monthly_sales || 0, i18n.language)}</span></div>
                                    <div><span className="text-gray-400">{t('franchisee.calculator.cumulativeTarget')}:</span> <span className="font-semibold text-blue-600">{formatCurrency(s.total_sales || 0, i18n.language)}</span></div>
                                  </div>
                                  <div onClick={() => openStoreDetail(s.id)} className="mt-3 text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                                    <Eye className="h-3 w-3" /> {t('franchisee.store.viewDetail')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 近期引导订单 */}
            <div>
              <h2 className="text-xl font-bold mb-4">{t('franchisee.orders.recentOrders')}</h2>
              {allStoreOrders.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500">{t('franchisee.orders.noStoreOrders')}</div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">{t('franchisee.orders.orderType')}</th><th className="text-left p-3">{t('franchisee.orders.asset')}</th><th className="text-left p-3">{t('franchisee.orders.store')}</th><th className="text-right p-3">{t('franchisee.orders.quantity')}</th><th className="text-right p-3">{t('franchisee.earnings.purchaseAmount')}</th><th className="text-right p-3">{t('franchisee.calculator.monthlyRentLabel')}</th><th className="text-right p-3">{t('franchisee.orders.purchaseCommission')}</th><th className="text-right p-3">{t('franchisee.orders.rentDividend')}</th><th className="text-right p-3">{t('franchisee.orders.time')}</th></tr></thead>
                    <tbody>{allStoreOrders.slice(0, 10).map(o => (
                      <tr key={o.id} className="border-t"><td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.order_type === '投资者绑定' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {getOrderTypeDisplay(o.order_type, t)}
                        </span>
                      </td><td className="p-3">{resolveI18n(o, 'asset_name_i18n', o.asset_name, i18n) || o.battery_type || '-'}</td><td className="p-3">{o.store?.name || o.store_name || '-'}</td><td className="p-3 text-right">{o.units || 1}</td><td className="p-3 text-right font-medium">{formatCurrency(o.purchase_amount || o.total_amount || o.amount || 0, i18n.language)}</td><td className="p-3 text-right text-gray-600">{formatCurrency(o._monthlyRent || 0, i18n.language)}</td><td className="p-3 text-right font-medium text-green-600">{formatCurrency(o.store_commission || 0, i18n.language)}</td><td className="p-3 text-right font-medium text-blue-600">{formatCurrency(o.revenue_share || 0, i18n.language)}</td><td className="p-3 text-right text-gray-400">{formatDate(o.created_at, i18n.language)}</td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </div>
          {/* --- 门店列表区域结束 --- */}

          {/* --- 市级加盟商：管辖加盟门店（合并自 city-franchisees Tab） --- */}
          {isAgent && agentType === 'city_franchisee' && (
            <div className="pt-6 border-t-2 border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">{t('franchisee.overview.managedStores')}</h3>
                {managedData?.stores && <span className="text-sm text-gray-500">（{managedData.stores.length} {t('franchisee.table.unitStores')}）</span>}
              </div>
              {managedLoading ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('common.loading')}</div>
              ) : managedData?.stores?.length > 0 ? (
                <div className="bg-white rounded-xl border">
                  <div className="divide-y">
                    {managedData.stores.map(s => (
                      <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{s.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? t('franchisee.store.statusActive') : s.status === 'suspended' ? t('franchisee.store.statusSuspended') : t('franchisee.store.statusClosed')}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            {s.city && <span>{t('franchisee.store.city')}: {s.city}</span>}
                            {s.address && <span>{t('franchisee.store.address')}: {s.address}</span>}
                            {s.phone && <span>{t('franchisee.store.phone')}: {s.phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">{t('franchisee.store.edit')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <Home className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>{t('franchisee.store.noStores')}</p>
                </div>
              )}
            </div>
          )}

          {/* --- 省级总代理：管辖加盟商 + 全省门店（合并自 province-franchisees Tab） --- */}
          {isAgent && agentType === 'province_agent' && (
            <>
              {/* {t('franchisee.store.franchiseeList')} */}
              <div className="pt-6 border-t-2 border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">{t('franchisee.overview.myFranchisees')}</h3>
                </div>
                {managedLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('common.loading')}</div>
                ) : managedFranchiseesData?.franchisee_groups && Object.keys(managedFranchiseesData.franchisee_groups).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(managedFranchiseesData.franchisee_groups).map(([city, franchisees]) => (
                      <div key={city} className="bg-white rounded-xl border">
                        <div className="px-5 py-3 border-b bg-gray-50">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <h4 className="font-bold">{city} ({(franchisees || []).length} {t('franchisee.table.unitStores')})</h4>
                          </div>
                        </div>
                        <div className="divide-y">
                          {(franchisees || []).map(f => (
                            <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                              <div>
                                <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {f.agent_type === 'city_franchisee' ? t('franchisee.agent.city') : f.agent_type || t('franchisee.agent.franchisee')}
                                </span>
                                {f.store_count !== undefined && <span className="ml-2 text-sm text-gray-400">{t('franchisee.overview.subStores')}: {f.store_count} {t('franchisee.table.unitStores')}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : managedFranchiseesData?.franchisees?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="divide-y">
                      {managedFranchiseesData.franchisees.map(f => (
                        <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {f.agent_type === 'city_franchisee' ? t('franchisee.agent.city') : f.agent_type || t('franchisee.agent.franchisee')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>{t('franchisee.overview.noFranchisees')}</p>
                  </div>
                )}
              </div>

              {/* {t('franchisee.store.provinceAllStores')} */}
              <div className="pt-6 border-t-2 border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">{t('franchisee.overview.allProvinceStores')}</h3>
                  {provinceStores?.stores && <span className="text-sm text-gray-500">（{provinceStores.stores.length} {t('franchisee.table.unitStores')}）</span>}
                </div>
                {provinceStoresLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('common.loading')}</div>
                ) : provinceStores?.stores?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="divide-y">
                      {provinceStores.stores.map(s => (
                        <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{s.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'active' ? t('franchisee.status.operational') : '待激活'}</span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {s.city && <span>{t('franchisee.store.city')}: {s.city}</span>}
                              {s.address && <span>{t('franchisee.store.address')}: {s.address}</span>}
                              {s.phone && <span>{t('franchisee.store.phone')}: {s.phone}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">{t("franchisee.store.edit")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                    <Store className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>{t('franchisee.overview.noManagedStores')}</p>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        )}

        {/* ==================== Tab: 加盟规则 ==================== */}
        {activeTab === 'rules' && (
          <div className="space-y-10">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">{t('franchisee.rules.threeTierSystem')}</h2>
                <p className="text-blue-200 text-sm mt-1">{t('franchisee.rules.rightsAndObligations')}</p>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">{t('franchisee.table.level')}</th>
                      <th className="text-right p-3 font-semibold text-gray-700">{t('franchisee.table.fee')}</th>
                      <th className="text-right p-3 font-semibold text-gray-700">{t('franchisee.table.deposit')}</th>
                      <th className="text-right p-3 font-semibold text-gray-700">{t('franchisee.table.performanceTarget')}</th>
                      <th className="text-right p-3 font-semibold text-gray-700">{t('franchisee.table.downstreamCommission')}</th>
                      <th className="text-right p-3 font-semibold text-gray-700">{t('franchisee.table.downstreamShare')}</th>
                      <th className="text-left p-3 font-semibold text-gray-700">{t('franchisee.table.areaProtection')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFranchiseLevels(t).map((l, i) => (
                      <tr key={i} className={`border-b ${i === 0 ? 'bg-blue-50/50' : i === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="p-3 font-bold">{l.level}<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.badge}</span></td>
                        <td className="p-3 text-right font-semibold text-blue-700">{formatCurrency(l.fee, i18n.language)}</td>
                        <td className="p-3 text-right">{formatCurrency(l.deposit, i18n.language)}</td>
                        <td className="p-3 text-right">{formatCurrency(l.performanceTarget, i18n.language)}</td>
                        <td className="p-3 text-right font-semibold text-green-600">{l.commission}</td>
                        <td className="p-3 text-right font-semibold text-blue-600">{l.revShare}</td>
                        <td className="p-3">{l.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <strong>{t('franchisee.rules.depositRefundTitle')}</strong>{t('franchisee.rules.depositRefundDesc')}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-bold mb-4">{t('franchisee.rules.revenueShareSystem')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-3">{t("franchisee.table.tier")}</th>
                      <th className="text-right p-3">{t("franchisee.table.rentalSplit")}</th>
                      <th className="text-right p-3">{t("franchisee.table.salesCommission")}</th>
                      <th className="text-left p-3">{t("franchisee.table.description")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: t('franchisee.rules.investor'), rent: '70%', comm: '—', desc: t('franchisee.rules.investorDesc'), hl: true },
                      { role: t('franchisee.rules.provinceAgent'), rent: `5%（${t('franchisee.overview.ownStores')}）| 2%（${t('franchisee.rules.downstream')}）`, comm: `5%（${t('franchisee.overview.ownStores')}）| 2%（${t('franchisee.rules.downstream')}）`, desc: t('franchisee.rules.provinceDesc') },
                      { role: t('franchisee.rules.cityAgent'), rent: `5%（${t('franchisee.overview.ownStores')}）| 3%（${t('franchisee.rules.downstream')}）`, comm: `5%（${t('franchisee.overview.ownStores')}）| 3%（${t('franchisee.rules.downstream')}）`, desc: t('franchisee.rules.cityDesc') },
                      { role: t('franchisee.rules.districtStore'), rent: '5%', comm: '5%', desc: t('franchisee.rules.districtDesc') },
                    ].map((r, i) => (
                      <tr key={i} className={`border-b ${r.hl ? 'bg-blue-50/50 font-semibold' : ''}`}>
                        <td className="p-3">{r.role}</td>
                        <td className={`p-3 text-right ${r.hl ? 'text-blue-700' : 'text-gray-700'}`}>{r.rent}</td>
                        <td className="p-3 text-right text-gray-700">{r.comm}</td>
                        <td className="p-3 text-gray-500 text-xs">{r.desc}</td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">{t("franchisee.rules.coreBenefits")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {getBenefits(t).map((b, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 text-center hover:shadow-md transition">
                    <b.icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm mb-1">{b.title}</h4>
                    <p className="text-xs text-gray-500">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">{t("franchisee.rules.obligations")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {getObligations(t).map((o, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 text-center hover:shadow-md transition">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold mx-auto mb-2">{o.num}</div>
                    <h4 className="font-bold text-sm mb-1">{o.title}</h4>
                    <p className="text-xs text-gray-500">
                      {i === 2
                        ? <>{t('franchisee.obligation.targetDescPrefix')}: {formatCurrency(getFranchiseLevels(t)[0].performanceTarget, i18n.language)} / {formatCurrency(getFranchiseLevels(t)[1].performanceTarget, i18n.language)} / {formatCurrency(getFranchiseLevels(t)[2].performanceTarget, i18n.language)}</>
                        : o.desc
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">{t("franchisee.rules.riskControl")}</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {getRiskControls(t).map((rc, i) => (
                  <div key={i} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <rc.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-bold">{rc.title}</h4>
                    </div>
                    <ul className="space-y-2">
                      {rc.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                          <BadgeCheck className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">{t("franchisee.rules.batteryProcurement")}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).map(p => (
                  <div key={p.id || p.name} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Battery className="h-5 w-5 text-blue-600" />
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.displayName || p.id || p.name}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{p.displayName || p.name}</h4>
                    <p className="text-xs text-gray-500 mb-3">{p.displayScene || p.scene}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs border-t pt-3">
                      <div><span className="text-gray-400">{t("franchisee.product.voltage")}:</span> {p.voltage}</div>
                      <div><span className="text-gray-400">{t("franchisee.product.energy")}:</span> {p.energy}</div>
                      <div><span className="text-gray-400">{t("franchisee.product.price")}:</span> {formatCurrency(p.price, i18n.language)}</div>
                      <div><span className="text-gray-400">{t("franchisee.product.weight")}:</span> {p.weight}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-4">{t("franchisee.rules.platformNote")}</p>
            </div>
          </div>
        )}

        {/* ==================== Tab: 收益测算 ==================== */}
        {activeTab === 'calculator' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t("franchisee.calculator.title")}</h2>
              <p className="text-gray-500 text-sm">{t("franchisee.calculator.description")}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border p-6 space-y-5">
                <h3 className="font-bold text-lg">{t('franchisee.calculator.params')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.calculator.level')}</label>
                  <select value={calcStoreType} onChange={e => setCalcStoreType(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                    <option value="province">{t('franchisee.rules.provinceAgent')}</option>
                    <option value="city">{t('franchisee.calculator.cityLevel')}</option>
                    <option value="district">{t('franchisee.calculator.districtLevel')}</option>
                  </select>
                </div>

                {calcStoreType !== 'district' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('franchisee.calculator.downstreamSales')}
                      <span className="text-gray-400 font-normal ml-1">— {calcStoreType === 'province' ? t('franchisee.calculator.provinceCommissionRate') : t('franchisee.calculator.cityCommissionRate')}</span>
                    </label>
                    <input type="number" min="0" step="1" value={calcDownstreamSales} onChange={e => setCalcDownstreamSales(e.target.value)}
                      placeholder={calcStoreType === 'province' ? t('franchisee.calculator.provincePlaceholder') : t('franchisee.calculator.cityPlaceholder')}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('franchisee.calculator.selectBattery')}</label>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">{t('franchisee.calculator.twoWheelerSection')}</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'swap').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('franchisee.calculator.perUnit')} · {t('franchisee.calculator.monthlyRentLabel')}{battery.monthlyRent > 0 ? formatCurrency(battery.monthlyRent, i18n.language) : formatCurrency(Math.round(battery.price * 0.05), i18n.language)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('franchisee.calculator.catVehicle')}</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'vehicle').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('franchisee.calculator.perUnit')} · {t('franchisee.calculator.monthlyRentLabel')}{battery.monthlyRent > 0 ? formatCurrency(battery.monthlyRent, i18n.language) : formatCurrency(Math.round(battery.price * 0.05), i18n.language)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('franchisee.calculator.essSection')}</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'ess').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('franchisee.calculator.perUnit')} · {t('franchisee.calculator.monthlyRentLabel')}{battery.monthlyRent > 0 ? formatCurrency(battery.monthlyRent, i18n.language) : formatCurrency(Math.round(battery.price * 0.05), i18n.language)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">{t('franchisee.calculator.containerSection')}</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'container').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.displayName || battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatCurrency(battery.price, i18n.language)}{t('franchisee.calculator.perUnit')} · {t('franchisee.calculator.monthlyRentLabel')}{battery.monthlyRent > 0 ? formatCurrency(battery.monthlyRent, i18n.language) : formatCurrency(Math.round(battery.price * 0.05), i18n.language)}</div>
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
                    <button onClick={() => setCalcBatteryCounts({})} className="mt-2 text-xs text-red-500 hover:text-red-700">{t('franchisee.calculator.clearAll')}</button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const r = getCalcResult();
                  if (!r) return (
                    <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                      <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{t('franchisee.calculator.selectHint')}</p>
                    </div>
                  );
                  return (
                    <>
                      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6">
                        <p className="text-blue-200 text-sm mb-1">{t('franchisee.calculator.monthlyTotal')}</p>
                        <div className="text-4xl font-bold">{formatCurrency(r.franchiseeMonthly, i18n.language)}</div>
                        <p className="text-blue-200 text-sm mt-2">{t('franchisee.calculator.selfSalesLabel')}{t('franchisee.earnings.commission')}{t('franchisee.calculator.oneTimeParen')} + {t('franchisee.calculator.selfRentalTitle')}{(r.selfRentalRate * 100).toFixed(0)}%{r.downstreamCommissionRate > 0 ? ` + ${t('franchisee.calculator.downstreamCommissionTitle')}${(r.downstreamCommissionRate * 100).toFixed(0)}%+${t('franchisee.earnings.share')}${(r.downstreamRentalRate * 100).toFixed(0)}%` : ''}</p>
                      </div>
                      <div className="bg-white rounded-xl border p-6 space-y-4">
                        <h3 className="font-bold">{t('franchisee.calculator.detail')}</h3>
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <p className="font-semibold text-gray-700 text-sm mb-2">{t('franchisee.calculator.deployList')}</p>
                          {r.details.map(d => (<div key={d.id} className="flex justify-between"><span>{d.displayName || d.name} × {d.count}</span><span className="text-gray-700">{formatCurrency(d.invest, i18n.language)}</span></div>))}
                        </div>
                        <hr className="border-gray-100" />
                        {[{ label: t('franchisee.calculator.totalInvestment'), value: formatCurrency(r.totalInvestment, i18n.language), bold: true }, { label: t('franchisee.calculator.totalMonthlyRent'), value: formatCurrency(r.totalMonthlyRent, i18n.language) }].map((item, i) => (
                          <div key={i} className={`flex justify-between text-sm ${item.bold ? 'font-bold text-base border-t pt-3 mt-1 border-gray-100' : ''}`}>
                            <span className="text-gray-600">{item.label}</span><span className="text-gray-900">{item.value}</span>
                          </div>
                        ))}
                        <hr className="border-gray-100" />
                        <p className="text-xs text-gray-500 font-semibold mb-1">{t('franchisee.calculator.revenueBreakdown')}</p>
                        {[
                          { label: `${t('franchisee.calculator.selfRentalTemplate', { rate: (r.selfRentalRate * 100).toFixed(0) })}`, value: formatCurrency(r.selfRentalAmount || 0, i18n.language), color: 'text-blue-600 font-medium' },
                          ...(r.downstreamRentalRate > 0 ? [
                            { label: `${t('franchisee.calculator.downstreamShareTemplate', { rate: (r.downstreamRentalRate * 100).toFixed(0) })}`, value: formatCurrency(r.downstreamRentalMonthly || 0, i18n.language), color: 'text-indigo-600 font-medium' },
                          ] : []),
                          { label: t('franchisee.calculator.yourMonthlyRevenue'), value: formatCurrency(r.franchiseeMonthly, i18n.language), color: 'text-blue-600 font-bold' },
                          { label: '---', value: '', color: 'text-gray-300' },
                          { label: `${t('franchisee.calculator.selfCommissionTemplate', { rate: (r.selfCommissionRate * 100).toFixed(0) })}`, value: formatCurrency(r.selfCommissionAmount || 0, i18n.language), color: 'text-orange-600 font-medium' },
                          ...(r.downstreamCommissionRate > 0 ? [
                            { label: t('franchisee.calculator.downstreamCommissionTemplate', { rate: (r.downstreamCommissionRate * 100).toFixed(0) }), value: formatCurrency(r.downstreamCommissionAnnual || 0, i18n.language), color: 'text-purple-600 font-medium' },
                          ] : []),
                          { label: '---', value: '', color: 'text-gray-300' },
                          { label: t('franchisee.calculator.investorMonthly'), value: formatCurrency(r.investorMonthly, i18n.language), color: 'text-green-600' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.label}</span><span className={item.color}>{item.value}</span></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-blue-600">{r.investorAnnualReturn}%</div><div className="text-xs text-gray-500 mt-1">{t('franchisee.calculator.investorAnnualReturn')}</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-green-600">{isFinite(r.investorPaybackMonths) ? (r.investorPaybackMonths < 12 ? `${r.investorPaybackMonths.toFixed(1)}${t('franchisee.calculator.monthUnit')}` : `${(r.investorPaybackMonths / 12).toFixed(1)}${t('franchisee.calculator.yearUnit')}`) : '—'}</div><div className="text-xs text-gray-500 mt-1">{t('franchisee.calculator.investorPaybackPeriod')}</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-purple-600">{formatCurrency(r.franchiseeAnnual, i18n.language)}</div><div className="text-xs text-gray-500 mt-1">{t('franchisee.calculator.yourAnnual')}</div></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ==================== Tab: 优秀案例 ==================== */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('franchisee.cases.pageTitle')}</h2>
              <p className="text-gray-500 text-sm">{t('franchisee.cases.pageDesc')}</p>
            </div>
            {casesLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('common.loading')}</div>
            ) : topCases.length > 0 ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {topCases.map((c, i) => (
                  <div key={c.id || i} className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition group">
                    <div className={`bg-gradient-to-r ${i === 0 ? 'from-yellow-500 to-orange-500' : i === 1 ? 'from-gray-400 to-gray-600' : i === 2 ? 'from-amber-600 to-amber-800' : 'from-blue-500 to-blue-700'} px-5 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">{i < 3 ? <Award className="h-5 w-5 text-white" /> : <Star className="h-5 w-5 text-white" />}<span className="text-white font-bold">TOP {c.rank || (i + 1)}</span></div>
                      <span className="text-white/80 text-sm">{c.city || c.region || ''}</span>
                    </div>
                    {(c.images?.[0] || c.photo_url) && <img src={c.images?.[0] || c.photo_url} alt={c.name} className="w-full h-40 object-cover" />}
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-1">{c.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mb-4"><MapPin className="h-3 w-3" />{c.city || '—'} {c.address ? `· ${c.address}` : ''}</p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{c.battery_count || c.total_batteries || 0}</div><div className="text-xs text-gray-500">{t('franchisee.cases.batteryCountUnit')}</div></div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{c.status === 'active' ? t('franchisee.status.operational') : c.status || '—'}</div><div className="text-xs text-gray-500">{t('franchisee.cases.franchiseStatus')}</div></div>
                      </div>
                      {c.store_code && <p className="text-xs text-gray-400 font-mono">{t('franchisee.cases.storeCode')}: {c.store_code}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">{t('franchisee.cases.empty')}</p>
                <p className="text-sm mt-1">{t('franchisee.cases.comingSoon')}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: {t('franchisee.earnings.pageTitle')} ==================== */}
        {activeTab === 'earnings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('franchisee.earnings.title')}</h2>
              <p className="text-gray-500 text-sm">{t('franchisee.earnings.pageDesc')}</p>
            </div>

            {earningsLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('franchisee.earnings.loading')}</div>
            ) : earningsData ? (
              <>
                {/* 预计收益（当月，次月1日到账） */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6">
                  <div className="text-blue-200 text-sm">{t('franchisee.earnings.pendingLabel')}</div>
                  <div className="text-4xl font-bold mt-1">{formatCurrency(earningsData.pending_total || 0, i18n.language)}</div>
                  <div className="text-blue-200 text-xs mt-2">{t('franchisee.earnings.settlementDate')}</div>
                </div>

                {/* 已到账收益 */}
                <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-xl p-6">
                  <div className="text-green-200 text-sm">{t('franchisee.earnings.settledLabel')}</div>
                  <div className="text-4xl font-bold mt-1">{formatCurrency(walletData.cumulativeEarnings || 0, i18n.language)}</div>
                  <div className="text-green-200 text-xs mt-2">{t('franchisee.earnings.settledDesc')}</div>
                </div>

                {/* 合计 */}
                <div className="bg-white rounded-xl border p-4 text-center">
                  <span className="text-gray-500 text-sm">{t('franchisee.earnings.totalLabel')}: </span>
                  <span className="text-xl font-bold text-gray-800">{formatCurrency(earningsData.grand_total || 0, i18n.language)}</span>
                </div>

                {/* {t('franchisee.earnings.ownStoreTitle')} */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" /> {t('franchisee.earnings.ownStoreTitle')}
                    <span className="text-xs text-gray-400 font-normal ml-2">{t('franchisee.earnings.ownStoreDesc')}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-700">{formatCurrency(earningsData.self_earnings?.purchase_commission || 0, i18n.language)}</div>
                      <div className="text-xs text-green-600 mt-1">{t('franchisee.earnings.purchaseCommission')}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-700">{formatCurrency(earningsData.self_earnings?.rental_share || 0, i18n.language)}</div>
                      <div className="text-xs text-blue-600 mt-1">{t('franchisee.earnings.rentalShare')}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-700">{formatCurrency(earningsData.self_earnings?.total || 0, i18n.language)}</div>
                      <div className="text-xs text-gray-500 mt-1">{t('franchisee.earnings.subtotal')}</div>
                    </div>
                  </div>
                  {earningsData.self_earnings?.stores?.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">{t('franchisee.earnings.byStore')}</p>
                      <div className="space-y-2">
                        {earningsData.self_earnings.stores.map(s => (
                          <div key={s.store_id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{s.store_name}</span>
                              {s.rent_start_date && (
                                <span className="text-xs text-gray-400 ml-1">（{t('franchisee.earnings.rentStartTemplate', { date: s.rent_start_date })}）</span>
                              )}
                            </div>
                            <div className="flex gap-4 text-right">
                              <span className="text-green-600">{t('franchisee.earnings.commission')} {formatCurrency(s.purchase_commission || 0, i18n.language)}</span>
                              <span className="text-blue-600">{t('franchisee.earnings.share')} {formatCurrency(s.rental_share || 0, i18n.language)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 下辖门店收益 */}
                {earningsData.city_earnings && (
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" /> {t('franchisee.earnings.franchiseStoreTitle')}
                      <span className="text-xs text-gray-400 font-normal ml-2">
                        {t('franchisee.earnings.franchiseStoreDesc', { rate: agentType === 'province_agent' ? '2%' : '3%' })}
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-700">{formatCurrency(earningsData.city_earnings?.purchase_commission || 0, i18n.language)}</div>
                        <div className="text-xs text-purple-600 mt-1">{t('franchisee.earnings.purchaseCommissionRate', { rate: agentType === 'province_agent' ? '2%' : '3%' })}</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-indigo-700">{formatCurrency(earningsData.city_earnings?.rental_share || 0, i18n.language)}</div>
                        <div className="text-xs text-indigo-600 mt-1">{t('franchisee.earnings.rentalShareRate', { rate: agentType === 'province_agent' ? '2%' : '3%' })}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-700">{formatCurrency(earningsData.city_earnings?.total || 0, i18n.language)}</div>
                        <div className="text-xs text-gray-500 mt-1">{t('franchisee.earnings.subtotal')}</div>
                      </div>
                    </div>
                    {/* 下辖门店明细 */}
                    {earningsData.city_earnings?.details?.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-600 mb-2">{t('franchisee.earnings.sourceDetails')}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2 pr-2">{t('franchisee.earnings.investorAccount')}</th>
                                <th className="pb-2 pr-2 text-right">{t('franchisee.earnings.purchaseAmount')}</th>
                                <th className="pb-2 pr-2 text-right">{t('franchisee.earnings.commission')}</th>
                                <th className="pb-2 pr-2 text-right">{t('franchisee.calculator.monthlyRentLabel')}</th>
                                <th className="pb-2 pr-2 text-right">{t('franchisee.earnings.share')}</th>
                                <th className="pb-2 pr-2">{t('franchisee.earnings.rentStartDate')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {earningsData.city_earnings.details.map((d, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                  <td className="py-2 pr-2 font-medium text-gray-800">{d.investor_email || d.store_name}</td>
                                  <td className="py-2 pr-2 text-right">{formatCurrency(d.purchase_amount || 0, i18n.language)}</td>
                                  <td className="py-2 pr-2 text-right text-purple-600">{formatCurrency(d.commission || 0, i18n.language)}</td>
                                  <td className="py-2 pr-2 text-right">{formatCurrency(d.monthly_rent || 0, i18n.language)}</td>
                                  <td className="py-2 pr-2 text-right text-indigo-600">{formatCurrency(d.rent_share || 0, i18n.language)}</td>
                                  <td className="py-2 pr-2 text-xs text-gray-400">{d.rent_start_date ? t('franchisee.earnings.rentStartTemplate', { date: d.rent_start_date }) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 收益计算逻辑说明 */}
                <div className="bg-gray-50 rounded-xl border p-5 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600 mb-1">{t('franchisee.earnings.calcLogic')}</p>
                  <p>· {t('franchisee.earnings.calcLogic1')}</p>
                  <p>· {t('franchisee.earnings.calcLogic2')}</p>
                  <p>· {t('franchisee.earnings.calcLogic3', { rate: agentType === 'province_agent' ? '2%' : '3%' })}</p>
                  {agentType === 'province_agent' && <p>· {t('franchisee.earnings.calcLogic4')}</p>}
                </div>

                {/* 无收益提示 */}
                {(!earningsData.self_earnings?.stores?.length && !earningsData.city_earnings) && (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">{t('franchisee.earnings.noData')}</p>
                    <p className="text-sm mt-1">{t('franchisee.earnings.noDataHint')}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('franchisee.earnings.loadError')}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: {t('franchisee.wallet.title')} ==================== */}
        {activeTab === 'wallet' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('franchisee.wallet.title')}</h2>
              <p className="text-gray-500 text-sm">{t('franchisee.wallet.subtitle')}</p>
            </div>

            {walletLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('common.loading')}</div>
            ) : (!(applications || []).some(a => a.status === 'approved') && !isAgent) ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">{t('franchisee.wallet.noApprovalHint')}</p>
                <p className="text-sm mt-1">{t('franchisee.wallet.noApprovalSub')}</p>
              </div>
            ) : (
              <>
                {/* 我的余额双tab并排 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border overflow-hidden p-5">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-5">
                      <div className="text-blue-200 text-sm mb-1">{t('franchisee.wallet.balanceLabel')}</div>
                      <div className="text-3xl font-bold">{formatCurrency(walletData.totalBalance || 0, i18n.language)}</div>
                      
                      <div className="text-blue-200 text-xs mt-2">{t('franchisee.wallet.balanceBreakdown')}</div>
                      <div className="mt-3 bg-blue-500/30 rounded-lg px-3 py-2 text-xs">
                        {t('franchisee.wallet.balanceBreakdownDetail', { deposit: formatCurrency(walletData.depositAmount || 0, i18n.language), earnings: formatCurrency(walletData.cumulativeEarnings || 0, i18n.language) })}
                      </div>
                      {walletData.pendingEarnings > 0 && (
                        <div className="mt-2 bg-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-100">
                          {t('franchisee.wallet.pendingEarnings') || '待结算收益'}: {formatCurrency(walletData.pendingEarnings || 0, i18n.language)} ({t('franchisee.wallet.pendingEarningsHint') || '次月1日到账'})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden p-5">
                    {walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? (
                      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-xl p-5">
                        <div className="text-green-200 text-sm mb-1">{t('franchisee.wallet.withdrawableLabel')}</div>
                        <div className="text-3xl font-bold">{formatCurrency(walletData.postTargetWithdrawable || 0, i18n.language)}</div>
                        <div className="text-green-200 text-xs mt-2">{t('franchisee.wallet.balanceBreakdown')}</div>
                        <div className="mt-3 bg-green-500/30 rounded-lg px-3 py-2 text-xs">{t('franchisee.wallet.targetMetHint')}</div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 text-white rounded-xl p-5">
                        <div className="text-yellow-200 text-sm mb-1">{t('franchisee.wallet.withdrawableLabel')}</div>
                        <div className="text-3xl font-bold">{formatCurrency(walletData.preTargetWithdrawable || 0, i18n.language)}</div>
                        <div className="text-yellow-200 text-xs mt-2">{t('franchisee.wallet.withdrawableBreakdown')}</div>
                        <div className="mt-3 bg-yellow-500/30 rounded-lg px-3 py-2 text-xs">{t('franchisee.wallet.targetNotMetHint')}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 提现按钮 */}
                <div className="flex justify-end gap-3">
                  <button onClick={() => {
                    setWithdrawModalForm({
                      amount: '',
                      bank_name: '',
                      bank_account: '',
                      bank_holder: '',
                      business_license_url: '',
                      invoice_info_url: '',
                      vat_invoice_url: ''
                    });
                    setShowWithdrawModal(true);
                  }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md">
                    <DollarSign className="h-4 w-4" /> {t('franchisee.wallet.withdrawNow')}
                  </button>
                </div>

                {/* 资产概览 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border p-5">
                    <div className="text-sm text-gray-500 mb-1">{t('franchisee.wallet.myFranchiseFee')}</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(walletData.franchiseFee || 0, i18n.language)}</div>
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <div className="text-sm text-gray-500 mb-1">{t('franchisee.wallet.myDeposit')}</div>
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(walletData.depositAmount || 0, i18n.language)}</div>
                  </div>
                </div>

                {/* 业绩概览 */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" /> {t('franchisee.wallet.performanceTracking')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-blue-700">{formatCurrency(walletData.monthlyRevenue || 0, i18n.language)}</div>
                      <div className="text-xs text-blue-600 mt-1">{t('franchisee.wallet.cumulativePerformance')}（{t('franchisee.wallet.monthlyPerformance')}）</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-purple-700">{formatCurrency(walletData.cumulativePerformance || 0, i18n.language)}</div>
                      <div className="text-xs text-purple-600 mt-1">{t('franchisee.wallet.cumulativePerformance')}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-orange-700">{formatCurrency(walletData.performanceTarget || 0, i18n.language)}</div>
                      <div className="text-xs text-orange-600 mt-1">{t('franchisee.wallet.performanceTarget')}</div>
                    </div>
                    <div className={`rounded-lg p-4 ${walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className={`text-lg font-bold ${walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                        {walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? t('franchisee.wallet.targetMet') : t('franchisee.wallet.targetNotMet')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{t('franchisee.wallet.targetStatus')}</div>
                    </div>
                  </div>
                  {/* 业绩概览卡片结束 */}
                </div>

                {/* {t('franchisee.wallet.performanceTarget')}说明 */}
                <div className="bg-gray-50 rounded-xl border p-5 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600 mb-1">{t('franchisee.wallet.performanceNote')}</p>
                  <p>· {t('franchisee.wallet.provinceTargetNote')}</p>
                  <p>· {t('franchisee.wallet.cityTargetNote')}</p>
                  <p>· {t('franchisee.wallet.districtTargetNote')}</p>
                </div>

                {/* {t('franchisee.wallet.withdrawDetails')} */}
                <div className="bg-white rounded-xl border">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" /> {t('franchisee.wallet.withdrawDetails')}
                    </h3>
                  </div>
                  {withdrawalsLoading ? (
                    <div className="p-8 text-center text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />{t('franchisee.wallet.loading')}
                    </div>
                  ) : (withdrawals || []).length > 0 ? (
                    <div className="divide-y">
                      {withdrawals.map((w, i) => (
                        <div key={w.id || i} className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{formatCurrency(Number(w.amount) || 0, i18n.language)}</span><span className="text-xs text-gray-400 ml-2"></span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {w.status === 'approved' ? t('franchisee.wallet.approved') : w.status === 'rejected' ? t('franchisee.wallet.rejected') : t('franchisee.status.pending')}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {t('franchisee.wallet.applicationTime')}: {w.created_at ? new Date(w.created_at).toLocaleString('zh-CN') : '—'}
                              {w.review_note && <span className="ml-3 text-gray-400">{t('franchisee.wallet.note')}: {w.review_note}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-gray-400">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg">{t('franchisee.wallet.noRecords')}</p>
                      <p className="text-sm mt-1">{t('franchisee.wallet.noRecordsHint')}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== Tab: 申请开店 ==================== */}
        {activeTab === 'apply' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('franchisee.applyStore.title')}</h2>
            <p className="text-gray-500 text-sm mb-6">{t('franchisee.applyStore.desc')}</p>

            {applications.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-3">{t('franchisee.applicationRecords')}</h3>
                {applications.map(a => {
                  // 为已审批的申请查找匹配的电池站点
                  let matchedSite = null;
                  if (a.status === 'approved' && batterySites.length > 0) {
                    matchedSite = batterySites.find(s => {
                      const sn = (s.site_name || '').toLowerCase();
                      const an = (a.store_name || '').toLowerCase();
                      return sn.includes(an) || an.includes(sn);
                    });
                  }
                  return (
                    <div key={a.id} className="bg-white rounded-lg border p-4 mb-3">
                      <div className="flex justify-between items-center">
                        <div><span className="font-medium">{a.store_name}</span><span className="text-sm text-gray-500 ml-2">{a.city}</span></div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status === 'pending' ? t('franchisee.status.reviewing') : a.status === 'approved' ? t('franchisee.wallet.approved') : t('franchisee.wallet.rejected')}</span>
                      </div>
                      {/* 已审批：展示换电柜槽位图 */}
                      {a.status === 'approved' && matchedSite && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <InlineCabinetGrid site={matchedSite} />
                        </div>
                      )}
                      {a.status === 'approved' && !matchedSite && batterySitesLoaded && (
                        <div className="mt-2 text-xs text-gray-400 italic">{t('franchisee.noSiteData') || 'No live battery data available yet'}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {showApplyForm ? (
              <form onSubmit={handleApply} className="bg-white rounded-xl border p-6 space-y-4">
                {/* KYC 未认证警告 */}
                {user && user.kyc_status !== 'approved' && (
                  <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-700 font-medium text-sm">{t('franchisee.kycRequired')}</span>
                    <button type="button" onClick={() => router.push('/profile')} className="ml-auto bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">{t('franchisee.goToVerify')} →</button>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.targetRegionLabel')}</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {REGIONS.map(r => (
                      <button key={r.code} type="button" onClick={() => setApplyForm({ ...applyForm, region: r.code, city: r.cities[0] || '', custom_city: '', custom_country: '', district: '', province_agent_id: '', city_agent_id: '' })}
                        className={`py-2.5 px-3 text-sm rounded-lg border font-medium transition ${applyForm.region === r.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{t(REGION_KEY_MAP[r.code], r.name)}</button>
                    ))}
                  </div>
                </div>

                {/* ===== CN: 中国大陆代理选择 ===== */}
                {applyForm.region === 'cn' && (
                  <>
                    {agentOptionsLoading ? (
                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-600 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> {t('franchisee.applyStore.queryingAgent')}
                      </div>
                    ) : (
                      <>
                        {/* 省级总代理选择 */}
                        <div>
                          <label className="block text-sm font-medium mb-1.5">
                            <span className="text-gray-700">{t('franchisee.applyStore.parentProvinceAgent')}</span>
                          </label>
                          {agentStatus.has_province_agent ? (
                            <select value={applyForm.province_agent_id || ''}
                              onChange={e => setApplyForm({ ...applyForm, province_agent_id: e.target.value, city_agent_id: '' })}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white">
                              <option value="">{t('franchisee.applyStore.selectProvinceAgent')}</option>
                              {agentStatus.province_agents.map(a => (
                                <option key={`prov-${a.id}`} value={a.id}>{a.name}（{a.city || a.region}）</option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">{t('franchisee.applyStore.noProvinceAgent')}</div>
                          )}
                        </div>

                        {/* 市级加盟商选择（省级选中后显示） */}
                        {applyForm.province_agent_id && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              {t('franchisee.applyStore.parentCityFranchisee')}
                            </label>
                            {(() => {
                              const filteredCityAgents = (agentStatus.city_agents || []).filter(
                                a => String(a.parent_agent_id) === String(applyForm.province_agent_id)
                              );
                              return filteredCityAgents.length > 0 ? (
                                <select value={applyForm.city_agent_id || ''}
                                  onChange={e => setApplyForm({ ...applyForm, city_agent_id: e.target.value })}
                                  className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white">
                                  <option value="">{t('franchisee.applyStore.noSelectCityFranchisee')}</option>
                                  {filteredCityAgents.map(a => (
                                    <option key={`city-${a.id}`} value={a.id}>{a.name}（{a.city}）</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">{t('franchisee.applyStore.noCityFranchisee')}</div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 总部直批提示 */}
                        {agentStatus.direct_headquarters && !applyForm.province_agent_id && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                            <BadgeCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800">{t('franchisee.applyStore.hqDirectApproval')}</p>
                              <p className="text-xs text-green-600 mt-0.5">{t('franchisee.applyStore.hqDirectApprovalDesc')}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* CN 手动输入省/市（无代理时） */}
                    {!agentOptionsLoading && agentStatus.direct_headquarters && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.provinceLabel')}</label>
                          <input type="text" value={applyForm.city} onChange={e => setApplyForm({...applyForm, city: e.target.value})}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderProvince')} required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.cityLabel')}</label>
                          <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderCity')} required />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ===== HK/TW/MO/BD/KH: 城市选择 ===== */}
                {['hk','tw','mo','bd','kh'].includes(applyForm.region) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.cityLabel')}</label>
                      <select value={applyForm.city} onChange={e => setApplyForm({...applyForm, city: e.target.value, custom_city: ''})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                        {REGIONS.find(r => r.code === applyForm.region)?.cities.map(c => <option key={c} value={c}>{t(CITY_KEY_MAP[c], c)}</option>)}
                      </select>
                      {applyForm.city === '其它' && (
                        <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm mt-2" placeholder={t('franchisee.applyStore.customCityPlaceholder')} required />
                      )}
                    </div>
                  </>
                )}

                {/* ===== Other: 手动输入国家名+城市 ===== */}
                {applyForm.region === 'other' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.countryLabel')}</label>
                      <input type="text" value={applyForm.custom_country} onChange={e => setApplyForm({...applyForm, custom_country: e.target.value})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderCountry')} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.cityNameLabel')}</label>
                      <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderCityName')} required />
                    </div>
                  </>
                )}

                {/* ===== 通用表单 ===== */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.districtLabel')}</label>
                  <input type="text" value={applyForm.district} onChange={e => setApplyForm({...applyForm, district: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderDistrict')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.storeNameLabel')}</label>
                  <input type="text" value={applyForm.store_name} onChange={e => setApplyForm({...applyForm, store_name: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderStoreName')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.addressLabel')}</label>
                  <input type="text" value={applyForm.address} onChange={e => setApplyForm({...applyForm, address: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderAddress')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.phoneLabel')}</label>
                  <input type="tel" value={applyForm.phone} onChange={e => setApplyForm({...applyForm, phone: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder={t('franchisee.applyStore.placeholderPhone')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyStore.reasonLabel')}</label>
                  <textarea value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" rows={3} placeholder={t('franchisee.applyStore.placeholderReason')} required />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowApplyForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting || user?.kyc_status !== 'approved'} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="h-4 w-4" />{submitting ? t('franchisee.apply.submitting') : t('franchisee.applyStore.submitBtn')}</button>
                </div>
              </form>
            ) : (
              <button onClick={openApplyForm}
                disabled={user?.kyc_status !== 'approved'}
                className={`w-full bg-white rounded-xl border-2 border-dashed p-12 text-center transition ${user?.kyc_status !== 'approved' ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                <Globe className={`h-12 w-12 mx-auto mb-3 ${user?.kyc_status !== 'approved' ? 'text-gray-300' : 'text-gray-400'}`} />
                <span className={`font-medium ${user?.kyc_status !== 'approved' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.kyc_status !== 'approved' ? t('franchisee.apply.kycFirst') : t('franchisee.apply.clickToApply')}
                </span>
                <p className="text-gray-300 text-sm mt-1">{t('franchisee.applyStore.globalSupport')}</p>
              </button>
            )}
          </div>
        )}

        {/* ==================== Tab: 代理申请 ==================== */}
        {activeTab === 'agent-apply' && (
          <div className="max-w-7xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">{t('franchisee.apply.agentTitle')}</h2>

            {/* KYC 未认证警告 */}
            {user && user.kyc_status !== 'approved' && (
              <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 font-medium text-sm">{t('franchisee.applyAgent.kycWarning')}</span>
                <button onClick={() => router.push('/profile')} className="ml-auto bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">{t('franchisee.goToVerify')} →</button>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* 左侧：代理商类型选择卡片 */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold text-lg">{t('franchisee.applyAgent.selectType')}</h3>
                {getAgentTypes(t).map(type => {
                  const disabled = isUserProvinceAgent && type.key === 'city_franchisee';
                  return (
                    <div key={type.key}
                      onClick={() => !disabled && setApplyAgentType(type.key)}
                      className={`bg-white rounded-xl border-2 p-5 transition ${disabled ? 'opacity-50 cursor-not-allowed' : applyAgentType === type.key ? 'border-blue-500 ring-2 ring-blue-200 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{type.label}</h3>
                          <p className="text-xs text-gray-500">{t('franchisee.applyAgent.areaProtectionTemplate', { area: type.area })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{type.desc}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">{t('franchisee.applyAgent.franchiseFee')}</span>
                          <div className="font-semibold">{formatCurrency(type.feeUsd, i18n.language)} </div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">{t('franchisee.applyAgent.deposit')}</span>
                          <div className="font-semibold">{formatCurrency(type.depositUsd, i18n.language)} </div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">{t('franchisee.applyAgent.performanceTarget')}</span>
                          <div className="font-semibold">{formatCurrency(type.performanceTargetUsd, i18n.language)} </div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">{t('franchisee.applyAgent.revShare')}</span>
                          <div className="font-semibold text-green-600">{type.commission}</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        {t('franchisee.applyAgent.initialInvestment')}: <span className="font-bold text-gray-700">{formatCurrency(type.feeUsd + type.depositUsd, i18n.language)} </span>
                      </p>
                      <div className="mt-2 space-y-1">
                        {type.benefits.map((b, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <BadgeCheck className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />{b}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 右侧：表单 + 记录 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 申请记录 */}
                {agentApps.length > 0 && (
                  <div className="bg-white rounded-xl border p-5">
                    <h3 className="font-bold text-lg mb-3">{t('franchisee.applyAgent.myApplications')}</h3>
                    <div className="space-y-2">
                      {agentApps.map(a => (
                        <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <span className="font-medium">{a.agent_type === 'province_agent' ? t('franchisee.earnings.provinceAgent') : t('franchisee.earnings.cityFranchisee')}</span>
                            <span className="text-sm text-gray-500 ml-2">{a.full_name} · {a.region}{a.city ? ` · ${a.city}` : ''}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status === 'approved' ? t('franchisee.wallet.approved') : a.status === 'rejected' ? t('franchisee.wallet.rejected') : t('franchisee.status.reviewing')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 表单卡片 */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-lg mb-4">{t('franchisee.applyAgent.fillForm')}</h3>

                  {/* 未认证锁定提示 */}
                  {user && user.kyc_status !== 'approved' && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
                      <Lock className="h-4 w-4" /> {t('franchisee.applyAgent.kycLocked')}
                    </div>
                  )}

                  {agentResultMsg && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${agentResultMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {agentResultMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleAgentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.agentTypeLabel')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {getAgentTypes(t).map(type => (
                          <button key={type.key} type="button"
                            onClick={() => setApplyAgentType(type.key)}
                            disabled={user?.kyc_status !== 'approved'}
                            className={`p-3 rounded-lg border-2 text-sm font-medium transition ${user?.kyc_status !== 'approved' ? 'opacity-50 cursor-not-allowed' : applyAgentType === type.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.fullNameLabel')}</label>
                        <input type="text" value={agentForm.full_name} onChange={e => setAgentForm({...agentForm, full_name: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('franchisee.agent.namePlaceholder')} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.phoneLabel')}</label>
                        <input type="tel" value={agentForm.phone} onChange={e => setAgentForm({...agentForm, phone: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('franchisee.agent.phonePlaceholder')} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.applyAgent.targetRegionLabel')}</label>
                        <select value={agentForm.region} onChange={e => setAgentForm({...agentForm, region: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                          {REGIONS.map(r => <option key={r.code} value={r.code}>{t(`applyAgent.region.${r.code}`, r.name)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {applyAgentType === 'province_agent' ? t('applyAgent.label.provinceRequired') : t('applyAgent.label.city')}
                        </label>
                        {applyAgentType === 'province_agent' ? (
                          (() => {
                            const approvedProvinces = approvedAgents.filter(a => a.agent_type === 'province_agent').map(a => a.city || a.region);
                            const availableProvinces = PROVINCES.filter(p => !approvedProvinces.includes(p));
                            return (
                              <select value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                                disabled={user?.kyc_status !== 'approved'}
                                className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                                <option value="">{t('applyAgent.label.selectProvince')}</option>
                                {availableProvinces.map(p => <option key={p} value={p}>{t(`applyAgent.province.${p}`, p)}</option>)}
                              </select>
                            );
                          })()
                        ) : applyAgentType === 'city_franchisee' && parentAgentId ? (
                          availableCities.length > 0 ? (
                            <select value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                              disabled={user?.kyc_status !== 'approved'}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                              <option value="">{t('franchisee.applyAgent.selectCity')}</option>
                              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                              disabled={user?.kyc_status !== 'approved'}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('franchisee.agent.targetCity')} />
                          )
                        ) : (
                          <input type="text" value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                            disabled={user?.kyc_status !== 'approved'}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('franchisee.agent.targetCity')} />
                        )}
                      </div>
                    </div>
                    {applyAgentType === 'city_franchisee' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {t('franchisee.agent.parentProvinceAgent')} <span className="text-red-500">*</span>
                        </label>
                        <select value={parentAgentId} onChange={e => handleParentChange(e.target.value)}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                          <option value="">{t('franchisee.agent.selectProvinceAgent')}</option>
                          {approvedAgents.filter(a => a.agent_type === 'province_agent').map(a => (
                            <option key={a.id} value={a.id}>{a.full_name} ({a.city || a.region || '—'})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('franchisee.agent.reason')}</label>
                      <textarea value={agentForm.reason} onChange={e => setAgentForm({...agentForm, reason: e.target.value})}
                        disabled={user?.kyc_status !== 'approved'}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" rows={4}
                        placeholder={t('franchisee.agent.reasonPlaceholder')} />
                    </div>
                    <button type="submit" disabled={agentSubmitting || user?.kyc_status !== 'approved'}
                      className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send className="h-4 w-4" />{agentSubmitting ? t('franchisee.modal.submitting') : t('franchisee.agent.submit')}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Tab: 市级加盟商审批 ==================== */}
        {activeTab === 'review-agent' && isAgent && agentType === 'province_agent' && (
          <div className="space-y-6">
            {reviewLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('franchisee.review.loading')}</div>
            ) : reviewData ? (
              <>
                {/* 代理身份标识 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <BadgeCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{t('franchisee.review.agentTitle')}</h2>
                    <p className="text-sm text-gray-500">{t('franchisee.review.agentDesc', { region: reviewData.region || '—' })}</p>
                  </div>
                </div>

                {reviewData.agent_applications?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">{t('franchisee.review.agentAppCount', { count: reviewData.agent_applications.length })}</h3>
                    </div>
                    <div className="divide-y">
                      {reviewData.agent_applications.map(app => (
                        <div key={`agent-${app.id}`} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{app.full_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {app.status === 'approved' ? t('franchisee.review.approved') : app.status === 'rejected' ? t('franchisee.review.rejected') : t('franchisee.review.pending')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              <span>{t('franchisee.review.phone')}: {app.phone}</span>
                              <span>{t('franchisee.review.region')}: {app.region}</span>
                              <span>{t('franchisee.review.city')}: {app.city || '—'}</span>
                            </div>
                            {app.reason && <p className="text-sm text-gray-400">{t('franchisee.review.reason')}: {app.reason}</p>}
                            {app.review_note && <p className="text-sm text-gray-400">{t('franchisee.review.note')}: {app.review_note}</p>}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleReview('agent', app.id, 'approved')}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                <CheckCircle className="h-4 w-4" />{t('franchisee.review.approve')}
                              </button>
                              <button onClick={() => handleReview('agent', app.id, 'rejected')}
                                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">
                                <X className="h-4 w-4" />{t('franchisee.review.reject')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">{t('franchisee.review.noAgentApp')}</p>
                    <p className="text-sm mt-1">{t('franchisee.review.noAgentAppHint')}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('franchisee.review.loadError')}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 开店审批 ==================== */}
        {activeTab === 'review-store' && isAgent && (
          <div className="space-y-6">
            {reviewLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />{t('franchisee.review.loading')}</div>
            ) : reviewData ? (
              <>
                {/* 代理身份标识 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {agentType === 'province_agent' ? t('franchisee.agent.province') : t('franchisee.agent.city')} · {t('franchisee.review.storeTitle')}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t('franchisee.review.managedRegion')}: {reviewData.region || '—'} | 
                      {agentType === 'province_agent' ? t('franchisee.review.approveProvince') : t('franchisee.review.approveCity')}
                    </p>
                  </div>
                </div>

                {reviewData.store_applications?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">{t('franchisee.review.storeAppCount', { count: reviewData.store_applications.length })}</h3>
                    </div>
                    <div className="divide-y">
                      {reviewData.store_applications.map(app => (
                        <div key={`store-${app.id}`} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{app.store_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {app.status === 'approved' ? t('franchisee.review.approved') : app.status === 'rejected' ? t('franchisee.review.rejected') : t('franchisee.review.pending')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              <span>{t('franchisee.review.city')}: {app.city}</span>
                              <span>{t('franchisee.review.phone')}: {app.phone}</span>
                              {app.address && <span>{t('franchisee.review.address')}: {app.address}</span>}
                            </div>
                            {app.applicant && <p className="text-sm text-gray-400">{t('franchisee.review.applicant')}: {app.applicant.full_name || app.applicant.username} ({app.applicant.phone || '—'})</p>}
                            {app.reason && <p className="text-sm text-gray-400">{t('franchisee.review.reason')}: {app.reason}</p>}
                            {app.review_note && <p className="text-sm text-gray-400">{t('franchisee.review.note')}: {app.review_note}</p>}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleReview('store', app.id, 'approved')}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                <CheckCircle className="h-4 w-4" />{t('franchisee.review.approve')}
                              </button>
                              <button onClick={() => handleReview('store', app.id, 'rejected')}
                                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">
                                <X className="h-4 w-4" />{t('franchisee.review.reject')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">{t('franchisee.review.noStoreApp')}</p>
                    <p className="text-sm mt-1">{t('franchisee.review.noStoreAppHint')}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('franchisee.review.loadError')}</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ===== 店员帮投资者注册 Modal ===== */}
      {showStaffRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('franchisee.modal.staffRegisterTitle')}</h3>
              <button onClick={() => { setShowStaffRegister(false); setStaffResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t('franchisee.modal.staffRegisterDesc', { storeCode: storeDetail?.store_code || selectedStoreId })}</p>

            {staffResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${staffResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {staffResult.msg}
              </div>
            )}

            <form onSubmit={handleStaffRegister} className="space-y-3">
              <div>
                <label className="label">{t('franchisee.modal.username')} *</label>
                <input type="text" value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.usernamePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.email')} *</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                  className="input-field" placeholder="investor@email.com" required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.password')} *</label>
                <input type="password" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.passwordPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.phone')}</label>
                <input type="tel" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.optional')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowStaffRegister(false); setStaffResult(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">{t('common.cancel')}</button>
                <button type="submit" disabled={staffSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <UserPlus className="h-4 w-4" />{staffSubmitting ? t('franchisee.modal.registering') : t('franchisee.modal.registerAndBind')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 新增门店 Modal ===== */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('franchisee.modal.addStoreTitle')}</h3>
              <button onClick={() => setShowAddStore(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {user && (!user.kyc_status || user.kyc_status !== 'approved') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span className="text-yellow-700 text-sm">{t('franchisee.modal.kycRequired')}</span>
              </div>
            )}
            <form onSubmit={handleAddStore} className="space-y-3">
              <div>
                <label className="label">{t('franchisee.modal.storeName')} *</label>
                <input type="text" value={addStoreForm.name} onChange={e => setAddStoreForm({...addStoreForm, name: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.storeNamePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.city')}</label>
                <input type="text" value={addStoreForm.city} onChange={e => setAddStoreForm({...addStoreForm, city: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.cityPlaceholder')} />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.address')}</label>
                <input type="text" value={addStoreForm.address} onChange={e => setAddStoreForm({...addStoreForm, address: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.addressPlaceholder')} />
              </div>
              <div>
                <label className="label">{t('franchisee.phone')}</label>
                <input type="tel" value={addStoreForm.phone} onChange={e => setAddStoreForm({...addStoreForm, phone: e.target.value})}
                  className="input-field" placeholder={t('franchisee.modal.phonePlaceholder')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddStore(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">{t('common.cancel')}</button>
                <button type="submit" disabled={addStoreSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <Plus className="h-4 w-4" />{addStoreSubmitting ? t('franchisee.modal.creating') : t('franchisee.modal.createStore')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 门店编辑弹窗 */}
      {showEditStore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t('franchisee.modal.editStoreTitle')}</h3>
            <form onSubmit={handleEditStore} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('franchisee.storeName')}</label>
                <input type="text" value={editStoreForm.name} onChange={e => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('franchisee.modal.city')}</label>
                  <input type="text" value={editStoreForm.city} onChange={e => setEditStoreForm({ ...editStoreForm, city: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('franchisee.modal.phone')}</label>
                  <input type="text" value={editStoreForm.phone} onChange={e => setEditStoreForm({ ...editStoreForm, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('franchisee.modal.address')}</label>
                <input type="text" value={editStoreForm.address} onChange={e => setEditStoreForm({ ...editStoreForm, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('franchisee.modal.storePhotos')}</label>
                {((editStoreForm.images || []).length > 0 || editStoreForm.photo_url) ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                    {[...(editStoreForm.images || []), ...(editStoreForm.photo_url ? [editStoreForm.photo_url] : [])].map((url, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img src={url} alt={t('franchisee.modal.photoAlt', { index: i + 1 })} className="w-24 h-24 object-cover rounded-lg border bg-gray-50" />
                        <button type="button" onClick={() => removeStoreImage(i)}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-400 mb-2">
                    <Image className="h-8 w-8 mx-auto mb-1" />
                    <p className="text-xs">{t('franchisee.modal.noPhoto')}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition">
                    {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    {t('franchisee.store.uploadPhotoBtn')}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowEditStore(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
                <button type="submit" disabled={editStoreSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {editStoreSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t('franchisee.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 申诉弹窗 */}
      {showAppealModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{t('franchisee.modal.appealTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('franchisee.modal.appealStore')}：{appealStoreName}</p>
            <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)}
              placeholder={t('franchisee.appeal.reasonPlaceholder')}
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
              <button onClick={() => { setShowAppealModal(false); setAppealReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
              <button onClick={handleAppeal} disabled={appealSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {appealSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t('franchisee.modal.submitAppeal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 提现模态框 ===== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('franchisee.modal.withdrawTitle')}</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">{t('franchisee.modal.withdrawHint')}</p>
            <form onSubmit={handleWithdrawModalSubmit} className="space-y-3">
              <div>
                <label className="label">{t('franchisee.modal.withdrawAmount')}</label>
                <input type="number" min="0" step="0.01" value={withdrawModalForm.amount}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, amount: e.target.value })}
                  className="input-field" placeholder="0.00" required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.bankName')}</label>
                <input type="text" value={withdrawModalForm.bank_name}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_name: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankNamePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.bankAccount')}</label>
                <input type="text" value={withdrawModalForm.bank_account}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_account: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankAccountPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.bankHolder')}</label>
                <input type="text" value={withdrawModalForm.bank_holder}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_holder: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankHolderPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.businessLicense')} *</label>
                {withdrawModalForm.business_license_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('franchisee.modal.uploaded')}
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.business_license_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    {t('franchisee.store.uploadLicenseBtn')}
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'business_license_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="label">{t('franchisee.modal.invoiceInfo')} *</label>
                {withdrawModalForm.invoice_info_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('franchisee.modal.uploaded')}
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.invoice_info_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    {t('franchisee.store.uploadInvoiceBtn')}
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'invoice_info_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="label">{t('franchisee.modal.invoice')} *</label>
                {withdrawModalForm.vat_invoice_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('franchisee.modal.uploaded')}
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.vat_invoice_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    {t('franchisee.store.uploadReceiptBtn')}
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'vat_invoice_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">{t('common.cancel')}</button>
                <button type="submit" disabled={withdrawModalSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {withdrawModalSubmitting ? t('franchisee.modal.submitting') : t('franchisee.modal.submitWithdraw')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 退保证金模态框 ===== */}
      {showDepositRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('franchisee.modal.depositRefundTitle')}</h3>
              <button onClick={() => setShowDepositRefundModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {t('franchisee.modal.depositRefundAmount')}：<span className="font-semibold text-blue-600">{formatCurrency(walletData.depositAmount || 0, i18n.language)}</span>，提交后由 admin 审批
            </p>
            <form onSubmit={handleDepositRefundSubmit} className="space-y-3">
              <div>
                <label className="label">{t('franchisee.modal.bankName')}</label>
                <input type="text" value={depositRefundForm.bank_name}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_name: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankNamePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.bankAccount')}</label>
                <input type="text" value={depositRefundForm.bank_account}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_account: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankAccountPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.bankHolder')}</label>
                <input type="text" value={depositRefundForm.bank_holder}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_holder: e.target.value })}
                  className="input-field" placeholder={t('franchisee.modal.bankHolderPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('franchisee.modal.businessLicense')} *</label>
                {depositRefundForm.business_license_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('franchisee.modal.licenseAlready')}
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {depositRefundUploading.business_license_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    {t('franchisee.store.uploadLicenseBtn')}
                    <input type="file" accept="image/*,.pdf" onChange={handleDepositRefundFileUpload} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepositRefundModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">{t('common.cancel')}</button>
                <button type="submit" disabled={depositRefundSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {depositRefundSubmitting ? t('franchisee.modal.submitting') : t('franchisee.modal.submitDepositRefund')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ===== AI 顾问浮动按钮 ===== */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label={t('franchisee.chatbot.open')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="14" rx="4" />
            <circle cx="8.5" cy="10" r="1.5" />
            <circle cx="15.5" cy="10" r="1.5" />
            <path strokeLinecap="round" d="M8 15h8" />
            <path strokeLinecap="round" d="M12 2v2M5 8V6a1 1 0 011-1h1M19 8V6a1 1 0 00-1-1h-1" />
          </svg>
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="14" rx="4" />
                <circle cx="8.5" cy="10" r="1.5" />
                <circle cx="15.5" cy="10" r="1.5" />
                <path strokeLinecap="round" d="M8 15h8" />
              </svg>
              <div>
                <span className="font-semibold text-sm">{t('franchisee.chatbot.title')}</span>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white border text-gray-700 rounded-bl-md shadow-sm'}`}>{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t p-3 flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder={t('franchisee.chatbot.placeholder')} className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleChat} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1.5"><Send className="h-4 w-4" />{t('franchisee.store.send')}</button>
          </div>

          <div className="px-3 pb-3 flex flex-wrap gap-2">
            {t('franchisee.chatbot.tags', { returnObjects: true }).map(tag => (
              <button key={tag} onClick={() => { setChatInput(tag); setTimeout(() => handleChat(), 100); }}
                className="text-xs bg-white border px-3 py-1.5 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">{tag}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 换电柜槽位网格组件（用于加盟商查看已审批的换电站电池状态）
function InlineCabinetGrid({ site }) {
  const rawSlots = site.cabinet_slots || site.cabinetSlots || site.slots || [];
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
    const level = slot.sensor_battery_level;
    const temp = slot.sensor_temperature;
    if (level === undefined && temp === undefined) return 'bg-green-200 border-green-400 text-green-800';
    let warn = false;
    if (level !== undefined && (level < 20 || level > 95)) warn = true;
    if (temp !== undefined && (temp < 5 || temp > 45)) warn = true;
    if (warn) return 'bg-red-200 border-red-400 text-red-800';
    if (level !== undefined && (level < 40 || level > 85)) return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    return 'bg-green-200 border-green-400 text-green-800';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400" />{occupiedSlots}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-300" />{emptySlots}</span>
        <span className="text-gray-400">{totalSlots} slots</span>
      </div>
      <div className="bg-gray-100 rounded-lg p-2 border border-gray-200">
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`h-10 rounded-md border flex items-center justify-center text-xs font-semibold ${slotStatusColor(slot)}`}
            >
              {slot.slot_number || idx + 1}
            </div>
          ))}
        </div>
        <div className="mt-1.5 h-2 bg-gray-300 rounded-b-sm" />
      </div>
    </div>
  );
}

export default FranchiseePage;
