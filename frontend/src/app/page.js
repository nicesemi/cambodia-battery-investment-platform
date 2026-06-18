'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, DollarSign, Award, Shield, Zap, BarChart3, Globe } from 'lucide-react';
import { dividendAPI } from '../services/api';

export default function Home() {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    try {
      const response = await dividendAPI.getMarketForecast();
      setForecast(response.data.forecast);
    } catch (error) {
      console.error('Load forecast error:', error);
    }
  };

  const stats = [
    { label: '总投资者', value: '1,200+', icon: Users, color: 'text-blue-600' },
    { label: '总投资额', value: '$2.5M', icon: DollarSign, color: 'text-green-600' },
    { label: '累计分红', value: '$380K', icon: TrendingUp, color: 'text-purple-600' },
    { label: '平均年化', value: '15.5%', icon: Award, color: 'text-orange-600' },
  ];

  const features = [
    {
      icon: TrendingUp,
      title: '70%利润分红',
      description: '平台每月净利润70%自动分配给投资者，透明公开',
    },
    {
      icon: BarChart3,
      title: '资产可交易',
      description: '虚拟资产可随时在平台交易，灵活变现，退出自由',
    },
    {
      icon: Zap,
      title: '稳定收益',
      description: '柬埔寨电摩市场快速增长，收益稳定可预期',
    },
    {
      icon: Shield,
      title: '安全可靠',
      description: 'JWT认证，数据加密，银行级安全保障',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              柬埔寨电池银行
              <span className="text-primary-600">投资平台</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              投资柬埔寨换电市场，享受70%利润自动分红
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/invest" className="btn-primary text-lg px-8 py-3">
                立即投资
              </Link>
              <Link href="/register" className="btn-secondary text-lg px-8 py-3">
                免费注册
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="card text-center">
                <stat.icon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            核心优势
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-md transition-shadow">
                <feature.icon className="h-10 w-10 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Overview */}
      {forecast && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              柬埔寨市场概览
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <Globe className="h-10 w-10 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">电摩保有量</h3>
                <div className="text-3xl font-bold text-primary-600">
                  {forecast.marketOverview.totalElectricMotorcycles}
                </div>
                <p className="text-gray-500 text-sm mt-2">持续快速增长</p>
              </div>
              <div className="card">
                <Zap className="h-10 w-10 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">日换电需求</h3>
                <div className="text-3xl font-bold text-green-600">
                  {forecast.marketOverview.dailySwapDemand.toLocaleString()}+
                </div>
                <p className="text-gray-500 text-sm mt-2">次/天</p>
              </div>
              <div className="card">
                <TrendingUp className="h-10 w-10 text-orange-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">年增长率</h3>
                <div className="text-3xl font-bold text-orange-600">
                  {Number((forecast.marketOverview.marketGrowthRate || 0) * 100).toFixed(0)}%
                </div>
                <p className="text-gray-500 text-sm mt-2">市场年复合增长率</p>
              </div>
            </div>

            {/* Investment Example */}
            <div className="mt-12 card bg-gradient-to-r from-primary-50 to-blue-50">
              <h3 className="text-xl font-bold text-gray-900 mb-6">投资收益示例</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">投资金额</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${forecast.investorReturns.exampleCalculation.investment.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">月分红</div>
                  <div className="text-2xl font-bold text-green-600">
                    ~${forecast.investorReturns.exampleCalculation.estimatedMonthlyDividend}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">年分红</div>
                  <div className="text-2xl font-bold text-green-600">
                    ~${forecast.investorReturns.exampleCalculation.estimatedYearlyDividend}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">5年累计</div>
                  <div className="text-2xl font-bold text-primary-600">
                    ~${forecast.investorReturns.exampleCalculation.fiveYearTotal.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center text-sm text-gray-500">
                * 以上为预测收益，实际收益以每月实际运营利润为准
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            开始您的柬埔寨电池投资之旅
          </h2>
          <p className="text-primary-100 mb-8">
            立即注册，抢占东南亚新能源市场投资先机
          </p>
          <Link href="/register" className="inline-block bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            免费注册账户
          </Link>
        </div>
      </section>
    </div>
  );
}
