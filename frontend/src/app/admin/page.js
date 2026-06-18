'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI, dividendAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Users, TrendingUp, DollarSign, BarChart3, Settings, UserCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dividendPeriod, setDividendPeriod] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin()) {
      router.push('/');
      return;
    }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await adminAPI.getDashboard();
        setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await adminAPI.getUsers(1, 50);
        setUsers(res.data.users);
      } else if (activeTab === 'trades') {
        const res = await adminAPI.getTrades(1, 50);
        setTrades(res.data.trades);
      } else if (activeTab === 'configs') {
        const res = await adminAPI.getConfigs();
        setConfigs(res.data.configs);
      }
    } catch (error) {
      console.error('Load admin data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateDividend = async () => {
    if (!dividendPeriod) {
      alert('请输入分红周期 (YYYY-MM)');
      return;
    }
    try {
      await dividendAPI.calculateDividend({ period: dividendPeriod });
      alert('分红计算完成！');
      setDividendPeriod('');
    } catch (error) {
      alert('计算失败: ' + (error.response?.data?.error || error.message));
    }
  };

  const tabs = [
    { id: 'dashboard', label: '数据看板', icon: BarChart3 },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'trades', label: '交易记录', icon: TrendingUp },
    { id: 'configs', label: '系统配置', icon: Settings },
  ];

  if (loading && !stats) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">管理面板</h1>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && stats && (
        <div>
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">总用户数</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.users?.total_users || 0}
                  </div>
                </div>
                <Users className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
              <div className="text-sm text-green-600 mt-2">
                +{stats.users?.new_users_30d || 0} 近30天
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">总交易额</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ${stats.trades?.total_trade_volume?.toLocaleString() || '0'}
                  </div>
                </div>
                <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {stats.trades?.trades_24h || 0} 笔24小时内
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">总分红</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    ${stats.dividends?.total_dividend_amount?.toLocaleString() || '0'}
                  </div>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">已售资产</div>
                  <div className="text-2xl font-bold text-primary-600 mt-1">
                    {stats.assets?.sold_units || 0}
                  </div>
                </div>
                <UserCheck className="h-10 w-10 text-primary-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="font-semibold mb-4">用户增长趋势</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="new_users" stroke="#2563eb" name="新增用户" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">利润历史</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.profitHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="investor_share" fill="#22c55e" name="投资者分红" />
                  <Bar dataKey="platform_share" fill="#2563eb" name="平台留存" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Manual Dividend Calculation */}
          <div className="card mb-8">
            <h3 className="font-semibold mb-4">手动计算分红</h3>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="分红周期 (如: 2024-01)"
                value={dividendPeriod}
                onChange={(e) => setDividendPeriod(e.target.value)}
                className="input-field max-w-xs"
              />
              <button onClick={handleCalculateDividend} className="btn-primary">
                计算并发放分红
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-4">最近交易</h3>
              <div className="space-y-3">
                {stats.recentTrades?.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <span className="font-medium">{trade.asset_name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {trade.buyer_name} → {trade.seller_name}
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">${Number(trade.total_amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">最近注册</h3>
              <div className="space-y-3">
                {stats.recentUsers?.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <span className="font-medium">{u.username}</span>
                      <span className="text-sm text-gray-500 ml-2">{u.email}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ${Number(u.total_investment || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Management */}
      {activeTab === 'users' && (
        <div className="card">
          <h3 className="font-semibold mb-4">用户列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">用户</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">邮箱</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">角色</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">KYC</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">投资</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{u.username}</td>
                    <td className="py-3 px-4 text-sm">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="badge badge-info">{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${u.kyc_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">${Number(u.total_investment || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? '正常' : '禁用'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trades */}
      {activeTab === 'trades' && (
        <div className="card">
          <h3 className="font-semibold mb-4">交易记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">资产</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">买方</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">卖方</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">价格</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">数量</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">总额</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{t.asset_name}</td>
                    <td className="py-3 px-4 text-sm">{t.buyer_name}</td>
                    <td className="py-3 px-4 text-sm">{t.seller_name}</td>
                    <td className="py-3 px-4">${t.price}</td>
                    <td className="py-3 px-4">{t.units}</td>
                    <td className="py-3 px-4 font-semibold">${Number(t.total_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(t.trade_time).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configs */}
      {activeTab === 'configs' && (
        <div className="card">
          <h3 className="font-semibold mb-4">系统配置</h3>
          <div className="space-y-4">
            {configs.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium">{c.config_key}</div>
                  <div className="text-sm text-gray-500">{c.description}</div>
                </div>
                <div className="font-semibold text-primary-600">{c.config_value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
