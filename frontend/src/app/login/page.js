'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-0.5">
            <img src="/logo.png" alt="1kWh" className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold text-gray-900 leading-tight">1kWh</span>
            <span className="text-xs text-gray-400 -mt-1">1kwh.store</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">登录账户</h2>
          <p className="mt-2 text-gray-600">欢迎回来，请登录您的账户</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="label">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? '登录中...' : '立即登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            还没有账号？{' '}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              立即注册
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
