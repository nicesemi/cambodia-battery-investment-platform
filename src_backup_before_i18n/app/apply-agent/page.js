'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { agentAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Award, Shield, TrendingUp, DollarSign, Building2, Users, Globe, MapPin, Phone, Mail, Send, Loader2, BadgeCheck, Clock, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { getCities, getRegionCities } from '../../data/region-cities';
import { formatUSD, formatCNY, usdToCny } from '../../lib/currency';

const REGIONS = [
  { code: 'cn', name: '中国大陆' },
  { code: 'hk', name: '中国香港' },
  { code: 'tw', name: '中国台湾' },
  { code: 'bd', name: '孟加拉' },
  { code: 'kh', name: '柬埔寨' },
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

const AGENT_TYPES = [
  {
    key: 'province_agent',
    label: '省级总代理',
    feeUsd: 551724,
    depositUsd: 137931,
    performanceTargetUsd: 1379310,
    commission: '5%',
    revShare: '5%',
    area: '全省独家',
    color: 'from-blue-600 to-blue-800',
    desc: '最高级别代理，覆盖全省范围，享最高佣金比例和下级抽佣',
    benefits: ['自销佣金5% + 自销租金5%', '下级市级佣金抽佣2%', '下级租金抽佣2%', '全省独家代理权', '优先获取新品配额'],
  },
  {
    key: 'city_franchisee',
    label: '市级加盟商',
    feeUsd: 206897,
    depositUsd: 68966,
    performanceTargetUsd: 689655,
    commission: '5%',
    revShare: '5%',
    area: '全市独家',
    color: 'from-blue-500 to-blue-700',
    desc: '核心城市运营商，负责市级区域的加盟门店发展与管理',
    benefits: ['自销佣金5% + 自销租金5%', '下级区县佣金抽佣3%', '下级区县租金抽佣3%', '全市独家代理权', '总部营销资源倾斜'],
  },
];

export default function ApplyAgent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [agentType, setAgentType] = useState('');
  const [form, setForm] = useState({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [approvedAgents, setApprovedAgents] = useState([]);
  const [parentAgentId, setParentAgentId] = useState('');
  const [claimedCities, setClaimedCities] = useState([]);
  const [isProvinceAgent, setIsProvinceAgent] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      router.push('/');
      return;
    }
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    try {
      const data = await agentAPI.getMyApplications();
      setApplications(data.applications || []);
      const agentData = await agentAPI.getApproved();
      setApprovedAgents(agentData.agents || []);
      // 检查当前用户是否已是审批通过的省级代理
      const isProvince = (data.applications || []).some(
        a => a.agent_type === 'province_agent' && a.status === 'approved'
      );
      setIsProvinceAgent(isProvince);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // 当选择上级省级代理时，加载该省下已被占用的城市
  const handleParentChange = async (agentId) => {
    setParentAgentId(agentId);
    if (!agentId) {
      setAvailableCities([]);
      setClaimedCities([]);
      return;
    }
    const parentAgent = approvedAgents.find(a => String(a.id) === String(agentId));
    if (!parentAgent) return;
    const province = parentAgent.city || parentAgent.region;
    setForm(prev => ({ ...prev, city: '' }));
    try {
      const data = await agentAPI.getClaimedCities(province);
      const claimed = data.claimed_cities || [];
      setClaimedCities(claimed);
      // 构建可选城市列表
      const allCities = getCities(province);
      if (allCities.length > 0) {
        setAvailableCities(allCities.filter(c => !claimed.includes(c)));
      } else {
        // 非中国省份用 region-cities 映射
        const regionCities = getRegionCities(parentAgent.region || 'cn');
        setAvailableCities(regionCities.filter(c => !claimed.includes(c)));
      }
    } catch (e) {
      console.error(e);
      // 降级：不加载已占城市
      const allCities = getCities(province);
      if (allCities.length > 0) {
        setAvailableCities(allCities);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agentType) { alert('请选择代理商类型'); return; }
    if (!form.full_name.trim()) { alert('请填写姓名'); return; }
    if (!form.phone.trim()) { alert('请填写联系电话'); return; }
    if (agentType === 'city_franchisee' && !parentAgentId) { alert('请选择上级省级总代理'); return; }
    setSubmitting(true);
    setResultMsg(null);
    try {
      const payload = {
        agent_type: agentType,
        ...form,
      };
      if (agentType === 'city_franchisee') {
        payload.parent_agent_id = parentAgentId;
      }
      await agentAPI.apply(payload);
      setResultMsg({ type: 'success', text: '申请已提交！平台将在 1-3 个工作日内审核，请留意通知。' });
      setForm({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
      setAgentType('');
      setParentAgentId('');
      loadStatus();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || '提交失败，请重试' });
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />加载中...</div>;

  const kycApproved = user?.kyc_status === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      {user && !kycApproved && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-700 font-medium text-sm">您尚未完成实名认证，请先完成认证后再填写代理申请</span>
          </div>
          <button onClick={() => router.push('/profile')} className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-700 whitespace-nowrap">
            前往认证 →
          </button>
        </div>
      )}
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Award className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">申请成为代理商</h1>
          <p className="text-blue-200 max-w-2xl mx-auto">加入 1kwh.store 全球电池资产银行代理网络，共享新能源万亿市场红利</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-3xl mx-auto">
            {[{ label: '全球网点', value: '100+' }, { label: '在运电池', value: '50,000+' }, { label: '服务用户', value: '200万+' }, { label: '年增长率', value: '+320%' }].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-blue-200 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧：代理商类型说明 */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold">选择代理商类型</h2>
            {AGENT_TYPES.map(type => {
              const disabled = isProvinceAgent && type.key === 'city_franchisee';
              return (
              <div key={type.key}
                onClick={() => !disabled && kycApproved && setAgentType(type.key)}
                className={`bg-white rounded-xl border-2 p-5 transition ${
                  disabled || !kycApproved ? 'opacity-50 cursor-not-allowed border-gray-200' :
                  agentType === type.key ? 'border-blue-500 ring-2 ring-blue-200 cursor-pointer hover:shadow-md' : 'border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-md'
                }`}>
                {disabled && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mb-2">
                    <AlertTriangle className="h-3 w-3" />省级代理不可申请市级
                  </div>
                )}
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
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">加盟费</span><div className="font-semibold text-xs">{formatUSD(type.feeUsd)} <span className="text-gray-400 font-normal">{formatCNY(usdToCny(type.feeUsd))}</span></div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">保证金</span><div className="font-semibold text-xs">{formatUSD(type.depositUsd)} <span className="text-gray-400 font-normal">{formatCNY(usdToCny(type.depositUsd))}</span></div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">业绩目标(月)</span><div className="font-semibold text-xs">{formatUSD(type.performanceTargetUsd)} <span className="text-gray-400 font-normal">{formatCNY(usdToCny(type.performanceTargetUsd))}</span></div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">销售佣金</span><div className="font-semibold text-green-600">{type.commission}</div></div>
                </div>
                <p className="text-xs text-gray-400">初始投入合计: <span className="font-bold text-gray-700">{formatCNY(usdToCny(type.feeUsd) + usdToCny(type.depositUsd))}</span></p>
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

          {/* 右侧：申请表单 + 记录 */}
          <div className="lg:col-span-2 space-y-6">
            {applications.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-lg mb-3">我的申请记录</h3>
                <div className="space-y-2">
                  {applications.map(a => (
                    <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{a.agent_type === 'province_agent' ? '省级总代理' : '市级加盟商'}</span>
                        <span className="text-sm text-gray-500 ml-2">{a.full_name} · {a.region}{a.city ? ` · ${a.city}` : ''}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === 'approved' ? 'bg-green-100 text-green-700' :
                        a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已拒绝' : '审核中'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-lg mb-4">填写申请资料</h3>

              {!kycApproved && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm font-medium">实名认证完成后才可编辑代理申请表单</span>
                </div>
              )}

              {resultMsg && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${resultMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {resultMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">代理商类型 *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {AGENT_TYPES.map(type => (
                      <button key={type.key} type="button" disabled={!kycApproved}
                        onClick={() => setAgentType(type.key)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                          agentType === type.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 *</label>
                    <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="真实姓名" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 *</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="手机号码" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">目标地区 *</label>
                    <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                      {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {agentType === 'province_agent' ? '省/直辖市 *' : '城市'}
                    </label>
                    {agentType === 'province_agent' ? (
                      (() => {
                        const approvedProvinces = approvedAgents
                          .filter(a => a.agent_type === 'province_agent')
                          .map(a => a.city || a.region);
                        const availableProvinces = PROVINCES.filter(p => !approvedProvinces.includes(p));
                        return (
                          <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                            <option value="">请选择省或直辖市</option>
                            {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        );
                      })()
                    ) : agentType === 'city_franchisee' && parentAgentId ? (
                      availableCities.length > 0 ? (
                        <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                          <option value="">请选择城市</option>
                          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="目标城市" />
                      )
                    ) : (
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="目标城市" />
                    )}
                  </div>
                </div>
                {agentType === 'city_franchisee' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      上级省级总代理 <span className="text-red-500">*</span>
                    </label>
                    <select value={parentAgentId} onChange={e => handleParentChange(e.target.value)} disabled={!kycApproved}
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
                  <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} disabled={!kycApproved}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" rows={4}
                    placeholder="简述您的资源优势、团队情况与市场拓展计划..." />
                </div>
                <button type="submit" disabled={submitting || !kycApproved}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="h-4 w-4" />{submitting ? '提交中...' : '提交申请'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
