'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { agentAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Award, Shield, TrendingUp, DollarSign, Building2, Users, Globe, MapPin, Phone, Mail, Send, Loader2, BadgeCheck, Clock, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { getCities, getRegionCities } from '../../data/region-cities';
import { formatCurrency, localeCurrency, fetchRates } from '../../lib/currency';

const getRegions = (t) => [
  { code: 'cn', name: t('applyAgent.region.cn') },
  { code: 'hk', name: t('applyAgent.region.hk') },
  { code: 'tw', name: t('applyAgent.region.tw') },
  { code: 'bd', name: t('applyAgent.region.bd') },
  { code: 'kh', name: t('applyAgent.region.kh') },
];

const getProvinces = (t) => [
  t('applyAgent.province.北京'), t('applyAgent.province.天津'), t('applyAgent.province.上海'), t('applyAgent.province.重庆'),
  t('applyAgent.province.河北'), t('applyAgent.province.山西'), t('applyAgent.province.辽宁'), t('applyAgent.province.吉林'), t('applyAgent.province.黑龙江'),
  t('applyAgent.province.江苏'), t('applyAgent.province.浙江'), t('applyAgent.province.安徽'), t('applyAgent.province.福建'), t('applyAgent.province.江西'), t('applyAgent.province.山东'),
  t('applyAgent.province.河南'), t('applyAgent.province.湖北'), t('applyAgent.province.湖南'), t('applyAgent.province.广东'), t('applyAgent.province.海南'),
  t('applyAgent.province.四川'), t('applyAgent.province.贵州'), t('applyAgent.province.云南'), t('applyAgent.province.陕西'), t('applyAgent.province.甘肃'), t('applyAgent.province.青海'),
  t('applyAgent.province.广西'), t('applyAgent.province.内蒙古'), t('applyAgent.province.西藏'), t('applyAgent.province.宁夏'), t('applyAgent.province.新疆'),
  t('applyAgent.province.香港'), t('applyAgent.province.澳门'), t('applyAgent.province.台湾'),
];

const getAgentTypes = (t) => [
  {
    key: 'province_agent',
    label: t('applyAgent.typeProvince'),
    feeUsd: 551724,
    depositUsd: 137931,
    performanceTargetUsd: 1379310,
    commission: '5%',
    revShare: '5%',
    area: t('applyAgent.typeProvinceBenefit4'),
    color: 'from-blue-600 to-blue-800',
    desc: t('applyAgent.typeProvinceDesc'),
    benefits: [t('applyAgent.typeProvinceBenefit1'), t('applyAgent.typeProvinceBenefit2'), t('applyAgent.typeProvinceBenefit3'), t('applyAgent.typeProvinceBenefit4'), t('applyAgent.typeProvinceBenefit5')]},
  {
    key: 'city_franchisee',
    label: t('applyAgent.typeCity'),
    feeUsd: 206897,
    depositUsd: 68966,
    performanceTargetUsd: 689655,
    commission: '5%',
    revShare: '5%',
    area: t('applyAgent.typeCityBenefit4'),
    color: 'from-blue-500 to-blue-700',
    desc: t('applyAgent.typeCityDesc'),
    benefits: [t('applyAgent.typeCityBenefit1'), t('applyAgent.typeCityBenefit2'), t('applyAgent.typeCityBenefit3'), t('applyAgent.typeCityBenefit4'), t('applyAgent.typeCityBenefit5')]},
];

export default function ApplyAgent() {
  const { t, i18n } = useTranslation();

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

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
    if (!agentType) { alert(t('applyAgent.alertSelectType')); return; }
    if (!form.full_name.trim()) { alert(t('applyAgent.alertName')); return; }
    if (!form.phone.trim()) { alert(t('applyAgent.alertPhone')); return; }
    if (agentType === 'city_franchisee' && !parentAgentId) { alert(t('applyAgent.alertParentAgent')); return; }
    setSubmitting(true);
    setResultMsg(null);
    try {
      const payload = {
        agent_type: agentType,
        ...form};
      if (agentType === 'city_franchisee') {
        payload.parent_agent_id = parentAgentId;
      }
      await agentAPI.apply(payload);
      setResultMsg({ type: 'success', text: t('applyAgent.successMsg') });
      setForm({ full_name: '', phone: '', region: 'cn', city: '', reason: '' });
      setAgentType('');
      setParentAgentId('');
      loadStatus();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || t('applyAgent.submitFailed') });
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mr-2" />{t('common.loading')}</div>;

  const kycApproved = user?.kyc_status === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      {user && !kycApproved && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-700 font-medium text-sm">{t('applyAgent.kycRequired')}</span>
          </div>
          <button onClick={() => router.push('/profile')} className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-700 whitespace-nowrap">
            {t('applyAgent.goVerify')} →
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
          <h1 className="text-3xl font-bold mb-3">{t('applyAgent.title')}</h1>
          <p className="text-blue-200 max-w-2xl mx-auto">{t('applyAgent.subtitle')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-3xl mx-auto">
            {[{ label: t('applyAgent.globalSites'), value: '100+' }, { label: t('applyAgent.activeBatteries'), value: '50,000+' }, { label: t('applyAgent.servedUsers'), value: '200万+' }, { label: t('applyAgent.growthRate'), value: '+320%' }].map((item, i) => (
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
            <h2 className="text-xl font-bold">{t('applyAgent.selectType')}</h2>
            {getAgentTypes(t).map(type => {
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
                    <AlertTriangle className="h-3 w-3" />{t('applyAgent.provinceAgentRestricted')}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{type.label}</h3>
                    <p className="text-xs text-gray-500">{type.area}{t('applyAgent.areaProtected')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{type.desc}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">{t('applyAgent.franchiseFee')}</span><div className="font-semibold text-xs">{formatCurrency(type.feeUsd, i18n.language)} </div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">{t('applyAgent.deposit')}</span><div className="font-semibold text-xs">{formatCurrency(type.depositUsd, i18n.language)} </div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">{t('applyAgent.monthlyTarget')}</span><div className="font-semibold text-xs">{formatCurrency(type.performanceTargetUsd, i18n.language)} </div></div>
                  <div className="bg-gray-50 rounded p-2"><span className="text-gray-400">{t('applyAgent.commission')}</span><div className="font-semibold text-green-600">{type.commission}</div></div>
                </div>
                <p className="text-xs text-gray-400">{t('applyAgent.totalInitial')}: <span className="font-bold text-gray-700">{formatCurrency(type.feeUsd + type.depositUsd, i18n.language)}</span></p>
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
                <h3 className="font-bold text-lg mb-3">{t('applyAgent.myApplications')}</h3>
                <div className="space-y-2">
                  {applications.map(a => (
                    <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{a.agent_type === 'province_agent' ? t('applyAgent.typeProvince') : t('applyAgent.typeCity')}</span>
                        <span className="text-sm text-gray-500 ml-2">{a.full_name} · {a.region}{a.city ? ` · ${a.city}` : ''}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === 'approved' ? 'bg-green-100 text-green-700' :
                        a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'approved' ? t('applyAgent.statusApproved') : a.status === 'rejected' ? t('applyAgent.statusRejected') : t('applyAgent.statusPending')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-lg mb-4">{t('applyAgent.fillForm')}</h3>

              {!kycApproved && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm font-medium">{t('applyAgent.kycLock')}</span>
                </div>
              )}

              {resultMsg && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${resultMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {resultMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('applyAgent.agentType')} *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {getAgentTypes(t).map(type => (
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('applyAgent.fullName')} *</label>
                    <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('applyAgent.namePlaceholder')} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('applyAgent.phone')} *</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('applyAgent.phonePlaceholder')} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('applyAgent.targetRegion')} *</label>
                    <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                      {getRegions(t).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {agentType === 'province_agent' ? t('applyAgent.province') + ' *' : t('applyAgent.city')}
                    </label>
                    {agentType === 'province_agent' ? (
                      (() => {
                        const approvedProvinces = approvedAgents
                          .filter(a => a.agent_type === 'province_agent')
                          .map(a => a.city || a.region);
                        const availableProvinces = getProvinces(t).filter(p => !approvedProvinces.includes(p));
                        return (
                          <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                            className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                            <option value="">{t('applyAgent.selectProvince')}</option>
                            {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        );
                      })()
                    ) : agentType === 'city_franchisee' && parentAgentId ? (
                      availableCities.length > 0 ? (
                        <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                          <option value="">{t('applyAgent.selectCity')}</option>
                          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                          className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('applyAgent.targetCity')} />
                      )
                    ) : (
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!kycApproved}
                        className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={t('applyAgent.targetCity')} />
                    )}
                  </div>
                </div>
                {agentType === 'city_franchisee' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('applyAgent.parentAgent')} <span className="text-red-500">*</span>
                    </label>
                    <select value={parentAgentId} onChange={e => handleParentChange(e.target.value)} disabled={!kycApproved}
                      className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" required>
                      <option value="">{t('applyAgent.selectParentAgent')}</option>
                      {approvedAgents.filter(a => a.agent_type === 'province_agent').map(a => (
                        <option key={a.id} value={a.id}>{a.full_name} ({a.city || a.region || '—'})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('applyAgent.reason')}</label>
                  <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} disabled={!kycApproved}
                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" rows={4}
                    placeholder={t('applyAgent.reasonPlaceholder')} />
                </div>
                <button type="submit" disabled={submitting || !kycApproved}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="h-4 w-4" />{submitting ? t('applyAgent.submitting') : t('applyAgent.submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
