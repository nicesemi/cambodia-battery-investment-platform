'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { User, Wallet, TrendingUp, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setProfile(res.data);
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
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
          <button className="btn-secondary">充值</button>
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
    </div>
  );
}
