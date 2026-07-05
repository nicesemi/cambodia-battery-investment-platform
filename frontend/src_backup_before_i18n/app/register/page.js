'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'investor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        full_name: formData.fullName || formData.username,
        phone: formData.phone,
        role: formData.role,
      });
      router.push(formData.role === 'investor' ? '/invest' : '/');
    } catch (err) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-0.5">
            <img src="/logo.png" alt="MTX MOTORS" className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold text-gray-900 leading-tight">MTX MOTORS</span>
            <span className="text-xs text-gray-400 -mt-1">1kwh.store</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">创建账户</h2>
          <p className="mt-2 text-gray-600">加入我们，开始您的投资之旅</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">邮箱 *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="label">用户名 *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="用户名"
                required
              />
            </div>

            <div>
              <label className="label">密码 *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="至少6位字符"
                required
              />
            </div>

            <div>
              <label className="label">姓名</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="input-field"
                placeholder="真实姓名"
              />
            </div>

            <div>
              <label className="label">手机号</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="手机号码"
              />
            </div>

            <div>
              <label className="label">注册身份 *</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'investor' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                    formData.role === 'investor'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">投资者</div>
                  <div className="text-xs mt-1 opacity-70">购买电池资产，获得分红收益</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'franchisee' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                    formData.role === 'franchisee'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">加盟商</div>
                  <div className="text-xs mt-1 opacity-70">卖电池的门店和代理</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-6"
            >
              {loading ? '注册中...' : '立即注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            已有账号？{' '}
            <Link href="/login" className="text-primary-600 hover:underline font-medium">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
