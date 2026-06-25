'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { franchiseeAPI, orderAPI, agentAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import {
  Store, Battery, MapPin, Zap, Shield, TrendingUp, Send, Plus, QrCode, ClipboardList, BarChart3, Calculator, MessageCircle, Star, Globe, Users, DollarSign, Phone, Mail, ChevronRight, X, Loader2, Search, Home, Building2, BadgeCheck, AlertTriangle, Clock, Award, Target, Lightbulb, UserPlus, Eye, ArrowLeft, CheckCircle
} from 'lucide-react';

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
  { level: '省级总代理', fee: '¥50万', deposit: '¥20万', firstOrder: '¥200万', commission: '2%', revShare: '2%', area: '全省独家', color: 'from-blue-600 to-blue-800', badge: '最高级别', totalInvestment: '¥350万', downstreamRate: '抽佣2%+分成2%' },
  { level: '市级加盟商', fee: '¥20万', deposit: '¥5万', firstOrder: '¥50万', commission: '3%', revShare: '3%', area: '全市独家', color: 'from-blue-500 to-blue-700', badge: '推荐', totalInvestment: '¥105万', downstreamRate: '抽佣3%+分成3%' },
  { level: '区县级门店', fee: '¥5万', deposit: '¥1万', firstOrder: '¥10万', commission: '5%', revShare: '5%', area: '半径3km', color: 'from-sky-500 to-sky-700', badge: '入门', totalInvestment: '¥24万', downstreamRate: '抽佣5%+分成5%(无下级,保留字段)' },
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
  { num: 3, title: '业绩指标', desc: '年度销售目标:市级≥500万,区县级≥100万' },
  { num: 4, title: '合规经营', desc: '严格执行总部定价,不跨区域销售,不虚假宣传' },
  { num: 5, title: '客户服务', desc: '投资者咨询接待、合同签署、售后服务' },
];

const RISK_CONTROLS = [
  { icon: Battery, title: '电池损耗风控', items: ['8年质保,年衰减≤2.5%', 'IoT实时监控GPS+SOC', '每月计提3%损耗准备金', '全生命周期保险覆盖', '容量至80%转入储能梯次利用'] },
  { icon: Shield, title: '资金安全风控', items: ['第三方银行资金托管', '区块链存证资产确权', '投资与运营资金隔离', '持有满1年可赎回退出', '平台收入10%风险准备金'] },
  { icon: Zap, title: '租赁违约风控', items: ['租赁方企业征信审核', '缴纳3个月押金', 'BMS远程锁电功能', 'GPS实时追踪定位', '平台保底收益8%/年兜底'] },
];

const REGIONS = [
  { code: 'cn', name: '中国大陆', multiplier: 1.15, cities: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '其它'] },
  { code: 'hk', name: '中国香港', multiplier: 1.50, cities: ['香港岛', '九龙', '新界'] },
  { code: 'tw', name: '中国台湾', multiplier: 1.30, cities: ['台北', '新北', '桃园', '台中', '高雄', '台南'] },
  { code: 'bd', name: '孟加拉', multiplier: 1.00, cities: ['达卡', '吉大港', '库尔纳', '拉杰沙希', '锡尔赫特', '巴里萨尔', '其它'] },
  { code: 'kh', name: '柬埔寨', multiplier: 1.00, cities: ['金边', '暹粒', '西哈努克', '马德望', '贡布', '磅湛', '其它'] },
];

const TOP_CASES = [
  { name: '金边莫尼旺旗舰店', region: '柬埔寨·金边', batteries: 200, monthlyRev: '¥58,000', growth: '+32%', rank: 1, story: '市中心核心地段,日均换电超300次,已成为当地外卖骑手的首选换电站。' },
  { name: '胡志明市第一郡体验中心', region: '越南·胡志明市', batteries: 180, monthlyRev: '¥49,500', growth: '+28%', rank: 2, story: '位于CBD商圈,展示+体验+销售一体化运营,开業首月即达成业绩目标。' },
  { name: '曼谷素坤逸换电站', region: '泰国·曼谷', batteries: 150, monthlyRev: '¥41,200', growth: '+25%', rank: 3, story: '覆盖素坤逸沿线电摩用户,结合旅游租车场景,实现电池高周转率。' },
  { name: '深圳南山科技园店', region: '中国·深圳', batteries: 300, monthlyRev: '¥82,000', growth: '+45%', rank: 4, story: '科技园区内白领通勤+快递物流双场景覆盖,电池日均周转率达85%。' },
  { name: '台北信义区旗舰店', region: '中国·台湾台北', batteries: 120, monthlyRev: '¥33,000', growth: '+22%', rank: 5, story: '台湾首店,引入Gogoro兼容换电方案,快速打开本地电摩市场。' },
  { name: '暹粒吴哥旅游站', region: '柬埔寨·暹粒', batteries: 80, monthlyRev: '¥21,500', growth: '+18%', rank: 6, story: '旅游城市特色运营,为游客提供电动观光车换电服务,淡旺季策略灵活。' },
];

const CHAT_QA = {
  '加盟费用': '省级总代理:加盟费50万+保证金20万+首批采购200万,合计初始投入350万。市级加盟商:加盟费20万+保证金5万+首批采购50万,合计105万。区县级门店:加盟费5万+保证金1万+首批采购10万,合计24万。',
  '收益分成': '收益分成:投资者70%+总部20%+省级2%+市级3%+区县5%(含运营运维、电费保险、平台技术、风控)。自销佣金统一5%。省级下级抽佣2%+下级分成2%;市级下级抽佣3%+下级分成3%;区县级下级抽佣5%+下级分成5%(保留字段)。三级利益绑定。',
  '开店条件': '门店面积≥80㎡,配备≥3人专职团队,需按总部SI标准建设体验中心。总部提供装修补贴、培训和物料支持。',
  '区域保护': '省级代理全省独家,市级加盟全市独家,区县级门店半径3km保护范围。严格禁止跨区域销售。',
  '电池产品': '平台提供17款电池产品,覆盖两轮换电、商用车、工商业储能、集装箱储能全场景。电池由平台免费提供,加盟商专注运营。',
  '风控保障': '三大风控体系:1)电池损耗-8年质保+IoT监控+损耗准备金;2)资金安全-银行托管+区块链存证;3)租赁违约-征信审核+远程锁电+GPS追踪。',
  '加盟流程': '①提交申请→②平台审核(1-3工作日)→③签订合同→④设备部署→⑤开业培训→⑥正式运营。全程总部扶持,最快30天开业。',
  '退出机制': '持有满1年可赎回,赎回价=原值×(1-已使用月数×0.8%)。电池资产可在二级市场转让,保障流动性。',
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
  const [applyForm, setApplyForm] = useState({ store_name: '', region: 'cn', city: '北京', custom_city: '', district: '', address: '', phone: '', reason: '', province_agent_id: '', city_agent_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [agentStatus, setAgentStatus] = useState({ has_province_agent: false, province_agents: [], has_city_agent: false, city_agents: [], direct_headquarters: false });
  const [agentOptionsLoading, setAgentOptionsLoading] = useState(false);

  // 收益测算
  const [calcRegion, setCalcRegion] = useState('cn');
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
  const [selectedStore, setSelectedStore] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // AI 对话
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: '您好!我是1kwh加盟专属顾问,可以为您解答加盟费用、收益分成、开店条件、风控保障等问题。请输入您的问题~' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  /* ===== 数据加载 ===== */
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      router.push('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [storesRes, appsRes, ordersRes, agentRes] = await Promise.all([
        franchiseeAPI.getMyStores(),
        franchiseeAPI.getMyApplications(),
        orderAPI.getMyOrders().catch(() => ({ orders: [] })),
        agentAPI.getMyApplications().catch(() => ({ applications: [] })),
      ]);
      setStores(storesRes.stores || []);
      setApplications(appsRes.applications || []);
      setOrders(ordersRes.orders || []);
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
      } else if (user?.agentType) {
        // Fallback: use agent_type from auth context (synced by DB trigger)
        setIsAgent(true);
        setAgentType(user.agentType);
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

  /* ===== 门店详情 ===== */
  const openStoreDetail = async (storeId) => {
    setSelectedStoreId(storeId);
    setDetailLoading(true);
    setStoreDetail(null);
    try {
      const data = await franchiseeAPI.getStoreDetail(storeId);
      setStoreDetail(data);
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
    if (!region || !city || !showApplyForm) return;
    setAgentOptionsLoading(true);
    try {
      const data = await franchiseeAPI.getAgentOptions(region, city);
      setAgentStatus(data);
      // 如果本省无代理 → 清空省级；如果本市无代理 → 清空市级
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

  const openApplyForm = () => {
    setShowApplyForm(true);
    // agent options 将在 useEffect 中自动加载
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.store_name.trim()) { alert('请填写门店名称'); return; }
    if (!applyForm.district.trim()) { alert('请填写区县所在地'); return; }
    if (!applyForm.address.trim()) { alert('请填写详细地址'); return; }
    if (!applyForm.reason.trim()) { alert('请填写申请理由'); return; }
    setSubmitting(true);
    try {
      const regionInfo = REGIONS.find(r => r.code === applyForm.region);
      const actualCity = applyForm.city === '其它' ? applyForm.custom_city : applyForm.city;
      // parent_agent_id 优先级：市级ID > 省级ID > null
      const parent_agent_id = applyForm.city_agent_id || applyForm.province_agent_id || null;
      const agent_type = applyForm.city_agent_id ? 'city' : (applyForm.province_agent_id ? 'province' : null);
      const payload = {
        ...applyForm,
        city: `${regionInfo.name}·${actualCity}`,
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
    const selfCommissionRate = 0.05; // 统一5%
    const selfRentalRate = { province: 0.02, city: 0.03, district: 0.05 }[calcStoreType] || 0;
    const downstreamCommissionRate = { province: 0.02, city: 0.03, district: 0 }[calcStoreType] || 0;
    const downstreamRentalRate = { province: 0.02, city: 0.03, district: 0 }[calcStoreType] || 0;
    const investorRate = 0.70;

    const region = REGIONS.find(r => r.code === calcRegion);
    const regionMultiplier = region?.multiplier || 1;

    let totalInvestment = 0;
    const details = [];

    for (const battery of BATTERY_PRODUCTS) {
      const count = Number(calcBatteryCounts[battery.id]) || 0;
      if (count <= 0) continue;
      const invest = battery.price * count;
      totalInvestment += invest;
      details.push({ id: battery.id, name: battery.name, count, unitPrice: battery.price, invest });
    }

    if (details.length === 0) return null;

    const totalMonthlyRent = totalInvestment * selfRentalRate;
    const selfCommissionAmount = totalInvestment * regionMultiplier * selfCommissionRate;
    const selfRentalAmount = totalMonthlyRent * regionMultiplier;

    const downstreamAnnualSales = parseFloat(calcDownstreamSales) * 10000 || 0;
    const downstreamCommissionMonthly = downstreamAnnualSales * regionMultiplier * downstreamCommissionRate / 12;
    const downstreamRentalMonthly = downstreamAnnualSales * regionMultiplier * downstreamRentalRate / 12;

    const franchiseeMonthly = selfCommissionAmount + selfRentalAmount + downstreamCommissionMonthly + downstreamRentalMonthly;
    const investorMonthly = totalMonthlyRent * regionMultiplier * investorRate;
    const franchiseeAnnual = franchiseeMonthly * 12;
    const investorAnnual = investorMonthly * 12;
    const investorPaybackMonths = investorMonthly > 0 ? totalInvestment / investorMonthly : Infinity;
    const investorAnnualReturn = totalInvestment > 0 ? ((investorAnnual / totalInvestment) * 100).toFixed(1) : '0';

    return {
      details, totalInvestment, totalMonthlyRent, franchiseeMonthly, franchiseeAnnual, investorMonthly,
      investorAnnual, investorPaybackMonths, investorAnnualReturn, selfCommissionRate, selfRentalRate,
      downstreamCommissionRate, downstreamRentalRate, downstreamAnnualSales, selfCommissionAmount,
      selfRentalAmount, downstreamCommissionMonthly, downstreamRentalMonthly, regionMultiplier,
    };
  };

  /* ===== AI 对话 ===== */
  const handleChat = () => {
    const q = chatInput.trim();
    if (!q) return;
    const newMsgs = [...chatMessages, { role: 'user', text: q }];
    setChatMessages(newMsgs);
    setChatInput('');

    let reply = CHAT_QA.default;
    for (const [kw, ans] of Object.entries(CHAT_QA)) {
      if (kw === 'default') continue;
      if (q.includes(kw)) { reply = ans; break; }
    }
    setTimeout(() => setChatMessages([...newMsgs, { role: 'bot', text: reply }]), 600);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  /* ===== 辅助 ===== */
  const activeStores = stores.filter(s => s.status === 'active');

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
              { label: '运营门店', value: activeStores.length },
              { label: '在运电池', value: activeStores.reduce((s, st) => s + (st.total_batteries || 0), 0) },
              { label: '引导订单', value: orders.filter(o => o.store_id).length },
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
              { key: 'chatbot', label: 'AI顾问', icon: MessageCircle },
              { key: 'apply', label: '申请开店', icon: Plus },
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedStoreId(null); }}
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
            {/* 我的加盟商 Tab - 市级加盟商可见 */}
            {isAgent && agentType === 'city_franchisee' && (
              <button onClick={() => { setActiveTab('city-franchisees'); setSelectedStoreId(null); loadManaged('franchisees', ''); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'city-franchisees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Users className="h-4 w-4" /><span>我的加盟商</span>
              </button>
            )}
            {/* 我的门店 Tab - 省代理可见（本省所有门店+搜索） */}
            {isAgent && agentType === 'province_agent' && (
              <button onClick={() => { setActiveTab('province-stores'); setSelectedStoreId(null); setManagedSearch(''); loadManaged('stores', ''); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'province-stores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Store className="h-4 w-4" /><span>我的门店</span>
              </button>
            )}
            {/* 我的加盟商 Tab - 省代理可见（按市区县区分） */}
            {isAgent && agentType === 'province_agent' && (
              <button onClick={() => { setActiveTab('province-franchisees'); setSelectedStoreId(null); setManagedSearch(''); loadManaged('franchisees', ''); }}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === 'province-franchisees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Users className="h-4 w-4" /><span>我的加盟商</span>
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
                          <div className="text-2xl font-bold text-orange-600">${(storeDetail.monthly_revenue || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-500 mt-1">本月业绩</div>
                        </div>
                      </div>
                    </div>

                    {/* 门店照片 */}
                    {storeDetail.images && storeDetail.images.length > 0 && (
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-lg mb-4">门店照片</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {storeDetail.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`${storeDetail.name} 照片 ${idx + 1}`}
                              className="w-full h-36 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 绑定投资者列表 */}
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">绑定投资者</h3>
                        <button onClick={() => { setShowStaffRegister(true); setStaffResult(null); }}
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                          <UserPlus className="h-4 w-4" /> 帮投资者注册
                        </button>
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
                    <div className="grid md:grid-cols-2 gap-4">
                      {stores.map(s => (
                        <div key={s.id} onClick={() => openStoreDetail(s.id)}
                          className="bg-white rounded-xl border p-5 hover:shadow-md transition cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                            <div><h3 className="font-bold text-gray-900">{s.name}</h3>
                              <p className="flex items-center text-sm text-gray-500 mt-1"><MapPin className="h-3 w-3 mr-1" />{s.city}</p>
                              {s.store_code && <p className="text-xs font-mono text-blue-600 mt-0.5">{s.store_code}</p>}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-400">电池:</span> <span className="font-semibold">{s.total_batteries || 0}</span></div>
                            <div><span className="text-gray-400">分成:</span> <span className="font-semibold">{(s.revenue_share || 0.3) * 100}%</span></div>
                          </div>
                          <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> 查看详情
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 近期引导订单 */}
            <div>
              <h2 className="text-xl font-bold mb-4">近期引导订单</h2>
              {orders.filter(o => o.store_id).length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-500">暂无门店引导订单</div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">资产</th><th className="text-left p-3">门店</th><th className="text-right p-3">数量</th><th className="text-right p-3">金额</th><th className="text-right p-3">时间</th></tr></thead>
                    <tbody>{orders.filter(o => o.store_id).slice(0, 10).map(o => (
                      <tr key={o.id} className="border-t"><td className="p-3">{o.asset?.name || '-'}</td><td className="p-3">{o.store?.name || '-'}</td><td className="p-3 text-right">{o.units}</td><td className="p-3 text-right">${o.total_amount}</td><td className="p-3 text-right text-gray-400">{new Date(o.created_at).toLocaleDateString('zh-CN')}</td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </div>
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
                      <th className="text-right p-3 font-semibold text-gray-700">首批采购</th>
                      <th className="text-right p-3 font-semibold text-gray-700">下级抽佣</th>
                      <th className="text-right p-3 font-semibold text-gray-700">下级分成</th>
                      <th className="text-left p-3 font-semibold text-gray-700">区域保护</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FRANCHISE_LEVELS.map((l, i) => (
                      <tr key={i} className={`border-b ${i === 0 ? 'bg-blue-50/50' : i === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="p-3 font-bold">{l.level}<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.badge}</span></td>
                        <td className="p-3 text-right font-semibold text-blue-700">{l.fee}</td>
                        <td className="p-3 text-right">{l.deposit}</td>
                        <td className="p-3 text-right">{l.firstOrder}</td>
                        <td className="p-3 text-right font-semibold text-green-600">{l.commission}</td>
                        <td className="p-3 text-right font-semibold text-blue-600">{l.revShare}</td>
                        <td className="p-3">{l.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      { role: '1kwh总部', rent: '20%', comm: '—', desc: '品牌运营、电费运维、平台技术、风控保险' },
                      { role: '省级总代理', rent: '2%', comm: '2%', desc: '省域渠道管理、区域招商拓展、下级门店督导' },
                      { role: '市级加盟商', rent: '3%', comm: '3%', desc: '市域门店运营、本地市场推广、下级门店管理' },
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
                {BATTERY_PRODUCTS.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Battery className="h-5 w-5 text-blue-600" />
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.id}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                    <p className="text-xs text-gray-500 mb-3">{p.scene}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs border-t pt-3">
                      <div><span className="text-gray-400">电压:</span> {p.voltage}</div>
                      <div><span className="text-gray-400">电量:</span> {p.energy}</div>
                      <div><span className="text-gray-400">售价:</span> ¥{p.price.toLocaleString()}</div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">目标地区</label>
                    <select value={calcRegion} onChange={e => setCalcRegion(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                      {REGIONS.map(r => (<option key={r.code} value={r.code}>{r.name} (系数×{r.multiplier})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">加盟级别</label>
                    <select value={calcStoreType} onChange={e => setCalcStoreType(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                      <option value="province">省级总代理 (自销5%+租金2%+下级抽佣2%+分成2%)</option>
                      <option value="city">市级加盟商 (自销5%+租金3%+下级抽佣3%+分成3%)</option>
                      <option value="district">区县级门店 (自销5%+租金5%)</option>
                    </select>
                  </div>
                </div>

                {calcStoreType !== 'district' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      下级门店年销售额 (万元)
                      <span className="text-gray-400 font-normal ml-1">— 省级向下级抽佣{calcStoreType === 'province' ? '2' : '3'}%</span>
                    </label>
                    <input type="number" min="0" step="1" value={calcDownstreamSales} onChange={e => setCalcDownstreamSales(e.target.value)}
                      placeholder={calcStoreType === 'province' ? '如:7500 (5市6区县总年销售额)' : '如:1400 (6区县总年销售额)'}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择电池型号与数量</label>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">两轮/三轮换电</div>
                    {BATTERY_PRODUCTS.filter(p => p.category === 'swap').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · ¥{battery.price.toLocaleString()}/台 · 月租¥{Math.round(battery.price * 0.05).toLocaleString()}(5%)</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">商用车电池</div>
                    {BATTERY_PRODUCTS.filter(p => p.category === 'vehicle').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · ¥{battery.price.toLocaleString()}/台 · 月租¥{Math.round(battery.price * 0.05).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">工商业储能</div>
                    {BATTERY_PRODUCTS.filter(p => p.category === 'ess').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · ¥{battery.price.toLocaleString()}/台 · 月租¥{Math.round(battery.price * 0.05).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, (Number(prev[battery.id]) || 0) - 1) }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">−</button>
                          <input type="number" min="0" max="9999" value={Number(calcBatteryCounts[battery.id]) || 0} onChange={e => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-16 text-center rounded-md border-gray-200 border p-1 text-sm" />
                          <button onClick={() => setCalcBatteryCounts(prev => ({ ...prev, [battery.id]: (Number(prev[battery.id]) || 0) + 1 }))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 pt-2">集装箱储能</div>
                    {BATTERY_PRODUCTS.filter(p => p.category === 'container').map(battery => (
                      <div key={battery.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{battery.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{battery.energy} · {battery.voltage} · ¥{(battery.price / 10000).toFixed(0)}万/台 · 月租¥{Math.round(battery.price * 0.05 / 10000 * 10) / 10}万</div>
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
                        <div className="text-4xl font-bold">¥{r.franchiseeMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-blue-200 text-sm mt-2">自销佣金 {(r.selfCommissionRate * 100).toFixed(0)}% + 自销租金{(r.selfRentalRate * 100).toFixed(0)}%{r.downstreamCommissionRate > 0 ? ` + 下级抽佣${(r.downstreamCommissionRate * 100).toFixed(0)}%+分成${(r.downstreamRentalRate * 100).toFixed(0)}%` : ''}</p>
                      </div>
                      <div className="bg-white rounded-xl border p-6 space-y-4">
                        <h3 className="font-bold">测算明细</h3>
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <p className="font-semibold text-gray-700 text-sm mb-2">电池部署清单</p>
                          {r.details.map(d => (<div key={d.id} className="flex justify-between"><span>{d.name} × {d.count}</span><span className="text-gray-700">¥{d.invest.toLocaleString()}</span></div>))}
                        </div>
                        <hr className="border-gray-100" />
                        {[{ label: '总投资额', value: `¥${r.totalInvestment.toLocaleString()}`, bold: true }, { label: '地区系数', value: `×${r.regionMultiplier}` }, { label: '月租金 (投资额×5%)', value: `¥${r.totalMonthlyRent.toLocaleString()}` }].map((item, i) => (
                          <div key={i} className={`flex justify-between text-sm ${item.bold ? 'font-bold text-base border-t pt-3 mt-1 border-gray-100' : ''}`}>
                            <span className="text-gray-600">{item.label}</span><span className="text-gray-900">{item.value}</span>
                          </div>
                        ))}
                        <hr className="border-gray-100" />
                        <p className="text-xs text-gray-500 font-semibold mb-1">加盟商收益明细 (地区系数调整后)</p>
                        {[
                          { label: `自销佣金 (${(r.selfCommissionRate * 100).toFixed(0)}%)`, value: `¥${(r.selfCommissionAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-orange-600 font-medium' },
                          { label: `自销租金 (${(r.selfRentalRate * 100).toFixed(0)}%)`, value: `¥${(r.selfRentalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-blue-600 font-medium' },
                          ...(r.downstreamCommissionRate > 0 ? [
                            { label: `下级佣金抽成 (${(r.downstreamCommissionRate * 100).toFixed(0)}%)`, value: `¥${(r.downstreamCommissionMonthly || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-purple-600 font-medium' },
                            { label: `下级分成抽成 (${(r.downstreamRentalRate * 100).toFixed(0)}%)`, value: `¥${(r.downstreamRentalMonthly || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-indigo-600 font-medium' },
                          ] : []),
                          { label: '你的月总收益', value: `¥${r.franchiseeMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-blue-600 font-bold' },
                          { label: '---', value: '', color: 'text-gray-300' },
                          { label: `投资者月收益 (70%)`, value: `¥${r.investorMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-green-600' },
                          { label: `1kwh总部 (20%)`, value: `¥${(r.totalMonthlyRent * r.regionMultiplier * 0.20).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-gray-500' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.label}</span><span className={item.color}>{item.value}</span></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-blue-600">{r.investorAnnualReturn}%</div><div className="text-xs text-gray-500 mt-1">投资者年化回报</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-green-600">{isFinite(r.investorPaybackMonths) ? (r.investorPaybackMonths < 12 ? `${r.investorPaybackMonths.toFixed(1)}月` : `${(r.investorPaybackMonths / 12).toFixed(1)}年`) : '—'}</div><div className="text-xs text-gray-500 mt-1">投资者回本周期</div></div>
                        <div className="bg-white rounded-xl border p-4 text-center"><div className="text-2xl font-bold text-purple-600">¥{r.franchiseeAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-xs text-gray-500 mt-1">你的预估年收益</div></div>
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
              <h2 className="text-2xl font-bold mb-2">优秀门店案例</h2>
              <p className="text-gray-500 text-sm">全球加盟门店成功运营案例,数据真实可查</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {TOP_CASES.map((c, i) => (
                <div key={i} className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition group">
                  <div className={`bg-gradient-to-r ${i === 0 ? 'from-yellow-500 to-orange-500' : i === 1 ? 'from-gray-400 to-gray-600' : i === 2 ? 'from-amber-600 to-amber-800' : 'from-blue-500 to-blue-700'} px-5 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">{i < 3 ? <Award className="h-5 w-5 text-white" /> : <Star className="h-5 w-5 text-white" />}<span className="text-white font-bold">TOP {c.rank}</span></div>
                    <span className="text-white/80 text-sm">{c.growth}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1">{c.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-4"><MapPin className="h-3 w-3" />{c.region}</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{c.batteries}</div><div className="text-xs text-gray-500">在运电池/台</div></div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{c.monthlyRev}</div><div className="text-xs text-gray-500">月租赁收入</div></div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{c.story}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== Tab: AI 顾问 ==================== */}
        {activeTab === 'chatbot' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-white" /></div>
                <div><h3 className="text-white font-bold">1kwh 加盟专属顾问</h3><p className="text-blue-200 text-xs">AI智能问答 · 7×24在线</p></div>
              </div>
              <div className="h-[450px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white border text-gray-700 rounded-bl-md shadow-sm'}`}>{msg.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t p-3 flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="输入问题,如: 加盟费用、收益分成、开店条件..." className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleChat} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1.5"><Send className="h-4 w-4" />发送</button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['加盟费用', '收益分成', '开店条件', '区域保护', '电池产品', '风控保障', '加盟流程'].map(tag => (
                <button key={tag} onClick={() => { setChatInput(tag); setTimeout(() => handleChat, 100); }}
                  className="text-xs bg-white border px-3 py-1.5 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">{tag}</button>
              ))}
            </div>
          </div>
        )}

        {/* ==================== Tab: 申请开店 ==================== */}
        {activeTab === 'apply' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">申请加盟开店</h2>
            <p className="text-gray-500 text-sm mb-6">支持全球范围申请 — 中国大陆、香港、台湾、柬埔寨</p>

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">目标地区 *</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {REGIONS.map(r => (
                      <button key={r.code} type="button" onClick={() => setApplyForm({ ...applyForm, region: r.code, city: r.cities[0], district: '', province_agent_id: '', city_agent_id: '' })}
                        className={`py-2.5 px-3 text-sm rounded-lg border font-medium transition ${applyForm.region === r.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{r.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">城市 *</label>
                  <select value={applyForm.city} onChange={e => setApplyForm({...applyForm, city: e.target.value, district: '', province_agent_id: '', city_agent_id: '', custom_city: ''})} className="w-full rounded-lg border-gray-300 border p-2.5 text-sm">
                    {REGIONS.find(r => r.code === applyForm.region)?.cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {applyForm.city === '其它' && (
                    <input type="text" value={applyForm.custom_city} onChange={e => setApplyForm({...applyForm, custom_city: e.target.value})}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm mt-2" placeholder="请输入实际城市名" required />
                  )}
                </div>

                {/* ===== 上级代理选择（先省后市） ===== */}
                {agentOptionsLoading ? (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-600 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 正在查询本地区代理信息...
                  </div>
                ) : (
                  <>
                    {/* 1. 省级总代理 — 先选 */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {!agentStatus.has_province_agent ? (
                          <span className="text-gray-400">上级省级代理 <span className="font-normal">(本省暂无代理)</span></span>
                        ) : applyForm.city_agent_id ? (
                          <span className="text-gray-400">上级省级代理 <span className="font-normal">(已通过市级关联)</span></span>
                        ) : (
                          <span className="text-gray-700">上级省级代理 <span className="text-gray-400 font-normal">(可选)</span></span>
                        )}
                      </label>
                      {agentStatus.has_province_agent ? (
                        applyForm.city_agent_id ? (
                          <select value={applyForm.province_agent_id || ''} disabled
                            className="w-full rounded-lg border-gray-200 border bg-gray-100 p-2.5 text-sm text-gray-500 cursor-not-allowed">
                            <option value={applyForm.province_agent_id}>
                              {(() => { const p = agentStatus.province_agents.find(p => String(p.id) === String(applyForm.province_agent_id)); return p ? `${p.name}（${p.city || p.region}）` : '—'; })()}
                            </option>
                          </select>
                        ) : (
                          <select
                            value={applyForm.province_agent_id || ''}
                            onChange={e => {
                              const provId = e.target.value;
                              // 更换省级代理时清空市级选择
                              setApplyForm({ ...applyForm, province_agent_id: provId, city_agent_id: '' });
                            }}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white"
                          >
                            <option value="">请选择省级代理</option>
                            {agentStatus.province_agents.map(a => (
                              <option key={`prov-${a.id}`} value={a.id}>{a.name}（{a.city || a.region}）</option>
                            ))}
                          </select>
                        )
                      ) : (
                        <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">
                          暂无本省省级代理
                        </div>
                      )}
                    </div>

                    {/* 2. 市级加盟商 — 后选，根据省级联动筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        上级市级加盟商 <span className="text-gray-400 font-normal">(可选)</span>
                      </label>
                      {!applyForm.province_agent_id ? (
                        <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">
                          {agentStatus.has_province_agent ? '请先选择上级省级代理' : '本省暂无省级代理，暂无市级代理'}
                        </div>
                      ) : (() => {
                        // 根据选中的省级代理过滤市级代理
                        const filteredCityAgents = (agentStatus.city_agents || []).filter(
                          a => String(a.parent_agent_id) === String(applyForm.province_agent_id)
                        );
                        return filteredCityAgents.length > 0 ? (
                          <select
                            value={applyForm.city_agent_id || ''}
                            onChange={e => setApplyForm({ ...applyForm, city_agent_id: e.target.value })}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm bg-white"
                          >
                            <option value="">不选择市级加盟商（直接归属省级代理）</option>
                            {filteredCityAgents.map(a => (
                              <option key={`city-${a.id}`} value={a.id}>{a.name}（{a.city}）</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-400">
                            该省级代理暂无本市市级加盟商
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* 总部直批提示 */}
                {!agentOptionsLoading && agentStatus.direct_headquarters && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <BadgeCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">本地区暂无审批通过的代理</p>
                      <p className="text-xs text-green-600 mt-0.5">您的开店申请将由总部直接审批，无需选择上级代理</p>
                    </div>
                  </div>
                )}

                {/* 省级有代理但市级无代理提示 */}
                {!agentOptionsLoading && agentStatus.has_province_agent && !agentStatus.has_city_agent && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <BadgeCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">本市暂无市级加盟商</p>
                      <p className="text-xs text-blue-600 mt-0.5">请选择上级省级代理，申请将由省级代理审批</p>
                    </div>
                  </div>
                )}
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
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"><Send className="h-4 w-4" />{submitting ? '提交中...' : '提交申请'}</button>
                </div>
              </form>
            ) : (
              <button onClick={openApplyForm}
                className="w-full bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <span className="text-gray-500 font-medium">点击填写全球加盟申请表</span>
                <p className="text-gray-400 text-sm mt-1">支持中国大陆、香港、台湾、柬埔寨等地区</p>
              </button>
            )}
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

        {/* ==================== Tab: 市级加盟商 - 我的加盟商 ==================== */}
        {activeTab === 'city-franchisees' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-5">
              <h2 className="text-lg font-bold text-gray-900">我的加盟商</h2>
              <p className="text-sm text-gray-500 mt-1">管理本市级加盟代理下的区县级门店加盟商</p>
            </div>
            {managedLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
            ) : managedData ? (
              <>
                {managedData.franchisees?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">加盟商列表 ({managedData.franchisees.length})</h3>
                    </div>
                    <div className="divide-y">
                      {managedData.franchisees.map(f => (
                        <div key={f.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {f.agent_type === 'city_franchisee' ? '市级加盟商' : f.agent_type === 'store_owner' ? '区县级门店' : f.agent_type || '加盟商'}
                              </span>
                              {f.status && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  f.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{f.status === 'approved' ? '已审批' : f.status}</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {f.city && <span>城市: {f.city}</span>}
                              {f.phone && <span>电话: {f.phone}</span>}
                              {f.email && <span>邮箱: {f.email}</span>}
                            </div>
                            {f.store_count !== undefined && <p className="text-sm text-gray-400 mt-1">下属门店: {f.store_count} 家</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">暂无下级加盟商</p>
                    <p className="text-sm mt-1">当有区县门店加盟商审批通过后将显示在此处</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载数据失败</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 省代理 - 我的门店 ==================== */}
        {activeTab === 'province-stores' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
              <h2 className="text-lg font-bold text-gray-900">我的门店</h2>
              <p className="text-sm text-gray-500 mt-1">查看本省所有管辖门店，可按门店名称/城市搜索</p>
            </div>
            {/* 搜索栏 */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={managedSearch} onChange={e => setManagedSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadManaged('stores', managedSearch); }}
                  placeholder="搜索门店名称或城市..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <button onClick={() => loadManaged('stores', managedSearch)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">搜索</button>
            </div>
            {managedLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
            ) : managedData ? (
              <>
                {managedData.stores?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">门店列表 ({managedData.total || managedData.stores.length})</h3>
                    </div>
                    <div className="divide-y">
                      {managedData.stores.map(s => (
                        <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{s.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>{s.status === 'active' ? '运营中' : '待激活'}</span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {s.city && <span>城市: {s.city}</span>}
                              {s.address && <span>地址: {s.address}</span>}
                              {s.phone && <span>电话: {s.phone}</span>}
                            </div>
                            {s.owner_name && <p className="text-sm text-gray-400 mt-1">加盟商: {s.owner_name} ({s.owner_agent_type || '—'})</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Store className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">暂无门店数据</p>
                    <p className="text-sm mt-1">{managedSearch ? '未找到匹配的门店，请尝试其他关键词' : '本省暂无管辖门店'}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载数据失败</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab: 省代理 - 我的加盟商 ==================== */}
        {activeTab === 'province-franchisees' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
              <h2 className="text-lg font-bold text-gray-900">我的加盟商</h2>
              <p className="text-sm text-gray-500 mt-1">按市区县查看本省市级加盟商及其下属门店</p>
            </div>
            {/* 搜索栏 */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={managedSearch} onChange={e => setManagedSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadManaged('franchisees', managedSearch); }}
                  placeholder="搜索加盟商名称或城市..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <button onClick={() => loadManaged('franchisees', managedSearch)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">搜索</button>
            </div>
            {managedLoading ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...</div>
            ) : managedData ? (
              <>
                {managedData.groups?.length > 0 ? (
                  <div className="space-y-6">
                    {managedData.groups.map(group => (
                      <div key={group.city} className="bg-white rounded-xl border">
                        <div className="px-5 py-4 border-b bg-gray-50">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <h3 className="font-bold text-lg">{group.city} ({group.franchisees?.length || 0} 家加盟商)</h3>
                            {group.store_count !== undefined && (
                              <span className="text-sm text-gray-500">· 共 {group.store_count} 家门店</span>
                            )}
                          </div>
                        </div>
                        <div className="divide-y">
                          {group.franchisees?.map(f => (
                            <div key={f.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {f.agent_type === 'city_franchisee' ? '市级加盟商' : f.agent_type || '加盟商'}
                                  </span>
                                  {f.status && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      f.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>{f.status === 'approved' ? '已审批' : f.status}</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                                  {f.phone && <span>电话: {f.phone}</span>}
                                  {f.email && <span>邮箱: {f.email}</span>}
                                </div>
                                {f.store_count !== undefined && <p className="text-sm text-gray-400 mt-1">下属门店: {f.store_count} 家</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : managedData.franchisees?.length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    <div className="px-5 py-4 border-b">
                      <h3 className="font-bold text-lg">加盟商列表 ({managedData.total || managedData.franchisees.length})</h3>
                    </div>
                    <div className="divide-y">
                      {managedData.franchisees.map(f => (
                        <div key={f.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{f.full_name || f.username}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {f.agent_type === 'city_franchisee' ? '市级加盟商' : f.agent_type || '加盟商'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {f.city && <span>城市: {f.city}</span>}
                              {f.phone && <span>电话: {f.phone}</span>}
                              {f.email && <span>邮箱: {f.email}</span>}
                            </div>
                            {f.store_count !== undefined && <p className="text-sm text-gray-400 mt-1">下属门店: {f.store_count} 家</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">暂无加盟商数据</p>
                    <p className="text-sm mt-1">{managedSearch ? '未找到匹配的加盟商，请尝试其他关键词' : '本省暂无市级加盟商'}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>加载数据失败</p>
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
    </div>
  );
}
