'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { franchiseeAPI, orderAPI, agentAPI, adminAPI, chatbotAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import {
  Store, Battery, MapPin, Zap, Shield, TrendingUp, Send, Plus, QrCode, ClipboardList, BarChart3, Calculator, MessageCircle, Star, Globe, Users, DollarSign, Wallet, Phone, Mail, ChevronRight, X, Loader2, Search, Home, Building2, BadgeCheck, AlertTriangle, Clock, Award, Target, Lightbulb, UserPlus, Eye, ArrowLeft, CheckCircle, Edit2, Image, Upload, Lock
} from 'lucide-react';
import { USD_TO_CNY_RATE, dualCurrency, formatUSD, formatCNY, usdToCny } from '../../lib/currency';
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

const FRANCHISE_LEVELS = [
  { level: '省级总代理', fee: 68966, deposit: 27586, performanceTarget: 2068965, commission: '2%', revShare: '2%', area: '全省独家', color: 'from-blue-600 to-blue-800', badge: '最高级别', totalInvestment: 482759, downstreamRate: '抽佣2%+分成2%' },
  { level: '市级加盟商', fee: 27586, deposit: 6897, performanceTarget: 689655, commission: '3%', revShare: '3%', area: '全市独家', color: 'from-blue-500 to-blue-700', badge: '推荐', totalInvestment: 144828, downstreamRate: '抽佣3%+分成3%' },
  { level: '区县级门店', fee: 6897, deposit: 1379, performanceTarget: 137931, commission: '5%', revShare: '5%', area: '半径3km', color: 'from-sky-500 to-sky-700', badge: '入门', totalInvestment: 33103, downstreamRate: '抽佣5%+分成5%(无下级,保留字段)' },
];

const BENEFITS = [
  { icon: DollarSign, title: '自销佣金统一5%', desc: '省级、市级、区县级门店自销佣金统一为5%,一线门店获佣金池50%' },
  { icon: TrendingUp, title: '收益分成70%', desc: '投资者享有年化收益的70%,总部20%,保障投资者收益优先' },
  { icon: Users, title: '下级渠道抽佣', desc: '省级抽佣2%+分成2%,市级抽佣3%+分成3%,区县抽佣5%+分成5%' },
  { icon: Building2, title: '总部全程扶持', desc: '装修补贴、培训、物料、营销支持,最快30天开业' },
  { icon: Award, title: '三级利益绑定', desc: '每级同时享有自销佣金+租金分成+下级抽佣,形成长期利益共同体' },
];

const OBLIGATIONS = [
  { num: 1, title: '门店建设', desc: '按总部SI标准建设体验中心,面积≥80㎡' },
  { num: 2, title: '团队配置', desc: '专职销售团队≥3人,经总部培训认证上岗' },
  { num: 3, title: '业绩指标', desc: '年度销售目标:省级≥$2,068,965,市级≥$689,655,区县级≥$137,931' },
  { num: 4, title: '合规经营', desc: '严格执行总部定价,不跨区域销售,不虚假宣传' },
  { num: 5, title: '客户服务', desc: '投资者咨询接待、合同签署、售后服务' },
];

const RISK_CONTROLS = [
  { icon: Battery, title: '电池损耗风控', items: ['8年质保,年衰减≤2.5%', 'IoT实时监控GPS+SOC', '每月计提3%损耗准备金', '全生命周期保险覆盖', '容量至80%转入储能梯次利用'] },
  { icon: Shield, title: '资金安全风控', items: ['第三方银行资金托管', '区块链存证资产确权', '投资与运营资金隔离', '持有满1年可赎回退出', '平台收入10%风险准备金'] },
  { icon: Zap, title: '租赁违约风控', items: ['租赁方企业征信审核', '缴纳3个月押金', 'BMS远程锁电功能', 'GPS实时追踪定位', '平台保底收益8%/年兜底'] },
];

const AGENT_TYPES = [
  {
    key: 'province_agent',
    label: '省级总代理',
    feeUsd: 68966,
    depositUsd: 27586,
    performanceTargetUsd: 2068965,
    commission: '2%',
    revShare: '2%',
    area: '全省独家',
    color: 'from-blue-600 to-blue-800',
    desc: '最高级别代理，覆盖全省范围，享分成比例和下级抽成',
    benefits: ['自销佣金5% + 自销租金5%', '本省门店销售佣金抽成2%', '本省门店电池租金抽成2%', '全省独家代理权', '优先获取新品配额'],
  },
  {
    key: 'city_franchisee',
    label: '市级加盟商',
    feeUsd: 27586,
    depositUsd: 6897,
    performanceTargetUsd: 689655,
    commission: '3%',
    revShare: '3%',
    area: '全市独家',
    color: 'from-blue-500 to-blue-700',
    desc: '核心城市运营商，负责市级区域的加盟门店发展与管理',
    benefits: ['自销佣金5% + 自销租金5%', '本市门店销售佣金抽成3%', '本市门店电池租金抽成3%', '全市独家代理权', '总部营销资源倾斜'],
  },
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

const TOP_CASES = []; // 改为从API动态加载

const CHAT_QA = {
  '加盟费用': null,
  '收益分成': null,
  '开店条件': null,
  '区域保护': null,
  '电池产品': null,
  '风控保障': null,
  '加盟流程': null,
  '退出机制': null,
  '代理层级': null,
  '投资回报': null,
  default: '感谢您的咨询!如需了解加盟费用、收益分成、开店条件、区域保护等,请输入具体关键词。也可拨打加盟热线:400-1KWH-888 或发邮件至 franchise@1kwh.store。',
};

/* ========== 主组件 ========== */

export default function Franchisee() {
  const { user, isProvinceAgent } = useAuth();
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
      // 月租金兜底：API standard_monthly_rent → DB monthly_rent → batteryTypes（来自 /api/battery-types）
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
  // === 我的收益 ===
  const [earningsData, setEarningsData] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  // === 我的钱包 ===
  const [walletData, setWalletData] = useState({ franchiseFee: 0, depositAmount: 0, performanceTarget: 0, cumulativePerformance: 0, cumulativeEarnings: 0, monthlyRevenue: 0, totalBalance: 0, withdrawableBalance: 0, preTargetWithdrawable: 0, postTargetWithdrawable: 0 });
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
    { role: 'bot', text: '您好!我是1kwh加盟专属顾问,可以为您解答加盟费用、收益分成、开店条件、风控保障等问题。请输入您的问题~' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  /* ===== 数据加载 ===== */
  // 加载电池类型数据（公开 API，无需角色鉴权）
  useEffect(() => {
    const loadBatteryTypes = async () => {
      try {
        const res = await fetch('/api/battery-types');
        const data = await res.json();
        if (data.battery_types) {
          const mapped = data.battery_types.map(bt => {
            // 映射 API 数据到组件使用的字段名
            const price = (typeof bt.unit_price === 'string' ? parseFloat(bt.unit_price) : bt.unit_price) || 0;
            const rent = (typeof bt.monthly_rent === 'string' ? parseFloat(bt.monthly_rent) : bt.monthly_rent) || 0;
            // 推断 category
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
              unit_price: price,
              monthly_rent: rent,
            };
          });
          setBatteryTypes(mapped);
        }
      } catch (e) { console.error('Failed to load battery types:', e); }
      finally { setBatteryTypesLoaded(true); }
    };
    loadBatteryTypes();
  }, []);

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
    if (stores.length || applications.length) {
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
      setManagedData(data);
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
      // 确保收益数据已加载（先点“我的钱包”时 earningsData 可能为空，余额会全为0）
      let earnings = earningsData;
      if (!earnings) {
        try {
          earnings = await agentAPI.getEarnings();
          setEarningsData(earnings);
        } catch (_) {
          earnings = { self_earnings: { stores: [], total_purchase_amount: 0 }, city_earnings: { stores: [], total_purchase_amount: 0 }, grand_total: 0 };
        }
      }
      // 从 applications 和 agentApplications 读取保证金和业绩目标
      const franchiseFeeApp = (applications || []).find(a => a.status === 'approved');
      const agentApp = (applications || []).concat(
        ...(await agentAPI.getMyApplications().catch(() => ({ applications: [] }))).applications || []
      ).find(a => a.status === 'approved' && (a.agent_type === 'province_agent' || a.agent_type === 'city_franchisee'));

      // 辅助函数：从 FRANCHISE_LEVELS 常量解析金额
      const parseAmount = (val) => { if (!val && val !== 0) return 0; return Number(val); };

      // 根据 agentType 在 FRANCHISE_LEVELS 中找到对应等级常量
      const levelKey = agentType === 'province_agent' ? '省级总代理' : agentType === 'city_franchisee' ? '市级加盟商' : '区县级门店';
      const levelConst = FRANCHISE_LEVELS.find(l => l.level === levelKey);

      // 加盟费：优先 API 返回，其次 FRANCHISE_LEVELS 常量兜底
      const franchiseFee = franchiseFeeApp?.franchise_fee || (levelConst ? parseAmount(levelConst.fee) : 0);
      // 保证金：优先 agent 申请，其次 franchise 申请，最后 FRANCHISE_LEVELS 常量兜底
      const depositAmount = agentApp?.deposit_amount || franchiseFeeApp?.deposit_amount || (levelConst ? parseAmount(levelConst.deposit) : 0);
      // 业绩目标：优先 agent 申请中的 target，其次 FRANCHISE_LEVELS 常量兜底
      const perfTarget = agentApp?.performance_target
        || franchiseFeeApp?.performance_target
        || (levelConst ? parseAmount(levelConst.performanceTarget) : (
          agentType === 'province_agent' ? 10000000
          : agentType === 'city_franchisee' ? 5000000
          : 1000000
        ));
      // 直接调用 performance API 计算本月业绩（所有门店 + 管辖门店去重）
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
      // 累计业绩 = 所有门店的购买总金额（自营 + 加盟），仅用于达标判断
      const selfPurchaseAmount = (earnings?.self_earnings?.total_purchase_amount || 0);
      const cityPurchaseAmount = (earnings?.city_earnings?.total_purchase_amount || 0);
      const cumulativePerf = selfPurchaseAmount + cityPurchaseAmount;
      // 累计收益 = 来自“我的收益”页面的累计总收益（佣金+租金分成），用于余额计算
      const cumulativeEarnings = (earnings?.grand_total || 0);

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

      // 我的余额（总） = 保证金 + 收益 - 已提现（收益=累计总收益来自“我的收益”）
      const totalBalance = depositAmount + cumulativeEarnings - totalWithdrawn;
      // 业绩是否达标（用业绩判断，不用收益）
      const isTargetMet = perfTarget > 0 && cumulativePerf >= perfTarget;
      // 达标前：可提现余额 = 收益 - 待处理提现
      const preTargetWithdrawable = cumulativeEarnings - pendingWithdrawAmount;
      // 达标后：可提现余额 = 保证金 + 收益 - 已提现
      const postTargetWithdrawable = depositAmount + cumulativeEarnings - totalWithdrawn;
      // 当前可提现余额
      const withdrawableBalance = isTargetMet ? postTargetWithdrawable : preTargetWithdrawable;

      setWalletData({
        franchiseFee,
        depositAmount,
        performanceTarget: perfTarget,
        cumulativePerformance: cumulativePerf,
        cumulativeEarnings: cumulativeEarnings,
        monthlyRevenue,
        totalBalance: Math.max(0, totalBalance),
        withdrawableBalance: Math.max(0, withdrawableBalance),
        preTargetWithdrawable: Math.max(0, preTargetWithdrawable),
        postTargetWithdrawable: Math.max(0, postTargetWithdrawable),
      });
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
    if (!applyAgentType) { alert('请选择代理商类型'); return; }
    if (!agentForm.full_name.trim()) { alert('请填写姓名'); return; }
    if (!agentForm.phone.trim()) { alert('请填写联系电话'); return; }
    setAgentSubmitting(true);
    setAgentResultMsg(null);
    try {
      const payload = { agent_type: applyAgentType, ...agentForm };
      if (applyAgentType === 'city_franchisee') payload.parent_agent_id = parentAgentId;
      await agentAPI.apply(payload);
      setAgentResultMsg({ type: 'success', text: '申请已提交！平台将在 1-3 个工作日内审核，请留意通知。' });
      setAgentForm({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
      setApplyAgentType('');
      setParentAgentId('');
      loadAgentStatus();
    } catch (err) {
      setAgentResultMsg({ type: 'error', text: err.message || '提交失败，请重试' });
    } finally { setAgentSubmitting(false); }
  };

  const loadInfoCards = async () => {
    setInfoCardsLoading(true);
    try {
      const approvedApp = (applications || []).find(a => a.status === 'approved');

      // 自营门店: is_managed=false 且 owner_id 是当前用户（双重校验）
      // 加盟门店: is_managed=true 或 owner_id≠当前用户
      const ownStores = (stores || []).filter(s => !s.is_managed && s.owner_id === user?.id);
      const franchisedStores = (stores || []).filter(s => s.is_managed || s.owner_id !== user?.id);

      // 管辖门店：来自 managedData（市级）/ provinceStores 或 managedData 兜底（省级）
      const managedArr = agentType === 'city_franchisee' ? (managedData?.stores || [])
        : agentType === 'province_agent' ? (provinceStores?.stores || managedData?.stores || [])
        : [];

      // 汇总所有门店本月业绩（自营门店业绩 + 加盟门店业绩的总和，按 id 去重）
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
      // 区县加盟店：从上级市级加盟商的 application 数据获取 region、city、名称
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
      if (agentType === 'province_agent') level = '省级总代理';
      else if (agentType === 'city_franchisee') level = '市级加盟商';

      // 管辖门店/加盟商计数
      let managedStoreCount = 0;
      let managedFranchiseeCount = 0;
      if (agentType === 'province_agent') {
        // 省代：管辖门店来自 provinceStores 或 managedData
        managedStoreCount = (provinceStores?.stores || managedData?.stores || []).length;
        // 获取加盟商数据（独立调用 type=franchisees）
        try {
          const frRes = await agentAPI.getManaged('franchisees', '');
          managedFranchiseeCount = frRes?.groups
            ? Object.values(frRes.groups).reduce((sum, g) => sum + (g?.length || 0), 0)
            : frRes?.franchisees?.length || 0;
        } catch (_) {}
      } else if (agentType === 'city_franchisee') {
        managedStoreCount = (managedData?.stores || []).length;
      }

      setInfoCards({
        level,
        province: regionName,
        city: actualCity,
        parentAgentName: parentAgentName || (approvedApp?.parent_agent_id ? '已指定' : '暂无'),
        monthlyRevenue,
        ownStoreCount: ownStores.length,
        franchisedStoreCount: franchisedStores.length,
        managedStoreCount,
        managedFranchiseeCount,
      });
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
      business_license_url: prev.business_license_url || withdrawForm.business_license_url || withdrawModalForm.business_license_url || '',
    }));
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
          business_license_url: depositRefundForm.business_license_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
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
        body: JSON.stringify({ type: 'commission_withdraw', ...withdrawModalForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      alert('提现申请已提交，等待 admin 审批');
      setShowWithdrawModal(false);
      loadWalletData();
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
          vat_invoice_url: withdrawForm.vat_invoice_url,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
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
          images: editStoreForm.images,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失败');
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
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '上传失败');
        urls.push(data.url);
      }
      setEditStoreForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    } catch (err) {
      alert('照片上传失败：' + err.message);
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
    if (!window.confirm(`确定${newStatus === 'suspended' ? '暂停' : '恢复'}「${storeName}」？`)) return;
    try {
      await adminAPI.updateStoreStatus(storeId, newStatus);
      loadManaged();
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleDeleteManagedStore = async (storeId, storeName) => {
    if (!window.confirm(`确定停业「${storeName}」？`)) return;
    try {
      await adminAPI.deleteStore(storeId);
      loadManaged();
    } catch (err) {
      alert('操作失败');
    }
  };

  // === 省代-管辖门店操作（刷新 provinceStores） ===
  const handleProvinceStoreStatus = async (storeId, newStatus, storeName) => {
    if (!window.confirm(`确定${newStatus === 'suspended' ? '暂停' : '恢复'}门店「${storeName}」？`)) return;
    try {
      await adminAPI.updateStoreStatus(storeId, newStatus);
      loadProvinceStores(managedSearch);
    } catch (err) { alert('操作失败'); }
  };

  const handleProvinceStoreDelete = async (storeId, storeName) => {
    if (!window.confirm(`确定停业门店「${storeName}」？此操作不可逆。`)) return;
    try {
      await adminAPI.deleteStore(storeId);
      loadProvinceStores(managedSearch);
    } catch (err) { alert('操作失败'); }
  };

  // === 省代管理加盟商（agent级别操作）===
  const handleManagedFranchiseeStatus = async (franchiseeId, newStatus, franchiseeName) => {
    if (!window.confirm(`确定${newStatus === 'suspended' ? '暂停' : '恢复'}加盟商「${franchiseeName}」？`)) return;
    try {
      await adminAPI.updateManagedAgent(franchiseeId, { status: newStatus });
      loadManaged('franchisees', managedSearch);
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleDeleteManagedFranchisee = async (franchiseeId, franchiseeName) => {
    if (!window.confirm(`确定停业加盟商「${franchiseeName}」？此操作不可逆。`)) return;
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
      if (!res.ok) throw new Error(data.error || '申诉提交失败');
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
        store_id: selectedStoreId,
      });
      setStaffResult({ success: true, msg: `投资者 ${data.investor?.username || staffForm.username} 注册成功！已绑定门店 编码: ${storeDetail?.store_code || data.store_code || selectedStoreId}` });
      setStaffForm({ username: '', email: '', password: '', phone: '' });
      // 刷新门店详情
      openStoreDetail(selectedStoreId);
    } catch (err) {
      setStaffResult({ success: false, msg: err.message || '注册失败' });
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
    } catch (err) { alert(err.message || '创建失败'); }
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
        city_agent_id: data.has_city_agent ? prev.city_agent_id : '',
      }));
    } catch (e) { console.error(e); }
    finally { setAgentOptionsLoading(false); }
  }, [showApplyForm]);

  // 当申请表单打开且 region/city 变化时，重新加载代理选项
  useEffect(() => {
    if (showApplyForm && applyForm.region && applyForm.city) {
      loadAgentOptions(applyForm.region, applyForm.city);
    }
  }, [showApplyForm, applyForm.region, applyForm.city, loadAgentOptions]);

  // 概览页本月业绩汇总
  useEffect(() => {
    if (activeTab !== 'overview') return;
    const loadPerf = async () => {
      // 去重：自营门店业绩 + 加盟门店业绩的总和
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
  }, [activeTab]);

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
        cityValue = `中国大陆·${actualCity}`;
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
        agent_type: agent_type || undefined,
      };
      await franchiseeAPI.submitApplication(payload);
      alert('申请已提交!平台将在3个工作日内审核。');
      setShowApplyForm(false);
      loadData();
    } catch (err) { alert(err.message || '提交失败'); }
    finally { setSubmitting(false); }
  };

  /* ===== 收益测算 ===== */
  const getCalcResult = () => {
    const selfCommissionRate = 0.05; // 销售抽佣 5%（按总投资额）
    const selfRentalRate = 0.05; // 自营月租金分成 5%（市级/省级统一）
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
      details.push({ id: battery.id, name: battery.name, count, unitPrice: battery.price, invest, monthlyRent: battery.monthlyRent, totalRent: rent });
    }

    if (details.length === 0) return null;

    // 加盟商收益 = 自销佣金(总投资额×5%,一次性) + 自销租金(月租池×5%,月度) + 下级抽佣(销售额×N%,一次性)+分成(月租金×N%,月度)
    const selfCommissionAmount = totalInvestment * selfCommissionRate;
    const selfRentalAmount = totalMonthlyRent * selfRentalRate;

    const downstreamAnnualSales = parseFloat(calcDownstreamSales) * 10000 || 0;
    const downstreamCommissionAnnual = downstreamAnnualSales * downstreamCommissionRate;  // 一次性佣金
    const downstreamRentalMonthly = (downstreamAnnualSales / 21) * downstreamRentalRate;  // 销售额/21=预估月租金,再×分成比例

    const franchiseeMonthly = selfRentalAmount + downstreamRentalMonthly;  // 月度收入不含佣金
    const franchiseeAnnual = franchiseeMonthly * 12 + selfCommissionAmount + downstreamCommissionAnnual;  // 年收入 = 月度×12 + 一次性佣金
    const investorMonthly = totalMonthlyRent * investorRate;
    const investorAnnual = investorMonthly * 12;
    const investorPaybackMonths = investorMonthly > 0 ? totalInvestment / investorMonthly : Infinity;
    const investorAnnualReturn = totalInvestment > 0 ? ((investorAnnual / totalInvestment) * 100).toFixed(1) : '0';

    return {
      details, totalInvestment, totalMonthlyRent, franchiseeMonthly, franchiseeAnnual, investorMonthly,
      investorAnnual, investorPaybackMonths, investorAnnualReturn, selfCommissionRate, selfRentalRate,
      downstreamCommissionRate, downstreamRentalRate, downstreamAnnualSales, selfCommissionAmount,
      selfRentalAmount, downstreamCommissionAnnual, downstreamRentalMonthly, hqRate,
    };
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
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      });

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
    } catch (err) { alert(err.message || '审批操作失败'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />加载中...</div>;

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
                  <div className="text-sm text-blue-200">1kwh.store 电池资产银行</div>
                  <h1 className="text-3xl font-bold">加盟商控制台</h1>
                </div>
              </div>
              <p className="text-blue-200">欢迎回来,{user?.username} — 让每一块电池都成为全球流动的资产</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {[
              { label: '加盟门店', value: allStoresForStats.length },
              { label: '在运电池', value: allStoresForStats.reduce((s, st) => s + (st.total_batteries || 0), 0) },
              { label: '引导订单', value: allStoreOrders.length },
              { label: '申请记录', value: applications.length },
              { label: '全球网点', value: '100+' },
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
              { key: 'overview', label: '概览', icon: BarChart3 },
              { key: 'rules', label: '加盟规则', icon: Shield },
              { key: 'calculator', label: '收益测算', icon: Calculator },
              { key: 'cases', label: '优秀案例', icon: Star },
              { key: 'apply', label: '申请开店', icon: Plus },
              { key: 'agent-apply', label: '代理申请', icon: Award },
              ...(isAgent || hasApproved ? [{ key: 'earnings', label: '我的收益', icon: TrendingUp }] : []),
              ...(isAgent || hasApproved ? [{ key: 'wallet', label: '我的钱包', icon: Wallet }] : []),
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedStoreId(null); if (t.key === 'cases') loadTopCases(); if (t.key === 'earnings') loadEarnings(); if (t.key === 'wallet') loadWalletData(); if (t.key === 'agent-apply') loadAgentStatus(); }}
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
                <BadgeCheck className="h-4 w-4" /><span>市级加盟商审批</span>
              </button>
            )}
            {/* 开店审批 Tab - 省级/市级可见 */}
            {isAgent && (
              <button onClick={() => { setActiveTab('review-store'); setSelectedStoreId(null); loadReviewData(); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'review-store' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <ClipboardList className="h-4 w-4" /><span>开店审批</span>
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
                {agentType === 'province_agent' ? '省级总代理' : '市级加盟商'}
                <span className="font-normal text-gray-500">|</span>
                <span className="font-normal text-gray-500 text-xs">
                  {agentType === 'province_agent' ? '省域渠道管理 · 下级门店督导 · 区域招商' : '市域门店运营 · 本地推广 · 门店管理'}
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
                      <h2 className="text-lg font-bold text-gray-900">区县加盟店</h2>
                      <p className="text-xs text-gray-500">门店级加盟 · 区域代理体系</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">所属省/市</p>
                      <p className="font-semibold text-gray-900">{regionDisplay}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">上级代理</p>
                      <p className="font-semibold text-gray-900">
                        {infoCards.parentAgentName || '暂无'}
                      </p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">本月业绩汇总</p>
                      <p className="font-semibold text-green-600 text-lg">${perfMonthly.toLocaleString()}<span className="text-xs text-gray-400 ml-2">≈ ¥{(perfMonthly * 7.25).toLocaleString()}</span></p>
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
                      <h2 className="text-lg font-bold text-gray-900">市级加盟商</h2>
                      <p className="text-xs text-gray-500">
                        自营 {ownStores} 家 · 加盟 {franchisedStores} 家
                        {managedData?.region ? ` · 所属省: ${managedData.region}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">本月业绩（自营+加盟）</p>
                      <p className="font-semibold text-green-600 text-lg">${perfMonthly.toLocaleString()}<span className="text-xs text-gray-400 ml-2">≈ ¥{(perfMonthly * 7.25).toLocaleString()}</span></p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">自营门店</p>
                      <p className="font-semibold text-gray-900">{ownStores} 家</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">加盟门店</p>
                      <p className="font-semibold text-gray-900">{franchisedStores} 家</p>
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
                      <h2 className="text-lg font-bold text-gray-900">省级总代理</h2>
                      <p className="text-xs text-gray-500">
                        自营 {ownStores} 家 · 加盟 {franchisedStores} 家 · 全省管辖
                        {managedData?.region ? ` · ${managedData.region}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">本月业绩（自营+全省）</p>
                      <p className="font-semibold text-green-600 text-lg">${perfMonthly.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">自营门店</p>
                      <p className="font-semibold text-gray-900">{ownStores} 家</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">我的加盟商</p>
                      <p className="font-semibold text-gray-900">{managedFranchisees} 家</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">本省管辖门店</p>
                      <p className="font-semibold text-gray-900">{managedStores} 家</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 门店列表 / 门店详情 */}
            {selectedStoreId ? (
              <div>
                <button onClick={() => setSelectedStoreId(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
                  <ArrowLeft className="h-4 w-4" /> 返回门店列表
                </button>
                {detailLoading ? (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载门店详情...</div>
                ) : storeDetail ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{storeDetail.name}</h2>
                          <p className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {storeDetail.city} · {storeDetail.address || '—'} · 门店编码: <span className="font-mono text-blue-600">{storeDetail.store_code || '—'}</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${storeDetail.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{storeDetail.status === 'active' ? '运营中' : '待激活'}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{storeDetail.total_batteries || 0}</div>
                          <div className="text-xs text-gray-500 mt-1">在运电池</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{(storeDetail.revenue_share || 0.3) * 100}%</div>
                          <div className="text-xs text-gray-500 mt-1">收益分成</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">{(storeDetail.bound_investor_count) || 0}</div>
                          <div className="text-xs text-gray-500 mt-1">绑定投资者</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">${(storeDetail.monthly_total || 0).toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{((storeDetail.monthly_total || 0) * 7.25).toLocaleString()}</div></div>
                          <div className="text-xs text-gray-500 mt-1">本月业绩</div>
                        </div>
                      </div>
                    </div>

                    {/* 门店照片 */}
                    {((storeDetail.images && storeDetail.images.length > 0) || storeDetail.photo_url) && (
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-lg mb-4">门店照片</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {[...(storeDetail.images || []), ...(storeDetail.photo_url ? [storeDetail.photo_url] : [])].map((url, i) => (
                            <img key={i} src={url} alt={`${storeDetail.name} 照片${i + 1}`}
                              className="w-48 h-36 object-cover rounded-lg bg-gray-50 flex-shrink-0" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 绑定投资者列表 */}
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">绑定投资者</h3>
                        {!storeDetail.is_managed && (
                        <button onClick={() => { setShowStaffRegister(true); setStaffResult(null); }}
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                          <UserPlus className="h-4 w-4" /> 帮投资者注册
                        </button>
                        )}
                      </div>
                      {storeDetail.bound_investors?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-3">编码</th>
                                <th className="text-left p-3">用户名</th>
                                <th className="text-left p-3">邮箱</th>
                                <th className="text-right p-3">绑定时间</th>
                              </tr>
                            </thead>
                            <tbody>
                              {storeDetail.bound_investors.map((inv, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-3 font-mono text-xs text-blue-600">{inv.investor_code || '—'}</td>
                                  <td className="p-3 font-medium">{inv.username}</td>
                                  <td className="p-3 text-gray-500">{inv.email}</td>
                                  <td className="p-3 text-right text-gray-400">{new Date(inv.bound_at).toLocaleDateString('zh-CN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">暂无绑定投资者</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-500">门店详情加载失败</div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">我的门店</h2>
                  </div>
                  {stores.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无门店，前往"申请开店"提交加盟申请</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 自营门店 */}
                      {(() => {
                        const selfStores = stores.filter(s => s.store_type !== 'franchised' && !s.is_managed && s.owner_id === user?.id);
                        if (selfStores.length === 0) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Store className="h-4 w-4 text-blue-600" />
                              <h3 className="font-bold text-gray-900">自营门店</h3>
                              <span className="text-xs text-gray-400">（{selfStores.length} 家）</span>
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
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-orange-100 text-orange-700' : s.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? '营业中' : s.status === 'pending' ? '待审核' : s.status === 'suspended' ? '暂停营业' : '已停业'}</span>
                                      {s.status === 'pending' && s.appeal_reason && (
                                        <span className="text-xs text-orange-600">申诉: {s.appeal_reason}</span>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                                        className="opacity-0 group-hover:opacity-100 transition p-1 text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {s.status === 'closed' && (
                                        <button onClick={(e) => { e.stopPropagation(); setAppealStoreId(s.id); setAppealStoreName(s.name); setAppealReason(''); setShowAppealModal(true); }}
                                          className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                                          申诉
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-400">电池:</span> <span className="font-semibold">{s.total_batteries || 0}</span></div>
                                    <div><span className="text-gray-400">分成:</span> <span className="font-semibold">{(s.revenue_share || 0.3) * 100}%</span></div>
                                    <div><span className="text-gray-400">本月业绩:</span> <span className="font-semibold text-green-600">${(s.monthly_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<div className="text-xs text-gray-400 font-normal">≈ ¥{((s.monthly_sales || 0) * 7.25).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></span></div>
                                    <div><span className="text-gray-400">累计业绩:</span> <span className="font-semibold text-blue-600">${(s.total_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<div className="text-xs text-gray-400 font-normal">≈ ¥{((s.total_sales || 0) * 7.25).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></span></div>
                                  </div>
                                  <div onClick={() => openStoreDetail(s.id)} className="mt-3 text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                                    <Eye className="h-3 w-3" /> 查看详情
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* 加盟门店 */}
                      {(() => {
                        const franchisedStores = stores.filter(s => s.store_type === 'franchised' || s.is_managed || s.owner_id !== user?.id);
                        if (franchisedStores.length === 0) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Store className="h-4 w-4 text-green-600" />
                              <h3 className="font-bold text-gray-900">加盟门店</h3>
                              <span className="text-xs text-gray-400">（{franchisedStores.length} 家）</span>
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
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-orange-100 text-orange-700' : s.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? '营业中' : s.status === 'pending' ? '待审核' : s.status === 'suspended' ? '暂停营业' : '已停业'}</span>
                                      {s.status === 'pending' && s.appeal_reason && (
                                        <span className="text-xs text-orange-600">申诉: {s.appeal_reason}</span>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                                        className="opacity-0 group-hover:opacity-100 transition p-1 text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {s.status === 'closed' && (
                                        <button onClick={(e) => { e.stopPropagation(); setAppealStoreId(s.id); setAppealStoreName(s.name); setAppealReason(''); setShowAppealModal(true); }}
                                          className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                                          申诉
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-400">电池:</span> <span className="font-semibold">{s.total_batteries || 0}</span></div>
                                    <div><span className="text-gray-400">分成:</span> <span className="font-semibold">{(s.revenue_share || 0.3) * 100}%</span></div>
                                    <div><span className="text-gray-400">本月业绩:</span> <span className="font-semibold text-green-600">${(s.monthly_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<div className="text-xs text-gray-400 font-normal">≈ ¥{((s.monthly_sales || 0) * 7.25).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></span></div>
                                    <div><span className="text-gray-400">累计业绩:</span> <span className="font-semibold text-blue-600">${(s.total_sales || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<div className="text-xs text-gray-400 font-normal">≈ ¥{((s.total_sales || 0) * 7.25).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></span></div>
                                  </div>
                                  <div onClick={() => openStoreDetail(s.id)} className="mt-3 text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                                    <Eye className="h-3 w-3" /> 查看详情
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
              <h2 className="text-xl font-bold mb-4">近期引导订单</h2>
              {allStoreOrders.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500">暂无门店引导订单</div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">订单类型</th><th className="text-left p-3">资产</th><th className="text-left p-3">门店</th><th className="text-right p-3">数量</th><th className="text-right p-3">购买金额</th><th className="text-right p-3">月租金</th><th className="text-right p-3">购买佣金(5%)</th><th className="text-right p-3">租金分红(5%)</th><th className="text-right p-3">时间</th></tr></thead>
                    <tbody>{allStoreOrders.slice(0, 10).map(o => (
                      <tr key={o.id} className="border-t"><td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.order_type === '投资者绑定' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {o.order_type || '门店引导'}
                        </span>
                      </td><td className="p-3">{o.asset?.name || o.asset_name || o.battery_type || '-'}</td><td className="p-3">{o.store?.name || o.store_name || '-'}</td><td className="p-3 text-right">{o.units || 1}</td><td className="p-3 text-right font-medium">${(o.purchase_amount || o.total_amount || o.amount || 0).toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{((o.purchase_amount || o.total_amount || o.amount || 0) * 7.25).toLocaleString()}</div></td><td className="p-3 text-right text-gray-600">${(o._monthlyRent || 0).toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{((o._monthlyRent || 0) * 7.25).toLocaleString()}</div></td><td className="p-3 text-right font-medium text-green-600">${(o.store_commission || 0).toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{((o.store_commission || 0) * 7.25).toLocaleString()}</div></td><td className="p-3 text-right font-medium text-blue-600">${(o.revenue_share || 0).toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{((o.revenue_share || 0) * 7.25).toLocaleString()}</div></td><td className="p-3 text-right text-gray-400">{new Date(o.created_at).toLocaleDateString('zh-CN')}</td></tr>
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
                <h3 className="text-lg font-bold text-gray-900">管辖加盟门店</h3>
                {managedData?.stores && <span className="text-sm text-gray-500">（{managedData.stores.length} 家）</span>}
              </div>
              {managedLoading ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
              ) : managedData?.stores?.length > 0 ? (
                <div className="bg-white rounded-xl border">
                  <div className="divide-y">
                    {managedData.stores.map(s => (
                      <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{s.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'active' ? '营业中' : s.status === 'suspended' ? '暂停营业' : '已停业'}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            {s.city && <span>城市: {s.city}</span>}
                            {s.address && <span>地址: {s.address}</span>}
                            {s.phone && <span>电话: {s.phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">编辑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <Home className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>暂无加盟门店</p>
                </div>
              )}
            </div>
          )}

          {/* --- 省级总代理：管辖加盟商 + 全省门店（合并自 province-franchisees Tab） --- */}
          {isAgent && agentType === 'province_agent' && (
            <>
              {/* 加盟商列表 */}
              <div className="pt-6 border-t-2 border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">我的加盟商</h3>
                </div>
                {managedLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
                ) : managedData?.groups?.length > 0 ? (
                  <div className="space-y-4">
                    {managedData.groups.map(group => (
                      <div key={group.city} className="bg-white rounded-xl border">
                        <div className="px-5 py-3 border-b bg-gray-50">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <h4 className="font-bold">{group.city} ({group.franchisees?.length || 0} 家)</h4>
                          </div>
                        </div>
                        <div className="divide-y">
                          {group.franchisees?.map(f => (
                            <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                              <div>
                                <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {f.agent_type === 'city_franchisee' ? '市级加盟商' : f.agent_type || '加盟商'}
                                </span>
                                {f.store_count !== undefined && <span className="ml-2 text-sm text-gray-400">下属门店: {f.store_count} 家</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : managedData?.franchisees?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="divide-y">
                      {managedData.franchisees.map(f => (
                        <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {f.agent_type === 'city_franchisee' ? '市级加盟商' : f.agent_type || '加盟商'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>暂无加盟商数据</p>
                  </div>
                )}
              </div>

              {/* 本省所有门店列表 */}
              <div className="pt-6 border-t-2 border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">本省所有管辖门店</h3>
                  {provinceStores?.stores && <span className="text-sm text-gray-500">（{provinceStores.stores.length} 家）</span>}
                </div>
                {provinceStoresLoading ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
                ) : provinceStores?.stores?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="divide-y">
                      {provinceStores.stores.map(s => (
                        <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{s.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'active' ? '运营中' : '待激活'}</span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {s.city && <span>城市: {s.city}</span>}
                              {s.address && <span>地址: {s.address}</span>}
                              {s.phone && <span>电话: {s.phone}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditStoreForm({ id: s.id, name: s.name || '', city: s.city || '', address: s.address || '', phone: s.phone || '', photo_url: s.photo_url || '', images: s.images || [] }); setShowEditStore(true); }}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">编辑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                    <Store className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>暂无管辖门店</p>
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
                <h2 className="text-xl font-bold text-white">三级加盟商体系</h2>
                <p className="text-blue-200 text-sm mt-1">明确各层级权益与义务</p>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">加盟级别</th>
                      <th className="text-right p-3 font-semibold text-gray-700">加盟费</th>
                      <th className="text-right p-3 font-semibold text-gray-700">保证金</th>
                      <th className="text-right p-3 font-semibold text-gray-700">业绩目标</th>
                      <th className="text-right p-3 font-semibold text-gray-700">下级抽佣</th>
                      <th className="text-right p-3 font-semibold text-gray-700">下级分成</th>
                      <th className="text-left p-3 font-semibold text-gray-700">区域保护</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FRANCHISE_LEVELS.map((l, i) => (
                      <tr key={i} className={`border-b ${i === 0 ? 'bg-blue-50/50' : i === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="p-3 font-bold">{l.level}<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.badge}</span></td>
                        <td className="p-3 text-right font-semibold text-blue-700">{formatUSD(l.fee)}<div className="text-xs text-gray-400">{dualCurrency(l.fee).secondary}</div></td>
                        <td className="p-3 text-right">{formatUSD(l.deposit)}<div className="text-xs text-gray-400">{dualCurrency(l.deposit).secondary}</div></td>
                        <td className="p-3 text-right">${l.performanceTarget.toLocaleString()}<div className="text-xs text-gray-400">≈ ¥{(l.performanceTarget * 7.25).toLocaleString()}</div></td>
                        <td className="p-3 text-right font-semibold text-green-600">{l.commission}</td>
                        <td className="p-3 text-right font-semibold text-blue-600">{l.revShare}</td>
                        <td className="p-3">{l.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <strong>保证金退还说明：</strong>达成对应级别业绩目标后，加盟商可申请退还保证金。省代理达标线 $2,068,965，市代理 $689,655，区县门店 $137,931。
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-bold mb-4">收益分成比例体系</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-3">层级</th>
                      <th className="text-right p-3">租赁收入分成</th>
                      <th className="text-right p-3">新客销售佣金</th>
                      <th className="text-left p-3">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: '投资者', rent: '70%', comm: '—', desc: '资金投入回报，电池资产所有权', hl: true },
                      { role: '省级总代理', rent: '5%（自营）| 2%（下级）', comm: '5%（自营）| 2%（下级）', desc: '省域渠道管理、区域招商拓展、下级门店督导' },
                      { role: '市级加盟商', rent: '5%（自营）| 3%（下级）', comm: '5%（自营）| 3%（下级）', desc: '市域门店运营、本地市场推广、下级门店管理' },
                      { role: '区县级门店', rent: '5%', comm: '5%', desc: '一线销售服务、客户关系维护、电池配送换电' },
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
              <h3 className="text-lg font-bold mb-4">加盟商核心权益</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {BENEFITS.map((b, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 text-center hover:shadow-md transition">
                    <b.icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm mb-1">{b.title}</h4>
                    <p className="text-xs text-gray-500">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">加盟商义务要求</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {OBLIGATIONS.map((o, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 text-center hover:shadow-md transition">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold mx-auto mb-2">{o.num}</div>
                    <h4 className="font-bold text-sm mb-1">{o.title}</h4>
                    <p className="text-xs text-gray-500">{o.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">风控机制体系</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {RISK_CONTROLS.map((rc, i) => (
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
              <h3 className="text-lg font-bold mb-4">物料采购 — 可部署电池产品</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).map(p => (
                  <div key={p.id || p.name} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Battery className="h-5 w-5 text-blue-600" />
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.id || p.name}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                    <p className="text-xs text-gray-500 mb-3">{p.scene}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs border-t pt-3">
                      <div><span className="text-gray-400">电压:</span> {p.voltage}</div>
                      <div><span className="text-gray-400">电量:</span> {p.energy}</div>
                      <div><span className="text-gray-400">售价:</span> {formatUSD(p.price)}</div><div className="text-xs text-gray-400">{dualCurrency(p.price).secondary}</div>
                      <div><span className="text-gray-400">重量:</span> {p.weight}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-4">电池和换电设备由平台免费提供,加盟商仅需提供场地和日常运营。</p>
            </div>
          </div>
        )}

        {/* ==================== Tab: 收益测算 ==================== */}
        {activeTab === 'calculator' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">收益测算工具</h2>
              <p className="text-gray-500 text-sm">多类型电池自由组合, 自动测算投资额、收益与回本周期</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border p-6 space-y-5">
                <h3 className="font-bold text-lg">测算参数</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">加盟级别</label>
                  <select value={calcStoreType} onChange={e => setCalcStoreType(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                    <option value="province">省级总代理</option>
                    <option value="city">市级加盟商</option>
                    <option value="district">区县加盟店</option>
                  </select>
                </div>

                {calcStoreType !== 'district' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      下级门店销售额 (万元)
                      <span className="text-gray-400 font-normal ml-1">— {calcStoreType === 'province' ? '省级抽佣2%' : '市级抽佣3%'}</span>
                    </label>
                    <input type="number" min="0" step="1" value={calcDownstreamSales} onChange={e => setCalcDownstreamSales(e.target.value)}
                      placeholder={calcStoreType === 'province' ? '如:7500 (5市6区县预计销售额)' : '如:1400 (6区县预计销售额)'}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择电池型号与数量</label>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">两轮/三轮换电</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'swap').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{battery.monthlyRent > 0 ? formatUSD(battery.monthlyRent) : formatUSD(Math.round(battery.price * 0.05))}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">商用车电池</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'vehicle').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{battery.monthlyRent > 0 ? formatUSD(battery.monthlyRent) : formatUSD(Math.round(battery.price * 0.05))}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">工商业储能</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'ess').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{battery.monthlyRent > 0 ? formatUSD(battery.monthlyRent) : formatUSD(Math.round(battery.price * 0.05))}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">集装箱储能</div>
                    {(batteryTypes.length > 0 ? batteryTypes : BATTERY_PRODUCTS).filter(p => p.category === 'container').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · {formatUSD(battery.price)}/台 · 月租{battery.monthlyRent > 0 ? formatUSD(battery.monthlyRent) : formatUSD(Math.round(battery.price * 0.05))}</div>
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
              </div>

              <div className="space-y-4">
                {(() => {
                  const r = getCalcResult();
                  if (!r) return (
                    <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                      <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">请在左侧选择电池型号并设置数量</p>
                    </div>
                  );
                  return (
                    <>
                      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6">
                        <p className="text-blue-200 text-sm mb-1">加盟商月总收益</p>
                        <div className="text-4xl font-bold">{formatUSD(r.franchiseeMonthly)}</div>
                        <p className="text-blue-200 text-sm mt-2">自销佣金(一次性) + 自销租金{(r.selfRentalRate * 100).toFixed(0)}%{r.downstreamCommissionRate > 0 ? ` + 下级抽佣${(r.downstreamCommissionRate * 100).toFixed(0)}%+分成${(r.downstreamRentalRate * 100).toFixed(0)}%` : ''}</p>
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
                        <p className="text-xs text-gray-500 font-semibold mb-1">加盟商收益明细 (地区系数调整后)</p>
                        {[
                          { label: `自销租金 (${(r.selfRentalRate * 100).toFixed(0)}%)`, value: formatUSD(r.selfRentalAmount || 0), color: 'text-blue-600 font-medium' },
                          ...(r.downstreamRentalRate > 0 ? [
                            { label: `下级分成抽成 (${(r.downstreamRentalRate * 100).toFixed(0)}%)`, value: formatUSD(r.downstreamRentalMonthly || 0), color: 'text-indigo-600 font-medium' },
                          ] : []),
                          { label: '你的月总收益', value: formatUSD(r.franchiseeMonthly), color: 'text-blue-600 font-bold' },
                          { label: '---', value: '', color: 'text-gray-300' },
                          { label: `自销佣金 (${(r.selfCommissionRate * 100).toFixed(0)}%,一次性)`, value: formatUSD(r.selfCommissionAmount || 0), color: 'text-orange-600 font-medium' },
                          ...(r.downstreamCommissionRate > 0 ? [
                            { label: `下级佣金抽成 (${(r.downstreamCommissionRate * 100).toFixed(0)}%,一次性)`, value: formatUSD(r.downstreamCommissionAnnual || 0), color: 'text-purple-600 font-medium' },
                          ] : []),
                          { label: '---', value: '', color: 'text-gray-300' },
                          { label: `投资者月收益 (70%)`, value: formatUSD(r.investorMonthly), color: 'text-green-600' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.label}</span><span className={item.color}>{item.value}</span></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-blue-600">{r.investorAnnualReturn}%</div><div className="text-xs text-gray-500 mt-1">投资者年化回报</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-green-600">{isFinite(r.investorPaybackMonths) ? (r.investorPaybackMonths < 12 ? `${r.investorPaybackMonths.toFixed(1)}月` : `${(r.investorPaybackMonths / 12).toFixed(1)}年`) : '—'}</div><div className="text-xs text-gray-500 mt-1">投资者回本周期</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-purple-600">{formatUSD(r.franchiseeAnnual)}</div><div className="text-xs text-gray-500 mt-1">你的预估年收益</div></div>
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
              <h2 className="text-2xl font-bold mb-2">优秀加盟门店案例</h2>
              <p className="text-gray-500 text-sm">展示平台加盟门店运营数据，实际情况以门店运营为准</p>
            </div>
            {casesLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
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
                        <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{c.battery_count || c.total_batteries || 0}</div><div className="text-xs text-gray-500">在运电池/台</div></div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{c.status === 'active' ? '运营中' : c.status || '—'}</div><div className="text-xs text-gray-500">加盟状态</div></div>
                      </div>
                      {c.store_code && <p className="text-xs text-gray-400 font-mono">编码: {c.store_code}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">暂无优秀案例</p>
                <p className="text-sm mt-1">加盟门店运营数据将在这里展示</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 我的收益 ==================== */}
        {activeTab === 'earnings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">我的收益</h2>
              <p className="text-gray-500 text-sm">汇总自营门店与下辖门店的佣金及租金分成</p>
            </div>

            {earningsLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载收益数据...</div>
            ) : earningsData ? (
              <>
                {/* 总收入概览 */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6">
                  <div className="text-blue-200 text-sm">累计总收益</div>
                  <div className="text-4xl font-bold mt-1">${(earningsData.grand_total || 0).toLocaleString()}<div className="text-base font-normal text-blue-200 mt-1">≈ ¥{((earningsData.grand_total || 0) * 7.25).toLocaleString()}</div></div>
                </div>

                {/* 自营门店收益 */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" /> 自营门店收益
                    <span className="text-xs text-gray-400 font-normal ml-2">投资者购买佣金5% + 电池租金分成5%</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-700">${((earningsData.self_earnings?.purchase_commission || 0)).toLocaleString()}</div>
                      <div className="text-xs text-green-600 mt-1">购买佣金 (5%)</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-700">${((earningsData.self_earnings?.rental_share || 0)).toLocaleString()}</div>
                      <div className="text-xs text-blue-600 mt-1">租金分成 (5%)</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-700">${((earningsData.self_earnings?.total || 0)).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">小计</div>
                    </div>
                  </div>
                  {earningsData.self_earnings?.stores?.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">按门店明细</p>
                      <div className="space-y-2">
                        {earningsData.self_earnings.stores.map(s => (
                          <div key={s.store_id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{s.store_name}</span>
                              {s.rent_start_date && (
                                <span className="text-xs text-gray-400 ml-1">（{s.rent_start_date}起租）</span>
                              )}
                            </div>
                            <div className="flex gap-4 text-right">
                              <span className="text-green-600">佣金 ${(s.purchase_commission || 0).toLocaleString()}</span>
                              <span className="text-blue-600">分成 ${(s.rental_share || 0).toLocaleString()}</span>
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
                      <Users className="h-5 w-5 text-purple-600" /> 加盟门店收益
                      <span className="text-xs text-gray-400 font-normal ml-2">
                        购买佣金{agentType === 'province_agent' ? '2%' : '3%'} + 租金分成{agentType === 'province_agent' ? '2%' : '3%'}
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-700">${((earningsData.city_earnings?.purchase_commission || 0)).toLocaleString()}</div>
                        <div className="text-xs text-purple-600 mt-1">购买佣金 ({agentType === 'province_agent' ? '2%' : '3%'})</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-indigo-700">${((earningsData.city_earnings?.rental_share || 0)).toLocaleString()}</div>
                        <div className="text-xs text-indigo-600 mt-1">租金分成 ({agentType === 'province_agent' ? '2%' : '3%'})</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-700">${((earningsData.city_earnings?.total || 0)).toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">小计</div>
                      </div>
                    </div>
                    {/* 下辖门店明细 */}
                    {earningsData.city_earnings?.details?.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-600 mb-2">收益来源明细</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2 pr-2">投资账号</th>
                                <th className="pb-2 pr-2 text-right">购买金额</th>
                                <th className="pb-2 pr-2 text-right">佣金</th>
                                <th className="pb-2 pr-2 text-right">月租金</th>
                                <th className="pb-2 pr-2 text-right">分成</th>
                                <th className="pb-2 pr-2">起租日期</th>
                              </tr>
                            </thead>
                            <tbody>
                              {earningsData.city_earnings.details.map((d, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                  <td className="py-2 pr-2 font-medium text-gray-800">{d.investor_email || d.store_name}</td>
                                  <td className="py-2 pr-2 text-right">${(d.purchase_amount || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-2 text-right text-purple-600">${(d.commission || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-2 text-right">${(d.monthly_rent || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-2 text-right text-indigo-600">${(d.rent_share || 0).toLocaleString()}</td>
                                  <td className="py-2 pr-2 text-xs text-gray-400">{d.rent_start_date ? `${d.rent_start_date}起租` : '—'}</td>
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
                  <p className="font-semibold text-gray-600 mb-1">收益计算逻辑</p>
                  <p>· {agentType === 'province_agent' ? '省总代理' : '市级加盟商'}：累计收入 = 自营门店收益 + 下辖门店收益</p>
                  <p>· 自营门店收益 = 门店引导的投资者购买电池金额 × 5% + 投资者名下活跃电池租金 × 5%（按月/按天折算）</p>
                  <p>· 下辖门店收益 = 下辖门店引导的投资者购买电池金额 × {agentType === 'province_agent' ? '2%' : '3%'} + 投资者名下活跃电池租金 × {agentType === 'province_agent' ? '2%' : '3%'}</p>
                  {agentType === 'province_agent' && <p>· 省代理按2%从全省所有下辖门店抽取佣金和租金分成</p>}
                </div>

                {/* 无收益提示 */}
                {(!earningsData.self_earnings?.stores?.length && !earningsData.city_earnings) && (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">暂无收益数据</p>
                    <p className="text-sm mt-1">当门店引导投资者购买电池后，佣金和分成将在此处展示</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载收益数据失败</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 我的钱包 ==================== */}
        {activeTab === 'wallet' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">我的钱包</h2>
              <p className="text-gray-500 text-sm">加盟费、保证金与业绩目标一览</p>
            </div>

            {walletLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
            ) : (!(applications || []).some(a => a.status === 'approved') && !isAgent) ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">加盟申请尚未通过</p>
                <p className="text-sm mt-1">加盟费与保证金信息将在申请通过后展示</p>
              </div>
            ) : (
              <>
                {/* 我的余额双tab并排 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border overflow-hidden p-5">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-5">
                      <div className="text-blue-200 text-sm mb-1">我的余额（总）</div>
                      <div className="text-3xl font-bold">${(walletData.totalBalance || 0).toLocaleString()}</div>
                      <div className="text-blue-200 text-xs mt-1">≈ ¥{((walletData.totalBalance || 0) * 7.25).toLocaleString()}</div>
                      <div className="text-blue-200 text-xs mt-2">保证金 + 收益 - 已提现</div>
                      <div className="mt-3 bg-blue-500/30 rounded-lg px-3 py-2 text-xs">
                        保证金 ${(walletData.depositAmount || 0).toLocaleString()} + 收益 ${(walletData.cumulativeEarnings || 0).toLocaleString()} - 已提现
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden p-5">
                    {walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? (
                      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-xl p-5">
                        <div className="text-green-200 text-sm mb-1">可提现余额</div>
                        <div className="text-3xl font-bold">${(walletData.postTargetWithdrawable || 0).toLocaleString()}</div><div className="text-green-200 text-xs mt-1">≈ ¥{((walletData.postTargetWithdrawable || 0) * 7.25).toLocaleString()}</div>
                        <div className="text-green-200 text-xs mt-2">保证金 + 收益 - 已提现</div>
                        <div className="mt-3 bg-green-500/30 rounded-lg px-3 py-2 text-xs">已达标，可提现余额含保证金</div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 text-white rounded-xl p-5">
                        <div className="text-yellow-200 text-sm mb-1">可提现余额</div>
                        <div className="text-3xl font-bold">${(walletData.preTargetWithdrawable || 0).toLocaleString()}</div><div className="text-yellow-200 text-xs mt-1">≈ ¥{((walletData.preTargetWithdrawable || 0) * 7.25).toLocaleString()}</div>
                        <div className="text-yellow-200 text-xs mt-2">收益 - 待处理提现</div>
                        <div className="mt-3 bg-yellow-500/30 rounded-lg px-3 py-2 text-xs">尚未达标，保证金暂不可提现。达标后将开放保证金提现</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 立即提现按钮 */}
                <div className="flex justify-end">
                  <button onClick={() => {
                    setWithdrawModalForm({
                      amount: walletData.withdrawableBalance || 0,
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
                    <DollarSign className="h-4 w-4" /> 立即提现
                  </button>
                </div>

                {/* 资产概览 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border p-5">
                    <div className="text-sm text-gray-500 mb-1">我的加盟费</div>
                    <div className="text-2xl font-bold text-gray-900">${(walletData.franchiseFee || 0).toLocaleString()}</div><div className="text-xs text-gray-400 mt-0.5">≈ ¥{((walletData.franchiseFee || 0) * 7.25).toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <div className="text-sm text-gray-500 mb-1">我的保证金</div>
                    <div className="text-2xl font-bold text-blue-700">${(walletData.depositAmount || 0).toLocaleString()}</div><div className="text-xs text-gray-400 mt-0.5">≈ ¥{((walletData.depositAmount || 0) * 7.25).toLocaleString()}</div>
                  </div>
                </div>

                {/* 业绩概览 */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" /> 业绩追踪
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-blue-700">${(walletData.monthlyRevenue || 0).toLocaleString()}</div><div className="text-xs text-blue-500 mt-0.5">≈ ¥{((walletData.monthlyRevenue || 0) * 7.25).toLocaleString()}</div>
                      <div className="text-xs text-blue-600 mt-1">累计业绩（本月）</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-purple-700">${(walletData.cumulativePerformance || 0).toLocaleString()}</div><div className="text-xs text-purple-500 mt-0.5">≈ ¥{((walletData.cumulativePerformance || 0) * 7.25).toLocaleString()}</div>
                      <div className="text-xs text-purple-600 mt-1">累计业绩（总计）</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-orange-700">${(walletData.performanceTarget || 0).toLocaleString()}</div><div className="text-xs text-orange-500 mt-0.5">≈ ¥{((walletData.performanceTarget || 0) * 7.25).toLocaleString()}</div>
                      <div className="text-xs text-orange-600 mt-1">业绩目标</div>
                    </div>
                    <div className={`rounded-lg p-4 ${walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className={`text-lg font-bold ${walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                        {walletData.cumulativePerformance >= walletData.performanceTarget && walletData.performanceTarget > 0 ? '已达标' : '未达标'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">业绩达标状态</div>
                    </div>
                  </div>
                  {/* 业绩概览卡片结束 */}
                </div>

                {/* 业绩目标说明 */}
                <div className="bg-gray-50 rounded-xl border p-5 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600 mb-1">业绩目标说明</p>
                  <p>· 省级总代理：累计业绩达 $2,068,965 即可申请退还保证金</p>
                  <p>· 市级加盟商：累计业绩达 $689,655 即可申请退还保证金</p>
                  <p>· 区县门店：累计业绩达 $137,931 即可申请退还保证金</p>
                </div>

                {/* 提现明细 */}
                <div className="bg-white rounded-xl border">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" /> 提现明细
                    </h3>
                  </div>
                  {withdrawalsLoading ? (
                    <div className="p-8 text-center text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />加载中...
                    </div>
                  ) : (withdrawals || []).length > 0 ? (
                    <div className="divide-y">
                      {withdrawals.map((w, i) => (
                        <div key={w.id || i} className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">${(Number(w.amount) || 0).toLocaleString()}</span><span className="text-xs text-gray-400 ml-2">≈ ¥{((Number(w.amount) || 0) * 7.25).toLocaleString()}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {w.status === 'approved' ? '已通过' : w.status === 'rejected' ? '已拒绝' : '待审批'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              申请时间: {w.created_at ? new Date(w.created_at).toLocaleString('zh-CN') : '—'}
                              {w.review_note && <span className="ml-3 text-gray-400">备注: {w.review_note}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-gray-400">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg">暂无提现记录</p>
                      <p className="text-sm mt-1">提现申请将在此处展示</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">申请加盟开店</h2>
            <p className="text-gray-500 text-sm mb-6">支持全球范围申请</p>

            {applications.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-3">申请记录</h3>
                {applications.map(a => (
                  <div key={a.id} className="bg-white rounded-lg border p-4 mb-2 flex justify-between items-center">
                    <div><span className="font-medium">{a.store_name}</span><span className="text-sm text-gray-500 ml-2">{a.city}</span></div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status === 'pending' ? '审核中' : a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                  </div>
                ))}
              </div>
            )}

            {showApplyForm ? (
              <form onSubmit={handleApply} className="bg-white rounded-xl border p-6 space-y-4">
                {/* KYC 未认证警告 */}
                {user && user.kyc_status !== 'approved' && (
                  <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-700 font-medium text-sm">您尚未完成实名认证，请先完成认证后再提交开店申请</span>
                    <button type="button" onClick={() => router.push('/profile')} className="ml-auto bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">前往认证 →</button>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">目标地区 *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {REGIONS.map(r => (
                      <button key={r.code} type="button" onClick={() => setApplyForm({ ...applyForm, region: r.code, city: r.cities[0] || '', custom_city: '', custom_country: '', district: '', province_agent_id: '', city_agent_id: '' })}
                        className={`py-2.5 px-3 text-sm rounded-lg border font-medium transition ${applyForm.region === r.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{r.name}</button>
                    ))}
                  </div>
                </div>

                {/* ===== CN: 中国大陆代理选择 ===== */}
                {applyForm.region === 'cn' && (
                  <>
                    {agentOptionsLoading ? (
                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-600 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> 正在查询本地区代理信息...
                      </div>
                    ) : (
                      <>
                        {/* 省级总代理选择 */}
                        <div>
                          <label className="block text-sm font-medium mb-1.5">
                            <span className="text-gray-700">上级省级代理</span>
                          </label>
                          {agentStatus.has_province_agent ? (
                            <select value={applyForm.province_agent_id || ''}
                              onChange={e => setApplyForm({ ...applyForm, province_agent_id: e.target.value, city_agent_id: '' })}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white">
                              <option value="">请选择省级代理（不选则总部直批）</option>
                              {agentStatus.province_agents.map(a => (
                                <option key={`prov-${a.id}`} value={a.id}>{a.name}（{a.city || a.region}）</option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">暂无本省省级代理</div>
                          )}
                        </div>

                        {/* 市级加盟商选择（省级选中后显示） */}
                        {applyForm.province_agent_id && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              上级市级加盟商
                            </label>
                            {(() => {
                              const filteredCityAgents = (agentStatus.city_agents || []).filter(
                                a => String(a.parent_agent_id) === String(applyForm.province_agent_id)
                              );
                              return filteredCityAgents.length > 0 ? (
                                <select value={applyForm.city_agent_id || ''}
                                  onChange={e => setApplyForm({ ...applyForm, city_agent_id: e.target.value })}
                                  className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white">
                                  <option value="">不选择市级加盟商（归属省级代理）</option>
                                  {filteredCityAgents.map(a => (
                                    <option key={`city-${a.id}`} value={a.id}>{a.name}（{a.city}）</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">该省级代理暂无本市市级加盟商</div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 总部直批提示 */}
                        {agentStatus.direct_headquarters && !applyForm.province_agent_id && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                            <BadgeCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800">本地区暂无审批通过的代理</p>
                              <p className="text-xs text-green-600 mt-0.5">您的开店申请将由总部直接审批，无需选择上级代理</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* CN 手动输入省/市（无代理时） */}
                    {!agentOptionsLoading && agentStatus.direct_headquarters && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">省份 *</label>
                          <input type="text" value={applyForm.city} onChange={e => setApplyForm({...applyForm, city: e.target.value})}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="如: 广东" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">城市 *</label>
                          <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="如: 深圳" required />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ===== HK/TW/MO/BD/KH: 城市选择 ===== */}
                {['hk','tw','mo','bd','kh'].includes(applyForm.region) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">城市 *</label>
                      <select value={applyForm.city} onChange={e => setApplyForm({...applyForm, city: e.target.value, custom_city: ''})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                        {REGIONS.find(r => r.code === applyForm.region)?.cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {applyForm.city === '其它' && (
                        <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm mt-2" placeholder="请输入实际城市名" required />
                      )}
                    </div>
                  </>
                )}

                {/* ===== Other: 手动输入国家名+城市 ===== */}
                {applyForm.region === 'other' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">国家名称 *</label>
                      <input type="text" value={applyForm.custom_country} onChange={e => setApplyForm({...applyForm, custom_country: e.target.value})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="如: 美国 / 日本 / 德国" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">城市名称 *</label>
                      <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="如: 纽约" required />
                    </div>
                  </>
                )}

                {/* ===== 通用表单 ===== */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">区县所在地 *</label>
                  <input type="text" value={applyForm.district} onChange={e => setApplyForm({...applyForm, district: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="如: 莫尼旺大道/森索区" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">门店名称 *</label>
                  <input type="text" value={applyForm.store_name} onChange={e => setApplyForm({...applyForm, store_name: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="例如: 金边莫尼旺大道换电站" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">详细地址 *</label>
                  <input type="text" value={applyForm.address} onChange={e => setApplyForm({...applyForm, address: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="街道门牌号" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 *</label>
                  <input type="tel" value={applyForm.phone} onChange={e => setApplyForm({...applyForm, phone: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" placeholder="例如: +855 12 345 678" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">申请理由 *</label>
                  <textarea value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" rows={3} placeholder="简述您的优势与开店计划" required />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowApplyForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">取消</button>
                  <button type="submit" disabled={submitting || user?.kyc_status !== 'approved'} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="h-4 w-4" />{submitting ? '提交中...' : '提交申请'}</button>
                </div>
              </form>
            ) : (
              <button onClick={openApplyForm}
                disabled={user?.kyc_status !== 'approved'}
                className={`w-full bg-white rounded-xl border-2 border-dashed p-12 text-center transition ${user?.kyc_status !== 'approved' ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                <Globe className={`h-12 w-12 mx-auto mb-3 ${user?.kyc_status !== 'approved' ? 'text-gray-300' : 'text-gray-400'}`} />
                <span className={`font-medium ${user?.kyc_status !== 'approved' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.kyc_status !== 'approved' ? '请先完成实名认证后再申请开店' : '点击填写全球加盟申请表'}
                </span>
                <p className="text-gray-300 text-sm mt-1">支持全球各地区申请</p>
              </button>
            )}
          </div>
        )}

        {/* ==================== Tab: 代理申请 ==================== */}
        {activeTab === 'agent-apply' && (
          <div className="max-w-7xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">申请成为代理商</h2>

            {/* KYC 未认证警告 */}
            {user && user.kyc_status !== 'approved' && (
              <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 font-medium text-sm">您尚未完成实名认证，请先完成认证后再填写代理申请</span>
                <button onClick={() => router.push('/profile')} className="ml-auto bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">前往认证 →</button>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* 左侧：代理商类型选择卡片 */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold text-lg">选择代理商类型</h3>
                {AGENT_TYPES.map(type => {
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
                          <p className="text-xs text-gray-500">{type.area}保护</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{type.desc}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">加盟费</span>
                          <div className="font-semibold">{formatUSD(type.feeUsd)} <span className="text-gray-400 font-normal">≈ {formatCNY(usdToCny(type.feeUsd))}</span></div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">保证金</span>
                          <div className="font-semibold">{formatUSD(type.depositUsd)} <span className="text-gray-400 font-normal">≈ {formatCNY(usdToCny(type.depositUsd))}</span></div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">业绩目标(月)</span>
                          <div className="font-semibold">{formatUSD(type.performanceTargetUsd)} <span className="text-gray-400 font-normal">≈ {formatCNY(usdToCny(type.performanceTargetUsd))}</span></div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-gray-400">分成比例</span>
                          <div className="font-semibold text-green-600">{type.commission}</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        初始投入合计: <span className="font-bold text-gray-700">{formatUSD(type.feeUsd + type.depositUsd)} <span className="font-normal">≈ {formatCNY(usdToCny(type.feeUsd + type.depositUsd))}</span></span>
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
                    <h3 className="font-bold text-lg mb-3">我的申请记录</h3>
                    <div className="space-y-2">
                      {agentApps.map(a => (
                        <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <span className="font-medium">{a.agent_type === 'province_agent' ? '省级总代理' : '市级加盟商'}</span>
                            <span className="text-sm text-gray-500 ml-2">{a.full_name} · {a.region}{a.city ? ` · ${a.city}` : ''}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已拒绝' : '审核中'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 表单卡片 */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-bold text-lg mb-4">填写申请资料</h3>

                  {/* 未认证锁定提示 */}
                  {user && user.kyc_status !== 'approved' && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
                      <Lock className="h-4 w-4" /> 实名认证完成后才可编辑代理申请表单
                    </div>
                  )}

                  {agentResultMsg && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${agentResultMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {agentResultMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleAgentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">代理商类型 *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {AGENT_TYPES.map(type => (
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 *</label>
                        <input type="text" value={agentForm.full_name} onChange={e => setAgentForm({...agentForm, full_name: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="真实姓名" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 *</label>
                        <input type="tel" value={agentForm.phone} onChange={e => setAgentForm({...agentForm, phone: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="手机号码" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">目标地区 *</label>
                        <select value={agentForm.region} onChange={e => setAgentForm({...agentForm, region: e.target.value})}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                          {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {applyAgentType === 'province_agent' ? '省/直辖市 *' : '城市'}
                        </label>
                        {applyAgentType === 'province_agent' ? (
                          (() => {
                            const approvedProvinces = approvedAgents.filter(a => a.agent_type === 'province_agent').map(a => a.city || a.region);
                            const availableProvinces = PROVINCES.filter(p => !approvedProvinces.includes(p));
                            return (
                              <select value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                                disabled={user?.kyc_status !== 'approved'}
                                className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                                <option value="">请选择省或直辖市</option>
                                {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            );
                          })()
                        ) : applyAgentType === 'city_franchisee' && parentAgentId ? (
                          availableCities.length > 0 ? (
                            <select value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                              disabled={user?.kyc_status !== 'approved'}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                              <option value="">请选择城市</option>
                              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                              disabled={user?.kyc_status !== 'approved'}
                              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="目标城市" />
                          )
                        ) : (
                          <input type="text" value={agentForm.city} onChange={e => setAgentForm({...agentForm, city: e.target.value})}
                            disabled={user?.kyc_status !== 'approved'}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="目标城市" />
                        )}
                      </div>
                    </div>
                    {applyAgentType === 'city_franchisee' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          上级省级总代理 <span className="text-red-500">*</span>
                        </label>
                        <select value={parentAgentId} onChange={e => handleParentChange(e.target.value)}
                          disabled={user?.kyc_status !== 'approved'}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                          <option value="">请选择省级总代理（如无则总部直批）</option>
                          {approvedAgents.filter(a => a.agent_type === 'province_agent').map(a => (
                            <option key={a.id} value={a.id}>{a.full_name} ({a.city || a.region || '—'})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">申请理由</label>
                      <textarea value={agentForm.reason} onChange={e => setAgentForm({...agentForm, reason: e.target.value})}
                        disabled={user?.kyc_status !== 'approved'}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" rows={4}
                        placeholder="简述您的资源优势、团队情况与市场拓展计划..." />
                    </div>
                    <button type="submit" disabled={agentSubmitting || user?.kyc_status !== 'approved'}
                      className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send className="h-4 w-4" />{agentSubmitting ? '提交中...' : '提交申请'}
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
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载审批列表...</div>
            ) : reviewData ? (
              <>
                {/* 代理身份标识 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <BadgeCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">省级总代理 · 市级加盟商审批</h2>
                    <p className="text-sm text-gray-500">管理区域: {reviewData.region || '—'} | 仅审批本省内市级加盟商申请</p>
                  </div>
                </div>

                {reviewData.agent_applications?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">市级加盟商申请 ({reviewData.agent_applications.length})</h3>
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
                                {app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已拒绝' : '审核中'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              <span>手机: {app.phone}</span>
                              <span>地区: {app.region}</span>
                              <span>城市: {app.city || '—'}</span>
                            </div>
                            {app.reason && <p className="text-sm text-gray-400">理由: {app.reason}</p>}
                            {app.review_note && <p className="text-sm text-gray-400">批注: {app.review_note}</p>}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleReview('agent', app.id, 'approved')}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                <CheckCircle className="h-4 w-4" />通过
                              </button>
                              <button onClick={() => handleReview('agent', app.id, 'rejected')}
                                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">
                                <X className="h-4 w-4" />拒绝
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
                    <p className="text-lg">暂无待审批申请</p>
                    <p className="text-sm mt-1">当有用户申请本省市级加盟商时将显示在此处</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载审批数据失败</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 开店审批 ==================== */}
        {activeTab === 'review-store' && isAgent && (
          <div className="space-y-6">
            {reviewLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载审批列表...</div>
            ) : reviewData ? (
              <>
                {/* 代理身份标识 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {agentType === 'province_agent' ? '省级总代理' : '市级加盟商'} · 开店审批
                    </h2>
                    <p className="text-sm text-gray-500">
                      管理区域: {reviewData.region || '—'} | 
                      {agentType === 'province_agent' ? ' 审批本省管辖门店申请' : ' 审批本市管辖门店申请'}
                    </p>
                  </div>
                </div>

                {reviewData.store_applications?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">开店申请 ({reviewData.store_applications.length})</h3>
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
                                {app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已拒绝' : '审核中'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              <span>城市: {app.city}</span>
                              <span>电话: {app.phone}</span>
                              {app.address && <span>地址: {app.address}</span>}
                            </div>
                            {app.applicant && <p className="text-sm text-gray-400">申请人: {app.applicant.full_name || app.applicant.username} ({app.applicant.phone || '—'})</p>}
                            {app.reason && <p className="text-sm text-gray-400">理由: {app.reason}</p>}
                            {app.review_note && <p className="text-sm text-gray-400">批注: {app.review_note}</p>}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleReview('store', app.id, 'approved')}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                <CheckCircle className="h-4 w-4" />通过
                              </button>
                              <button onClick={() => handleReview('store', app.id, 'rejected')}
                                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">
                                <X className="h-4 w-4" />拒绝
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
                    <p className="text-lg">暂无待审批开店申请</p>
                    <p className="text-sm mt-1">当有门店提交开店申请时将显示在此处</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载审批数据失败</p>
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
              <h3 className="text-xl font-bold">帮投资者注册</h3>
              <button onClick={() => { setShowStaffRegister(false); setStaffResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">为投资者创建账户，自动绑定到当前门店 (编码: <strong>{storeDetail?.store_code || selectedStoreId}</strong>)</p>

            {staffResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${staffResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {staffResult.msg}
              </div>
            )}

            <form onSubmit={handleStaffRegister} className="space-y-3">
              <div>
                <label className="label">用户名 *</label>
                <input type="text" value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})}
                  className="input-field" placeholder="投资者用户名" required />
              </div>
              <div>
                <label className="label">邮箱 *</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                  className="input-field" placeholder="investor@email.com" required />
              </div>
              <div>
                <label className="label">密码 *</label>
                <input type="password" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                  className="input-field" placeholder="至少6位字符" required />
              </div>
              <div>
                <label className="label">手机号</label>
                <input type="tel" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})}
                  className="input-field" placeholder="可选" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowStaffRegister(false); setStaffResult(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">取消</button>
                <button type="submit" disabled={staffSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <UserPlus className="h-4 w-4" />{staffSubmitting ? '注册中...' : '注册并绑定'}
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
              <h3 className="text-xl font-bold">新增门店</h3>
              <button onClick={() => setShowAddStore(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {user && (!user.kyc_status || user.kyc_status !== 'approved') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span className="text-yellow-700 text-sm">请先完成实名认证后再开店</span>
              </div>
            )}
            <form onSubmit={handleAddStore} className="space-y-3">
              <div>
                <label className="label">门店名称 *</label>
                <input type="text" value={addStoreForm.name} onChange={e => setAddStoreForm({...addStoreForm, name: e.target.value})}
                  className="input-field" placeholder="例如: 金边堆谷区换电站" required />
              </div>
              <div>
                <label className="label">城市</label>
                <input type="text" value={addStoreForm.city} onChange={e => setAddStoreForm({...addStoreForm, city: e.target.value})}
                  className="input-field" placeholder="例如: 金边" />
              </div>
              <div>
                <label className="label">详细地址</label>
                <input type="text" value={addStoreForm.address} onChange={e => setAddStoreForm({...addStoreForm, address: e.target.value})}
                  className="input-field" placeholder="街道门牌号" />
              </div>
              <div>
                <label className="label">联系电话</label>
                <input type="tel" value={addStoreForm.phone} onChange={e => setAddStoreForm({...addStoreForm, phone: e.target.value})}
                  className="input-field" placeholder="门店电话" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddStore(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">取消</button>
                <button type="submit" disabled={addStoreSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <Plus className="h-4 w-4" />{addStoreSubmitting ? '创建中...' : '创建门店'}
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
            <h3 className="text-lg font-bold mb-4">编辑门店</h3>
            <form onSubmit={handleEditStore} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">门店名称</label>
                <input type="text" value={editStoreForm.name} onChange={e => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">城市</label>
                  <input type="text" value={editStoreForm.city} onChange={e => setEditStoreForm({ ...editStoreForm, city: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">电话</label>
                  <input type="text" value={editStoreForm.phone} onChange={e => setEditStoreForm({ ...editStoreForm, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">地址</label>
                <input type="text" value={editStoreForm.address} onChange={e => setEditStoreForm({ ...editStoreForm, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">门店照片（多张）</label>
                {((editStoreForm.images || []).length > 0 || editStoreForm.photo_url) ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                    {[...(editStoreForm.images || []), ...(editStoreForm.photo_url ? [editStoreForm.photo_url] : [])].map((url, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img src={url} alt={`门店照片${i + 1}`} className="w-24 h-24 object-cover rounded-lg border bg-gray-50" />
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
                    <p className="text-xs">暂无照片</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition">
                    {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    上传照片
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowEditStore(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={editStoreSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {editStoreSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}保存
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
            <h3 className="text-lg font-bold mb-2">门店申诉</h3>
            <p className="text-sm text-gray-600 mb-4">门店：{appealStoreName}</p>
            <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)}
              placeholder="请输入申诉理由"
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
              <button onClick={() => { setShowAppealModal(false); setAppealReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
              <button onClick={handleAppeal} disabled={appealSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {appealSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}提交申诉
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
              <h3 className="text-xl font-bold">佣金提现</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">提交后由 admin 审批，预计 1-3 个工作日处理</p>
            <form onSubmit={handleWithdrawModalSubmit} className="space-y-3">
              <div>
                <label className="label">提现金额 ($)</label>
                <input type="number" min="0" step="0.01" value={withdrawModalForm.amount}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, amount: e.target.value })}
                  className="input-field" placeholder="0.00" required />
              </div>
              <div>
                <label className="label">开户银行</label>
                <input type="text" value={withdrawModalForm.bank_name}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_name: e.target.value })}
                  className="input-field" placeholder="例如: ABA Bank" required />
              </div>
              <div>
                <label className="label">银行卡号</label>
                <input type="text" value={withdrawModalForm.bank_account}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_account: e.target.value })}
                  className="input-field" placeholder="银行卡号" required />
              </div>
              <div>
                <label className="label">持卡人姓名</label>
                <input type="text" value={withdrawModalForm.bank_holder}
                  onChange={e => setWithdrawModalForm({ ...withdrawModalForm, bank_holder: e.target.value })}
                  className="input-field" placeholder="与银行账户一致" required />
              </div>
              <div>
                <label className="label">盖章的营业执照 *</label>
                {withdrawModalForm.business_license_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> 已上传
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.business_license_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    上传营业执照
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'business_license_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="label">开票资料 *</label>
                {withdrawModalForm.invoice_info_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> 已上传
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.invoice_info_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    上传开票资料
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'invoice_info_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="label">发票 *</label>
                {withdrawModalForm.vat_invoice_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> 已上传
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {withdrawModalUploading.vat_invoice_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    上传发票
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleWithdrawModalFileUpload(e, 'vat_invoice_url')} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">取消</button>
                <button type="submit" disabled={withdrawModalSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {withdrawModalSubmitting ? '提交中...' : '提交提现'}
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
              <h3 className="text-xl font-bold">申请退保证金</h3>
              <button onClick={() => setShowDepositRefundModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              退保证金金额：<span className="font-semibold text-blue-600">${(walletData.depositAmount || 0).toLocaleString()} ≈ ¥{((walletData.depositAmount || 0) * 7.25).toLocaleString()}</span>，提交后由 admin 审批
            </p>
            <form onSubmit={handleDepositRefundSubmit} className="space-y-3">
              <div>
                <label className="label">开户银行</label>
                <input type="text" value={depositRefundForm.bank_name}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_name: e.target.value })}
                  className="input-field" placeholder="例如: ABA Bank" required />
              </div>
              <div>
                <label className="label">银行卡号</label>
                <input type="text" value={depositRefundForm.bank_account}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_account: e.target.value })}
                  className="input-field" placeholder="银行卡号" required />
              </div>
              <div>
                <label className="label">持卡人姓名</label>
                <input type="text" value={depositRefundForm.bank_holder}
                  onChange={e => setDepositRefundForm({ ...depositRefundForm, bank_holder: e.target.value })}
                  className="input-field" placeholder="与银行账户一致" required />
              </div>
              <div>
                <label className="label">盖章的营业执照 *</label>
                {depositRefundForm.business_license_url ? (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> 已有营业执照附件，无需重复上传
                  </div>
                ) : (
                  <label className="block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition text-center">
                    {depositRefundUploading.business_license_url ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : <Upload className="h-3.5 w-3.5 inline mr-1" />}
                    上传营业执照
                    <input type="file" accept="image/*,.pdf" onChange={handleDepositRefundFileUpload} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepositRefundModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">取消</button>
                <button type="submit" disabled={depositRefundSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {depositRefundSubmitting ? '提交中...' : '提交退保证金'}
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
          aria-label="打开 AI 顾问"
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
                <span className="font-semibold text-sm">1kwh 加盟专属顾问</span>
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
              placeholder="输入问题,如: 加盟费用、收益分成..." className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleChat} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1.5"><Send className="h-4 w-4" />发送</button>
          </div>

          <div className="px-3 pb-3 flex flex-wrap gap-2">
            {['加盟费用', '收益分成', '开店条件', '区域保护', '电池产品', '风控保障', '加盟流程'].map(tag => (
              <button key={tag} onClick={() => { setChatInput(tag); setTimeout(() => handleChat(), 100); }}
                className="text-xs bg-white border px-3 py-1.5 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">{tag}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
