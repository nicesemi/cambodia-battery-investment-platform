'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { User, Wallet, TrendingUp, Calendar, Store, Building2, ChevronRight, X } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      setProfile(res);
      // 投资者加载门店层级关系
      if (res.user?.role === 'investor') {
        try {
          const hierRes = await authAPI.getStoreHierarchy();
          setHierarchy(hierRes.bindings || []);
        } catch (e) { /* 层级加载失败不影响主流程 */ }
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amt = parseFloat(rechargeAmount);
    if (!amt || amt <= 0) {
      setRechargeMsg('请输入有效金额');
      return;
    }
    setRecharging(true);
    setRechargeMsg('');
    try {
      const res = await authAPI.rechargeWallet(amt);
      setRechargeMsg(`充值成功！当前余额: $${Number(res.balance).toFixed(2)}`);
      setRechargeAmount('');
      // Refresh profile
      loadProfile();
    } catch (e) {
      setRechargeMsg(e.message || '充值失败');
    } finally {
      setRecharging(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">个人中心</h1>

      {/* 基本信息 */}
      <div className="card mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.user?.full_name || profile?.user?.username}</h2>
            <p className="text-gray-500">{profile?.user?.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`badge ${profile?.user?.kyc_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                {profile?.user?.kyc_status === 'approved' ? '已认证' : '待认证'}
              </span>
              <span className="badge badge-info">{profile?.user?.role}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">用户名</div>
            <div className="font-medium">{profile?.user?.username}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">手机号</div>
            <div className="font-medium">{profile?.user?.phone || '未设置'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">国家/地区</div>
            <div className="font-medium">{profile?.user?.country || 'China'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">注册时间</div>
            <div className="font-medium">
              {profile?.user?.created_at ? new Date(profile.user.created_at).toLocaleDateString() : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* 所属门店层级关系（仅投资者可见） */}
      {hierarchy && hierarchy.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            所属门店层级
          </h3>
          {hierarchy.map((binding, idx) => (
            <div key={idx} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                {/* 门店 */}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded">
                  <Store className="h-3.5 w-3.5 text-indigo-500" />
                  {binding.store?.store_code || binding.store?.name}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                {/* 门店名称 */}
                <span className="font-medium text-gray-800">{binding.store?.name}</span>
                {binding.franchisee && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">加盟商:</span>
                    <span className="font-medium text-gray-800">
                      {binding.franchisee.full_name || binding.franchisee.username}
                    </span>
                    <span className="text-xs text-gray-400">{binding.store?.city}</span>
                  </>
                )}
                {binding.city_agent && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">市级代理:</span>
                    <span className="font-medium text-gray-800">
                      {binding.city_agent.full_name || binding.city_agent.username}
                    </span>
                    <span className="text-xs text-gray-400">{binding.city_agent.city}</span>
                  </>
                )}
                {binding.agent && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">省级代理:</span>
                    <span className="font-medium text-gray-800">
                      {binding.agent.full_name || binding.agent.username}
                    </span>
                    <span className="text-xs text-gray-400">{binding.agent.city || binding.agent.region}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 资产概览 */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            <span className="text-gray-500">钱包余额</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(profile?.wallet?.balance || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            冻结: ${Number(profile?.wallet?.frozen_balance || 0).toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-gray-500">总投资</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(profile?.user?.total_investment || 0).toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <span className="text-gray-500">累计分红</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            ${Number(profile?.user?.total_dividends || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="card">
        <h3 className="font-semibold mb-4">账户操作</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <button className="btn-secondary" onClick={() => { setShowRecharge(true); setRechargeMsg(''); }}>充值</button>
          <button className="btn-secondary">提现</button>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="btn-danger"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 充值弹窗 */}
      {showRecharge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">钱包充值</h3>
              <button onClick={() => setShowRecharge(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">充值金额 (USD)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="请输入充值金额"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {rechargeMsg && (
              <div className={`mb-4 p-2 rounded text-sm ${rechargeMsg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {rechargeMsg}
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleRecharge}
                disabled={recharging}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {recharging ? '处理中...' : '确认充值'}
              </button>
              <button
                onClick={() => setShowRecharge(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
