'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dividendAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { TrendingUp, Calendar, DollarSign, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dividends() {
  const { user } = useAuth();
  const router = useRouter();
  const [dividends, setDividends] = useState([]);
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'franchisee') {
      router.push('/franchisee');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [divRes, forecastRes] = await Promise.all([
        dividendAPI.getMyDividends(),
        dividendAPI.getMarketForecast(),
      ]);
      setDividends(divRes.data.dividends || []);
      setSummary(divRes.data.summary);
      setForecast(forecastRes.data.forecast);
    } catch (error) {
      console.error('Load dividends error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 准备图表数据
  const chartData = dividends.reduce((acc, d) => {
    const existing = acc.find(item => item.period === d.period);
    if (existing) {
      existing.amount += d.dividend_amount;
    } else {
      acc.push({ period: d.period, amount: d.dividend_amount });
    }
    return acc;
  }, []).sort((a, b) => a.period.localeCompare(b.period));

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">分红中心</h1>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">累计分红</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                ${Number(summary?.total_dividends || 0).toFixed(2)}
              </div>
            </div>
            <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">分红次数</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {summary?.dividend_count || 0}
              </div>
            </div>
            <Calendar className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">预期月分红</div>
              <div className="text-2xl font-bold text-primary-600 mt-1">
                ~${forecast?.batteryEconomics?.expectedMonthlyDividend || '12.90'}
              </div>
            </div>
            <TrendingUp className="h-10 w-10 text-primary-500 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">预期年化</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {(forecast?.batteryEconomics?.expectedROI * 100 || 15.5)}%
              </div>
            </div>
            <PieChart className="h-10 w-10 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 分红趋势图 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">分红趋势</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value || 0).toFixed(2)}`, '分红金额']} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              暂无分红记录
            </div>
          )}
        </div>

        {/* 收益测算 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">收益测算</h2>
          {forecast && (
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="font-medium mb-2">投资收益说明</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• 平台每月净利润 <span className="font-semibold text-primary-600">70%</span> 自动分红给投资者</div>
                  <div>• 平台留存 <span className="font-semibold">30%</span> 用于运营和维护</div>
                  <div>• 分红每月1日自动计算，T+1到账</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">回本周期</div>
                  <div className="font-semibold text-gray-900">
                    {forecast.batteryEconomics.paybackPeriod}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">单站月利润</div>
                  <div className="font-semibold text-green-600">
                    ${forecast.stationEconomics.monthlyProfit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分红记录 */}
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold mb-4">分红记录</h2>
        {dividends.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暂无分红记录，投资后每月将获得分红
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">周期</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">资产</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">持有份数</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分红金额</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{d.period}</td>
                    <td className="py-3 px-4">{d.asset_name}</td>
                    <td className="py-3 px-4">{d.units_held}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">
                      ${Number(d.dividend_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge badge-success">已到账</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
