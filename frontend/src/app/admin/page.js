'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI, batteryTypesAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Users, TrendingUp, DollarSign, BarChart3, Settings, Battery, Store, ClipboardList, Check, X, Eye, Shield, MapPin, Plus, Edit, Trash2, Loader2, Zap, BadgeCheck, Percent, Cpu } from 'lucide-react';

export default function Admin() {
  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stores, setStores] = useState([]);
  const [applications, setApplications] = useState([]);
  const [agentApplications, setAgentApplications] = useState([]);
  const [managedAgents, setManagedAgents] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [batteryTypes, setBatteryTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 电池资产管理表单
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetForm, setAssetForm] = useState({
    asset_code: '', name: '', description: '', battery_type: 'swap',
    total_units: '', unit_price_rmb: '', expected_roi: '', monthly_rent: '', location: '', station_id: '',
  });
  const [assetSubmitting, setAssetSubmitting] = useState(false);

  // 门店编辑表单
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '', city: '', address: '', phone: '', owner_id: '', total_batteries: '', revenue_share: ''
  });
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [deleteStoreConfirm, setDeleteStoreConfirm] = useState(null);
  // 代理编辑表单
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [agentForm, setAgentForm] = useState({ commission: '', revenue_share: '', region: '', city: '' });
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  // 已售电池
  const [soldStats, setSoldStats] = useState(null);
  const [soldBatteries, setSoldBatteries] = useState([]);
  const [soldOrders, setSoldOrders] = useState([]);
  const [soldPage, setSoldPage] = useState(1);
  const [soldTotal, setSoldTotal] = useState(0);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadData();
    loadBatteryTypes();
  }, [user, activeTab]);

  const loadBatteryTypes = async () => {
    try {
      const res = await batteryTypesAPI.getList();
      setBatteryTypes((res.battery_types || res.types || []).filter(t => t.is_active !== false));
    } catch (e) { /* silent */ }
  };

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'dashboard': setStats(await adminAPI.getDashboard()); break;
        case 'users': { const r = await adminAPI.getUsers(1, 100); setUsers(r.users || []); } break;
        case 'assets': { const r = await adminAPI.getAssets(); setAssets(r.assets || []); } break;
        case 'stores': { const r = await adminAPI.getStores(); setStores(r.stores || []); } break;
        case 'applications': { const r = await adminAPI.getApplications(); setApplications(r.applications || []); } break;
        case 'agent-applications': { const r = await adminAPI.getAgentApplications(); setAgentApplications(r.applications || []); } break;
        case 'managed-agents': { const r = await adminAPI.getManagedAgents(); setManagedAgents(r.agents || []); } break;
        case 'sold-batteries': { const r = await adminAPI.getSoldBatteries(); setSoldStats(r.stats); setSoldBatteries(r.batteries || []); setSoldOrders(r.recent_orders || []); setSoldTotal(r.total || 0); } break;
        case 'configs': { const r = await adminAPI.getConfigs(); setConfigs(r.configs || []); } break;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReviewApplication = async (id, status) => {
    try {
      await adminAPI.reviewApplication(id, { status, reviewed_by: user?.id });
      alert(`已${status === 'approved' ? '批准' : '拒绝'}申请`);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleReviewAgentApplication = async (id, status) => {
    try {
      await adminAPI.reviewAgentApplication(id, { status, reviewed_by: user?.id });
      alert(`已${status === 'approved' ? '批准' : '拒绝'}代理申请`);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  const handleAssetAction = async (assetId, action) => {
    try {
      if (action === 'delete') {
        if (!confirm('确认删除此资产？此操作将软删除（标记为已下架）。')) return;
        await adminAPI.deleteAsset(assetId);
      } else {
        await adminAPI.updateAssetStatus(assetId, action);
      }
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  // 打开新增表单
  const openAddAssetForm = () => {
    setIsEditing(false);
    setEditingAssetId(null);
    setAssetForm({ asset_code: '', name: '', description: '', battery_type: 'swap', total_units: '', unit_price_rmb: '', expected_roi: '', monthly_rent: '', location: '', station_id: '' });
    setShowAssetForm(true);
  };

  // 打开编辑表单
  const openEditAssetForm = (asset) => {
    setIsEditing(true);
    setEditingAssetId(asset.id);
    setAssetForm({
      asset_code: asset.asset_code || '',
      name: asset.name || '',
      description: asset.description || '',
      battery_type: asset.battery_type || 'swap',
      total_units: String(asset.total_units || ''),
      unit_price_rmb: asset.unit_price_rmb != null ? String(asset.unit_price_rmb) : '',
      expected_roi: String(asset.expected_roi || ''),
      monthly_rent: asset.monthly_rent != null ? String(asset.monthly_rent) : '',
      location: asset.location || '',
      station_id: asset.station_id || '',
    });
    setShowAssetForm(true);
  };

  // 提交新增/编辑
  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    const { asset_code, name, total_units, unit_price_rmb } = assetForm;
    if (!asset_code.trim() || !name.trim() || !total_units || !unit_price_rmb) {
      alert('请填写必填项：代码、名称、总量、单价(RMB)');
      return;
    }
    setAssetSubmitting(true);
    try {
      const payload = {
        asset_code: asset_code.trim(),
        name: name.trim(),
        description: assetForm.description.trim(),
        battery_type: assetForm.battery_type,
        total_units: parseInt(total_units),
        unit_price_rmb: parseFloat(unit_price_rmb),
        monthly_rent: assetForm.monthly_rent ? parseInt(assetForm.monthly_rent) : undefined,
        location: assetForm.location.trim(),
        station_id: assetForm.station_id.trim(),
      };
      if (isEditing) {
        await adminAPI.updateAsset(editingAssetId, payload);
        alert('资产已更新');
      } else {
        await adminAPI.createAsset(payload);
        alert('资产已创建');
      }
      setShowAssetForm(false);
      loadData();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setAssetSubmitting(false); }
  };

  const loadSoldPage = async (p) => {
    try {
      const r = await adminAPI.getSoldBatteries(p);
      setSoldBatteries(r.batteries || []);
      setSoldPage(p);
    } catch (e) { console.error(e); }
  };

  // --- 门店编辑/删除/状态切换 ---
  const openEditStore = (store) => {
    setIsEditingStore(true);
    setEditingStoreId(store.id);
    setStoreForm({
      name: store.name || '',
      city: store.city || '',
      address: store.address || '',
      phone: store.phone || '',
      owner_id: store.owner_id || '',
      total_batteries: store.total_batteries ?? '',
      revenue_share: store.revenue_share ?? ''
    });
    setShowStoreForm(true);
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setStoreSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditingStore
        ? `${API_BASE}/admin/stores/${editingStoreId}`
        : `${API_BASE}/admin/stores`;
      const method = isEditingStore ? 'PUT' : 'POST';
      
      const body = {
        name: storeForm.name,
        city: storeForm.city || null,
        address: storeForm.address || null,
        phone: storeForm.phone || null,
      };
      if (isEditingStore) {
        body.owner_id = storeForm.owner_id || null;
        body.total_batteries = storeForm.total_batteries !== '' ? Number(storeForm.total_batteries) : undefined;
      }
      body.revenue_share = storeForm.revenue_share !== '' ? Number(storeForm.revenue_share) : undefined;

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed');
      }
      setMessage({ type: 'success', text: isEditingStore ? '门店已更新' : '门店已创建' });
      setShowStoreForm(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '操作失败' });
    } finally {
      setStoreSubmitting(false);
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (!window.confirm(`确定将门店「${storeName}」设为停业状态？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/stores/${storeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      setMessage({ type: 'success', text: `门店「${storeName}」已停业` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: '操作失败' });
    }
  };

  const handleStoreStatus = async (storeId, newStatus, storeName) => {
    const statusLabel = { active: '营业中', suspended: '暂停营业', closed: '已停业' };
    if (newStatus === 'closed' && !window.confirm(`确定将门店「${storeName}」设为已停业？此操作不可逆。`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed');
      setMessage({ type: 'success', text: `门店状态已更新为「${statusLabel[newStatus]}」` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: '状态更新失败' });
    }
  };

  // === 代理编辑 ===
  const openEditAgentForm = (agent) => {
    setEditingAgentId(agent.id);
    setAgentForm({
      commission: agent.commission != null ? String(agent.commission) : '',
      revenue_share: agent.revenue_share != null ? String(agent.revenue_share) : '',
      region: agent.region || '',
      city: agent.city || '',
    });
    setShowAgentForm(true);
  };

  const handleAgentSave = async (e) => {
    e.preventDefault();
    setAgentSubmitting(true);
    try {
      const payload = {};
      if (agentForm.commission !== '') payload.commission = parseFloat(agentForm.commission);
      if (agentForm.revenue_share !== '') payload.revenue_share = parseFloat(agentForm.revenue_share);
      if (agentForm.region) payload.region = agentForm.region;
      if (agentForm.city) payload.city = agentForm.city;
      await adminAPI.updateManagedAgent(editingAgentId, payload);
      setShowAgentForm(false);
      loadData();
    } catch (e) { alert(e.message || '保存失败'); }
    finally { setAgentSubmitting(false); }
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`确定撤销代理「${agentName}」？此操作不可逆。`)) return;
    try {
      await adminAPI.deleteManagedAgent(agentId);
      loadData();
    } catch (e) { alert(e.message || '操作失败'); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;

  const tabs = [
    { key: 'dashboard', label: '数据看板', icon: BarChart3 },
    { key: 'assets', label: '电池管理', icon: Battery },
    { key: 'battery-types', label: '电池类型', icon: Zap, link: '/admin/battery-types' },
    { key: 'stores', label: '门店管理', icon: Store },
    { key: 'applications', label: '加盟审核', icon: ClipboardList },
    { key: 'agent-applications', label: '省级代理审批', icon: Users },
    { key: 'managed-agents', label: '我的代理', icon: BadgeCheck },
    { key: 'sold-batteries', label: '已售电池', icon: Cpu },
    { key: 'users', label: '用户管理', icon: Users },
    { key: 'configs', label: '系统配置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-gray-400 text-sm mt-1">电池换电平台 · {user?.role === 'admin' ? '超级管理员' : '运营方'}</p>
        </div>
      </div>

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { if (t.link) { router.push(t.link); return; } setActiveTab(t.key); setLoading(true); }}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-sm font-medium transition ${
                  activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-5"><Users className="h-5 w-5 text-blue-500 mb-2" /><div className="text-3xl font-bold">{stats.users?.total_users || 0}</div><div className="text-sm text-gray-400">总用户</div></div>
              <div className="bg-white rounded-xl border p-5"><DollarSign className="h-5 w-5 text-green-500 mb-2" /><div className="text-3xl font-bold">${(stats.users?.total_investment || 0).toFixed(0)}</div><div className="text-sm text-gray-400">总投资额</div></div>
              <div className="bg-white rounded-xl border p-5"><TrendingUp className="h-5 w-5 text-purple-500 mb-2" /><div className="text-3xl font-bold">{stats.trades?.total_trades || 0}</div><div className="text-sm text-gray-400">交易数</div></div>
              <div className="bg-white rounded-xl border p-5"><Battery className="h-5 w-5 text-orange-500 mb-2" /><div className="text-3xl font-bold">{stats.assets?.total_units || 0}</div><div className="text-sm text-gray-400">电池总量</div></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">资产概览</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500">电池资产总数</span><span className="font-semibold">{stats.assets?.total_assets || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">总份数</span><span className="font-semibold">{stats.assets?.total_units || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">可用份数</span><span className="font-semibold text-green-600">{stats.assets?.available_units || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">已售份数</span><span className="font-semibold">{stats.assets?.sold_units || 0}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">分红概览</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500">分红期数</span><span className="font-semibold">{stats.dividends?.total_dividends || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">累计分红金额</span><span className="font-semibold text-green-600">${(stats.dividends?.total_dividend_amount || 0).toFixed(0)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">已分配分红</span><span className="font-semibold">${(stats.users?.total_dividends_distributed || 0).toFixed(0)}</span></div>
                </div>
              </div>
            </div>

            {stats.recentUsers && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold text-gray-900 mb-4">最近注册用户</h3>
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">用户名</th><th className="text-left p-3">邮箱</th><th className="text-left p-3">角色</th><th className="text-right p-3">投资额</th><th className="text-right p-3">注册时间</th></tr></thead>
                  <tbody>{(stats.recentUsers || []).map(u => (
                    <tr key={u.id} className="border-t"><td className="p-3 font-medium">{u.username}</td><td className="p-3 text-gray-500">{u.email}</td><td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'operator' ? 'bg-blue-100 text-blue-700' : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-600'}`}>{u.role === 'admin' ? <><Shield className="h-3 w-3" />管理员</> : u.role === 'operator' ? <><Settings className="h-3 w-3" />运营方</> : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? <><Shield className="h-3 w-3" />省级总代理</> : <><MapPin className="h-3 w-3" />市级加盟商</>) : <><Users className="h-3 w-3" />投资者</>}</span></td><td className="p-3 text-right">${(u.total_investment || 0).toFixed(0)}</td><td className="p-3 text-right text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td></tr>
                  ))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* Assets */}
        {activeTab === 'assets' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">电池资产管理</h2>
              <button onClick={openAddAssetForm}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Plus className="h-4 w-4" />新增电池
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-4">代码</th><th className="text-left p-4">名称</th><th className="text-left p-4">类型</th>
                  <th className="text-right p-4">总量</th><th className="text-right p-4">可用</th><th className="text-right p-4">库存</th><th className="text-right p-4">已售</th><th className="text-right p-4">RMB</th><th className="text-right p-4">USD</th>
                  <th className="text-right p-4">年化</th><th className="text-right p-4">月租金</th><th className="text-left p-4">站点分布</th><th className="text-center p-4">状态</th><th className="text-center p-4">操作</th>
                </tr></thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs">{a.asset_code}</td>
                      <td className="p-4 font-medium">{a.name}</td>
                      <td className="p-4 text-gray-500">{a.battery_type}</td>
                      <td className="p-4 text-right">{a.total_units}</td>
                      <td className="p-4 text-right text-green-600 font-semibold">{a.available_units}</td>
                      <td className="p-4 text-right font-semibold">{a.stock ?? a.available_units}</td>
                      <td className="p-4 text-right text-gray-500">{a.sold_units ?? (a.total_units - a.available_units)}</td>
                      <td className="p-4 text-right text-gray-700">¥{a.unit_price_rmb != null ? a.unit_price_rmb : '—'}</td>
                      <td className="p-4 text-right">${a.unit_price}</td>
                      <td className="p-4 text-right">{a.expected_roi}%</td>
                      <td className="p-4 text-right text-gray-600">{a.monthly_rent != null ? `¥${a.monthly_rent.toLocaleString()} /月` : '—'}</td>
                      <td className="p-4 text-xs text-gray-500">
                        {a.site_distribution && a.site_distribution.length > 0 ? (
                          <div className="space-y-0.5">
                            {a.site_distribution.map((sd, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="text-gray-600">{sd.site_name || sd.site_id || '默认'}:</span>
                                <span className="text-green-600">{sd.available_count}</span>
                                <span className="text-gray-400">+</span>
                                <span className="text-blue-600">{sd.sold_count}</span>
                                <span className="text-gray-400">/ {sd.unit_count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          a.location || '—'
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'active' ? 'bg-green-100 text-green-700' : a.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'active' ? '运营中' : a.status === 'paused' ? '已暂停' : '已下架'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditAssetForm(a)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="编辑">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <select onChange={e => { if (e.target.value) handleAssetAction(a.id, e.target.value); e.target.value = ''; }}
                            className="text-xs border rounded px-1.5 py-1 bg-white w-16">
                            <option value="">状态</option>
                            <option value="active">上架</option>
                            <option value="paused">暂停</option>
                            <option value="closed">下架</option>
                          </select>
                          <button onClick={() => handleAssetAction(a.id, 'delete')}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="删除">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Battery className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>暂无电池资产</p>
                  <button onClick={openAddAssetForm} className="text-blue-600 hover:underline text-sm mt-1">点击新增</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stores */}
        {activeTab === 'stores' && (
          <div>
            <h2 className="text-xl font-bold mb-6">加盟门店管理</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(s => (
                <div key={s.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : s.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>{s.status === 'active' ? '营业中' : s.status === 'pending' ? '待审核' : s.status === 'suspended' ? '暂停营业' : '已停业'}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div>编码: <span className="font-mono text-blue-600">{s.store_code || '—'}</span></div>
                    <div>城市: {s.city}{s.address ? ` · ${s.address}` : ''}</div>
                    <div>创建者: {s.owner?.username || '-'}</div>
                    <div>电池数量: {s.total_batteries || 0}</div>
                    <div>分成比例: {((s.revenue_share ?? 0.3) * 100).toFixed(0)}%</div>
                    <div>创建时间: {s.created_at ? new Date(s.created_at).toLocaleDateString('zh-CN') : '-'}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                    <button onClick={() => openEditStore(s)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                      编辑
                    </button>
                    {s.status !== 'closed' && (
                      <button onClick={() => handleStoreStatus(s.id, s.status === 'active' ? 'suspended' : 'active', s.name)}
                        className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
                        {s.status === 'active' ? '暂停营业' : '恢复营业'}
                      </button>
                    )}
                    {s.status !== 'closed' && (
                      <button onClick={() => handleDeleteStore(s.id, s.name)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">
                        停业
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {stores.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">暂无门店数据</div>}
            </div>
          </div>
        )}

        {/* Applications */}
        {activeTab === 'applications' && (
          <div>
            <h2 className="text-xl font-bold mb-6">加盟申请审核</h2>
            <div className="space-y-4">
              {applications.map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-lg">{a.store_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-4">
                        <span>城市: {a.city}</span><span>电话: {a.phone}</span>
                        <span>申请人: {a.user?.username || '-'}</span>
                      </div>
                      {a.franchisee_code && <div className="text-sm mt-1"><span className="text-gray-400">编码: </span><span className="font-mono text-blue-600">{a.franchisee_code}</span></div>}
                      {a.address && <div className="text-sm text-gray-500">地址: {a.address}</div>}
                      {a.reason && <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">申请理由: {a.reason}</div>}
                      <div className="text-xs text-gray-400">提交时间: {a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '-'}</div>
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => handleReviewApplication(a.id, 'approved')} className="btn-primary text-sm py-1 px-4 flex items-center space-x-1">
                          <Check className="h-3 w-3" /><span>通过</span></button>
                        <button onClick={() => handleReviewApplication(a.id, 'rejected')} className="bg-red-50 text-red-600 px-4 py-1 rounded-lg text-sm hover:bg-red-100 flex items-center space-x-1">
                          <X className="h-3 w-3" /><span>拒绝</span></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {applications.length === 0 && <div className="text-center py-12 text-gray-400">暂无申请</div>}
            </div>
          </div>
        )}

        {/* Agent Applications */}
        {activeTab === 'agent-applications' && (
          <div>
            <h2 className="text-xl font-bold mb-6">省级代理审批</h2>
            <div className="space-y-4">
              {agentApplications.map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-lg">{a.full_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : '已拒绝'}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-4">
                        <span>电话: {a.phone}</span>
                        {a.region && <span>区域: {a.region}</span>}
                        {a.city && <span>城市: {a.city}</span>}
                        <span>申请人: {a.applicant?.username || '-'}</span>
                      </div>
                      {a.agent_code && <div className="text-sm mt-1"><span className="text-gray-400">编码: </span><span className="font-mono text-blue-600">{a.agent_code}</span></div>}
                      {a.reason && <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">申请理由: {a.reason}</div>}
                      <div className="text-xs text-gray-400">提交时间: {a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '-'}</div>
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => handleReviewAgentApplication(a.id, 'approved')} className="btn-primary text-sm py-1 px-4 flex items-center space-x-1">
                          <Check className="h-3 w-3" /><span>通过</span></button>
                        <button onClick={() => handleReviewAgentApplication(a.id, 'rejected')} className="bg-red-50 text-red-600 px-4 py-1 rounded-lg text-sm hover:bg-red-100 flex items-center space-x-1">
                          <X className="h-3 w-3" /><span>拒绝</span></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {agentApplications.length === 0 && <div className="text-center py-12 text-gray-400">暂无代理申请</div>}
            </div>
          </div>
        )}

        {/* Managed Agents — 我的代理 */}
        {activeTab === 'managed-agents' && (
          <div>
            <h2 className="text-xl font-bold mb-6">我的代理</h2>
            <div className="space-y-4">
              {managedAgents.map(a => (
                <div key={a.id} className="bg-white rounded-xl border p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-lg">{a.full_name || a.applicant?.full_name || a.applicant?.username || '—'}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>{a.agent_type === 'province_agent' ? '省级总代理' : a.agent_type === 'city_franchisee' ? '市级加盟商' : a.agent_type || '—'}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">已审批</span>
                      </div>
                      <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {a.applicant?.phone && <span>电话: {a.applicant.phone}</span>}
                        {a.applicant?.email && <span>邮箱: {a.applicant.email}</span>}
                        {a.region && <span>区域: {a.region}</span>}
                        {a.city && <span>城市: {a.city}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm">
                        {a.commission != null && <span className="text-blue-600 font-medium">佣金: {a.commission}%</span>}
                        {a.revenue_share != null && <span className="text-purple-600 font-medium">分成: {a.revenue_share}%</span>}
                        {a.store_count !== undefined && <span className="text-gray-500">下属门店: {a.store_count} 家</span>}
                      </div>
                      {a.agent_code && <div className="text-xs mt-1"><span className="text-gray-400">编码: </span><span className="font-mono text-blue-600">{a.agent_code}</span></div>}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button onClick={() => openEditAgentForm(a)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition">
                        <Edit className="h-3 w-3" />编辑</button>
                      <button onClick={() => handleDeleteAgent(a.id, a.full_name || a.applicant?.username || '未知')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition">
                        <Trash2 className="h-3 w-3" />撤销</button>
                    </div>
                  </div>
                </div>
              ))}
              {managedAgents.length === 0 && <div className="text-center py-12 text-gray-400">暂无已审批代理</div>}
            </div>
          </div>
        )}

        {/* Sold Batteries — 已售电池 */}
        {activeTab === 'sold-batteries' && (
          <div>
            <h2 className="text-xl font-bold mb-6">已售电池监控</h2>
            {/* 实时统计卡片 */}
            {soldStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{soldStats.total_sold}</div>
                  <div className="text-xs text-gray-500 mt-1">累计售出</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{soldStats.today_sold}</div>
                  <div className="text-xs text-gray-500 mt-1">今日售出</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{soldStats.active_investors}</div>
                  <div className="text-xs text-gray-500 mt-1">活跃投资者</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">${(soldStats.today_revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">今日收入</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">${(soldStats.total_revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">累计收入</div>
                </div>
              </div>
            )}

            {/* 最近购买订单 */}
            <div className="mb-6">
              <h3 className="text-base font-bold mb-3">最近购买记录</h3>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-left p-3">投资者</th><th className="text-left p-3">资产</th>
                    <th className="text-center p-3">数量</th><th className="text-right p-3">单价</th>
                    <th className="text-right p-3">总价</th><th className="text-center p-3">来源</th>
                    <th className="text-right p-3">时间</th>
                  </tr></thead>
                  <tbody>
                    {soldOrders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{o.investor_name}</td>
                        <td className="p-3 text-gray-600">{o.asset_name}</td>
                        <td className="p-3 text-center">{o.units}</td>
                        <td className="p-3 text-right">{o.unit_price ? '$' + o.unit_price : '-'}</td>
                        <td className="p-3 text-right font-medium">${(o.total_amount || 0).toLocaleString()}</td>
                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.order_source === 'staff_registration' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{o.order_source === 'staff_registration' ? '线下' : '线上'}</span></td>
                        <td className="p-3 text-right text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                      </tr>
                    ))}
                    {soldOrders.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">暂无购买记录</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 已售电池详细清单 */}
            <h3 className="text-base font-bold mb-3">电池清单（共 {soldTotal} 块）</h3>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-3">单元编号</th><th className="text-left p-3">资产名称</th>
                  <th className="text-left p-3">投资者</th><th className="text-center p-3">品牌型号</th>
                  <th className="text-center p-3">电池电量</th><th className="text-center p-3">健康状态</th>
                  <th className="text-right p-3">售价</th><th className="text-right p-3">出售时间</th>
                </tr></thead>
                <tbody>
                  {soldBatteries.map(b => (
                    <tr key={b.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{b.unit_code}</td>
                      <td className="p-3 font-medium">{b.asset_name}</td>
                      <td className="p-3">{b.investor_name}</td>
                      <td className="p-3 text-center text-gray-500">{b.battery_assets?.battery_type || '-'}</td>
                      <td className="p-3 text-center">{b.sensor_battery_level != null ? `${b.sensor_battery_level}%` : '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.sensor_health_status === 'normal' ? 'bg-green-100 text-green-700' : b.sensor_health_status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>{b.sensor_health_status === 'normal' ? '正常' : b.sensor_health_status === 'warning' ? '警告' : b.sensor_health_status || '-'}</span>
                      </td>
                      <td className="p-3 text-right">${b.battery_assets?.unit_price_rmb || '-'}</td>
                      <td className="p-3 text-right text-gray-400">{b.created_at ? new Date(b.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                    </tr>
                  ))}
                  {soldBatteries.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-gray-400">暂未售出电池</td></tr>}
                </tbody>
              </table>
            </div>
            {soldTotal > 20 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button disabled={soldPage <= 1} onClick={() => loadSoldPage(soldPage - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">上一页</button>
                <span className="text-sm text-gray-500">第 {soldPage} 页 / 共 {Math.ceil(soldTotal / 20)} 页</span>
                <button disabled={soldPage >= Math.ceil(soldTotal / 20)} onClick={() => loadSoldPage(soldPage + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">下一页</button>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-bold mb-6">用户管理</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-4">用户名</th><th className="text-left p-4">邮箱</th><th className="text-center p-4">角色</th>
                  <th className="text-center p-4">编码</th><th className="text-center p-4">实名</th><th className="text-center p-4">状态</th>
                  <th className="text-right p-4">投资额</th><th className="text-right p-4">注册时间</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{u.username}</td>
                      <td className="p-4 text-gray-500">{u.email}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'operator' ? 'bg-blue-100 text-blue-700' : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-600'
                        }`}>{u.role === 'admin' ? <><Shield className="h-3 w-3" />管理员</> : u.role === 'operator' ? <><Settings className="h-3 w-3" />运营方</> : u.role === 'franchisee' ? (u.agent_type === 'province_agent' ? <><Shield className="h-3 w-3" />省级总代理</> : <><MapPin className="h-3 w-3" />市级加盟商</>) : <><Users className="h-3 w-3" />投资者</>}</span>
                      </td>
                      <td className="p-4 text-center font-mono text-xs text-gray-600">{u.investor_code || '—'}</td>
                      <td className="p-4 text-center"><span className={`text-xs ${u.kyc_status === 'verified' ? 'text-green-600' : 'text-gray-400'}`}>{u.kyc_status === 'verified' ? '已认证' : u.kyc_status === 'pending' ? '待认证' : '未认证'}</span></td>
                      <td className="p-4 text-center"><span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>{u.is_active ? '正常' : '禁用'}</span></td>
                      <td className="p-4 text-right">${(u.total_investment || 0).toFixed(0)}</td>
                      <td className="p-4 text-right text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configs */}
        {activeTab === 'configs' && (
          <div>
            <h2 className="text-xl font-bold mb-6">系统配置</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-4">配置项</th><th className="text-left p-4">值</th><th className="text-left p-4">类型</th><th className="text-left p-4">描述</th></tr></thead>
                <tbody>
                  {configs.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs font-medium">{c.config_key}</td>
                      <td className="p-4">{c.config_value}</td>
                      <td className="p-4 text-gray-500">{c.config_type}</td>
                      <td className="p-4 text-gray-400">{c.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 电池资产新增/编辑 Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditing ? '编辑电池资产' : '新增电池资产'}</h2>
              <form onSubmit={handleAssetSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">资产代码 *</label>
                    <input type="text" value={assetForm.asset_code} onChange={e => setAssetForm({ ...assetForm, asset_code: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 BAT-CAMB-004" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">资产名称 *</label>
                    <input type="text" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 金边核心区电池包D" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电池类型</label>
                    <select value={assetForm.battery_type} onChange={e => {
                        const selectedType = batteryTypes.find(bt => bt.name === e.target.value);
                        setAssetForm({ ...assetForm, battery_type: e.target.value, monthly_rent: selectedType?.monthly_rent != null ? String(selectedType.monthly_rent) : '' });
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      {batteryTypes.map(bt => (
                        <option key={bt.id} value={bt.name}>{bt.name}</option>
                      ))}
                      {assetForm.battery_type && !batteryTypes.some(bt => bt.name === assetForm.battery_type) && (
                        <option value={assetForm.battery_type}>{assetForm.battery_type}</option>
                      )}
                      {batteryTypes.length === 0 && (
                        <>
                          <option value="swap">换电电池</option>
                          <option value="vehicle">整车电池</option>
                          <option value="ess">储能电池</option>
                          <option value="container">集装箱储能</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">总量（台/组）*</label>
                    <input type="number" min="1" value={assetForm.total_units} onChange={e => setAssetForm({ ...assetForm, total_units: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 1000" />
                  </div>
                  {isEditing && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">当前库存</label>
                      <input type="text" value={`${assetForm.stock ?? assetForm.available_units ?? 0} 台可用`} readOnly
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 outline-none cursor-default" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">单价 (RMB) *</label>
                    <input type="number" min="0" step="0.01" value={assetForm.unit_price_rmb} onChange={e => setAssetForm({ ...assetForm, unit_price_rmb: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 7250.00" />
                    {assetForm.unit_price_rmb && parseFloat(assetForm.unit_price_rmb) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">≈ ${(parseFloat(assetForm.unit_price_rmb) / 7.25).toFixed(2)} USD（按当日汇率自动换算）</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">年化收益率 (%)</label>
                    <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                      {(() => {
                        const rent = parseFloat(assetForm.monthly_rent);
                        const rmb = parseFloat(assetForm.unit_price_rmb);
                        if (rent > 0 && rmb > 0) return ((rent * 0.7 * 12) / rmb * 100).toFixed(2) + '%';
                        return '—';
                      })()}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">= (月租×70%×12) ÷ 单价 × 100%，后端自动计算</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">月租金 (¥ /月)</label>
                    <input type="number" min="0" step="1" value={assetForm.monthly_rent} onChange={e => setAssetForm({ ...assetForm, monthly_rent: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 80，选电池类型自动填充" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">位置</label>
                    <input type="text" value={assetForm.location} onChange={e => setAssetForm({ ...assetForm, location: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 Phnom Penh" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">换电站 ID</label>
                    <input type="text" value={assetForm.station_id} onChange={e => setAssetForm({ ...assetForm, station_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 STN-001" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">描述</label>
                  <textarea value={assetForm.description} onChange={e => setAssetForm({ ...assetForm, description: e.target.value })}
                    rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder="电池资产描述（可选）" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowAssetForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                  <button type="submit" disabled={assetSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {assetSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditing ? '保存修改' : '创建资产'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 门店编辑 Modal */}
      {showStoreForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditingStore ? '编辑门店信息' : '新增门店'}</h2>
              <form onSubmit={handleStoreSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">门店名称 *</label>
                    <input type="text" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 金边1号换电站" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">城市</label>
                    <input type="text" value={storeForm.city} onChange={e => setStoreForm({ ...storeForm, city: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Phnom Penh" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电话</label>
                    <input type="text" value={storeForm.phone} onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="+855-xxx" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">地址</label>
                    <input type="text" value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="详细地址" />
                  </div>
                  {isEditingStore && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">电池数量</label>
                        <input type="number" min="0" value={storeForm.total_batteries} onChange={e => setStoreForm({ ...storeForm, total_batteries: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">分成比例</label>
                        <input type="number" min="0" max="1" step="0.01" value={storeForm.revenue_share} onChange={e => setStoreForm({ ...storeForm, revenue_share: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0.3" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">店主 ID</label>
                        <input type="text" value={storeForm.owner_id} onChange={e => setStoreForm({ ...storeForm, owner_id: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="UUID" />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowStoreForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                  <button type="submit" disabled={storeSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {storeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditingStore ? '保存修改' : '创建门店'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 代理编辑 Modal */}
      {showAgentForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">编辑代理</h3>
              <button onClick={() => setShowAgentForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAgentSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">佣金比例 (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={agentForm.commission}
                  onChange={e => setAgentForm({ ...agentForm, commission: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">收益分成 (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={agentForm.revenue_share}
                  onChange={e => setAgentForm({ ...agentForm, revenue_share: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 3" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">代理区域</label>
                <input type="text" value={agentForm.region}
                  onChange={e => setAgentForm({ ...agentForm, region: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 cn" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">代理城市</label>
                <input type="text" value={agentForm.city}
                  onChange={e => setAgentForm({ ...agentForm, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 北京" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowAgentForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={agentSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {agentSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
