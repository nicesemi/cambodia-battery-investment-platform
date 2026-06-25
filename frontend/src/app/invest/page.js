'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assetAPI, orderAPI } from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, TrendingUp, Battery, ShoppingCart, DollarSign, Calendar, BarChart3, Clock, Zap } from 'lucide-react';

export default function Invest() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeRef = searchParams.get('store');

  const [activeTab, setActiveTab] = useState('browse');
  const [assets, setAssets] = useState([]);
  const [userAssets, setUserAssets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [purchaseUnits, setPurchaseUnits] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [boundStoreId, setBoundStoreId] = useState(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role === 'franchisee') { router.push('/franchisee'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    // 静态电池数据fallback（当后端API不可用时使用）
    const FALLBACK_BATTERIES = [
      { id: '4820', name: '通用低速两轮换电', battery_type: '两轮换电', location: '柬埔寨·金边', asset_code: 'BT-4820-001', description: '家用电动二轮车换电电池，51.2V/20Ah/1.024kWh，适合日常通勤。', unit_price: 118, unit_price_rmb: 856, expected_roi: 8.2, available_units: 500, total_units: 500 },
      { id: '6035', name: '中速电摩换电', battery_type: '两轮换电', location: '柬埔寨·金边', asset_code: 'BT-6035-001', description: '外卖骑手/60V电摩换电电池，64V/35Ah/2.24kWh，高频使用场景。', unit_price: 238, unit_price_rmb: 1726, expected_roi: 9.5, available_units: 300, total_units: 300 },
      { id: '7250', name: '高速电摩换电', battery_type: '两轮换电', location: '柬埔寨·暹粒', asset_code: 'BT-7250-001', description: '72V两轮电摩/山区换电，76.8V/50Ah/3.84kWh，续航强劲。', unit_price: 428, unit_price_rmb: 3103, expected_roi: 10.8, available_units: 200, total_units: 200 },
      { id: '72100', name: '重载三轮备用款', battery_type: '三轮换电', location: '柬埔寨·金边', asset_code: 'BT-72100-001', description: '快递/摆摊货运三轮电池，76.8V/100Ah/7.68kWh，大容量。', unit_price: 845, unit_price_rmb: 6126, expected_roi: 11.2, available_units: 150, total_units: 150 },
      { id: 'van420', name: '4.2米物流货车电池', battery_type: '商用车', location: '柬埔寨·西哈努克', asset_code: 'BT-VAN420-001', description: '城市短途物流车队BaaS电池，384V/96kWh，物流降本利器。', unit_price: 6800, unit_price_rmb: 49300, expected_roi: 12.5, available_units: 80, total_units: 80 },
      { id: 'bus600', name: '6米客运中巴电池', battery_type: '商用车', location: '柬埔寨·金边', asset_code: 'BT-BUS600-001', description: '城乡短途客运车队电池，512V/160kWh，客运电动化首选。', unit_price: 12400, unit_price_rmb: 89900, expected_roi: 13.0, available_units: 50, total_units: 50 },
      { id: 'bus1200', name: '12米城市大巴电池', battery_type: '商用车', location: '柬埔寨·金边', asset_code: 'BT-BUS1200-001', description: '公交集团电动客车电池，640V/256kWh，城市公交配套。', unit_price: 18200, unit_price_rmb: 131950, expected_roi: 13.5, available_units: 30, total_units: 30 },
      { id: 'ess100', name: '工商业100kWh风冷柜', battery_type: '工商业储能', location: '柬埔寨·金边', asset_code: 'BT-ESS100-001', description: '小型商铺/加工厂峰谷套利，627.2V/100kWh，降电费利器。', unit_price: 24800, unit_price_rmb: 179800, expected_roi: 14.0, available_units: 40, total_units: 40 },
      { id: 'ess215', name: '工商业215kWh储能柜', battery_type: '工商业储能', location: '柬埔寨·西哈努克', asset_code: 'BT-ESS215-001', description: '中小型工厂储能降电费，716.8V/215kWh，工厂必备。', unit_price: 49500, unit_price_rmb: 358875, expected_roi: 14.5, available_units: 25, total_units: 25 },
      { id: 'ess300', name: '工商业300kWh储能柜', battery_type: '工商业储能', location: '柬埔寨·暹粒', asset_code: 'BT-ESS300-001', description: '产业园区/充电桩配套储能，806.4V/300kWh。', unit_price: 67200, unit_price_rmb: 487200, expected_roi: 15.0, available_units: 20, total_units: 20 },
      { id: 'ess500', name: '工商业500kWh液冷柜', battery_type: '工商业储能', location: '柬埔寨·金边', asset_code: 'BT-ESS500-001', description: '大型商场/制造厂区储能，985.6V/500kWh，液冷高效。', unit_price: 108000, unit_price_rmb: 783000, expected_roi: 15.5, available_units: 15, total_units: 15 },
      { id: 'cont145', name: '20尺1.45MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT145-001', description: '小型分布式电站/备用储能，1228.8V/1454kWh。', unit_price: 275000, unit_price_rmb: 1993750, expected_roi: 16.0, available_units: 10, total_units: 10 },
      { id: 'cont344', name: '20尺3.44MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·西哈努克', asset_code: 'BT-CONT344-001', description: '中小型光伏配储电站，1228.8V/3440kWh。', unit_price: 638000, unit_price_rmb: 4625500, expected_roi: 16.5, available_units: 8, total_units: 8 },
      { id: 'cont399', name: '20尺3.99MWh集装箱', battery_type: '集装箱储能', location: '柬埔寨·暹粒', asset_code: 'BT-CONT399-001', description: '中型电网调频/容量备用，1331.2V/3993kWh。', unit_price: 735000, unit_price_rmb: 5328750, expected_roi: 17.0, available_units: 6, total_units: 6 },
      { id: 'cont500', name: '40尺5MWh风冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT500-001', description: '大型风光基地配套储能，1331.2V/5000kWh。', unit_price: 920000, unit_price_rmb: 6670000, expected_roi: 17.5, available_units: 5, total_units: 5 },
      { id: 'cont520', name: '40尺5.2MWh液冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT520-001', description: '高标准电网储能电站，1331.2V/5200kWh，液冷高效。', unit_price: 998000, unit_price_rmb: 7235500, expected_roi: 18.0, available_units: 3, total_units: 3 },
      { id: 'cont600', name: '40尺6MWh液冷集装箱', battery_type: '集装箱储能', location: '柬埔寨·金边', asset_code: 'BT-CONT600-001', description: '大型调峰/新能源消纳，1433.6V/6000kWh，旗舰产品。', unit_price: 1160000, unit_price_rmb: 8410000, expected_roi: 18.5, available_units: 2, total_units: 2 },
    ];

    try {
      const [assetsRes, userAssetsRes, ordersRes, bindingRes] = await Promise.all([
        assetAPI.getAssets(),
        assetAPI.getUserAssets(),
        orderAPI.getMyOrders(1, 50),
        orderAPI.getMyBinding().catch(() => null),
      ]);
      const apiAssets = assetsRes.assets || [];
      // 如果API返回为空，使用静态fallback数据
      setAssets(apiAssets.length > 0 ? apiAssets : FALLBACK_BATTERIES);
      setUserAssets(userAssetsRes.userAssets || []);
      setOrders(ordersRes.orders || []);
      if (bindingRes?.binding?.store_id) {
        setBoundStoreId(bindingRes.binding.store_id);
      }
    } catch (e) {
      console.error(e);
      // API调用失败时也使用fallback数据
      setAssets(FALLBACK_BATTERIES);
    }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    if (!selectedAsset) return;
    setPurchasing(true);
    try {
      await orderAPI.createOrder({
        asset_id: selectedAsset.id,
        units: purchaseUnits,
        store_id: storeRef || boundStoreId || null,
      });
      alert('购买成功！');
      setSelectedAsset(null);
      setPurchaseUnits(1);
      loadData();
    } catch (err) { alert(err.message || '购买失败'); }
    finally { setPurchasing(false); }
  };

  const totalInvested = userAssets.reduce((s, ua) => s + (ua.total_invested || 0), 0);
  const totalDividends = userAssets.reduce((s, ua) => s + (ua.total_dividends_received || 0), 0);
  const activeCount = userAssets.filter(ua => (ua.units || 0) > 0).length;

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">电池资产投资</h1>
          <p className="text-blue-100 mt-2">选择优质电池资产，享受稳定分红收益</p>
          {storeRef && <div className="mt-3 bg-white/20 backdrop-blur rounded-lg px-4 py-2 inline-block text-sm">门店推荐通道</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">${totalInvested.toFixed(0)}</div><div className="text-blue-100 text-sm">总投资</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">${totalDividends.toFixed(0)}</div><div className="text-blue-100 text-sm">累计分红</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{activeCount}</div><div className="text-blue-100 text-sm">持仓资产</div></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><div className="text-3xl font-bold">{orders.length}</div><div className="text-blue-100 text-sm">交易记录</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'browse', label: '资产浏览', icon: Battery },
              { key: 'portfolio', label: '我的投资', icon: BarChart3 },
              { key: 'orders', label: '交易记录', icon: Clock },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center space-x-2 py-4 border-b-2 text-sm font-medium transition ${
                  activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab: Browse */}
        {activeTab === 'browse' && (
          <div>
            <h2 className="text-xl font-bold mb-6">可投资电池资产</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map(asset => (
                <div key={asset.id} className="bg-white rounded-xl border hover:shadow-lg transition">
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-xl flex items-center justify-center overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Battery className="h-16 w-16 text-blue-300" />
                    )}
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-white/80 text-blue-700">{asset.battery_type}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900">{asset.name}</h3>
                    <p className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />{asset.location} · {asset.asset_code}
                    </p>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{asset.description}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-sm">
                      <div><div className="text-gray-400">单价</div><div className="font-bold text-gray-900">${asset.unit_price}</div>{asset.unit_price_rmb != null && <div className="text-xs text-gray-400">¥{asset.unit_price_rmb}</div>}</div>
                      {asset.monthly_rent != null && <div><div className="text-gray-400">月租金</div><div className="font-bold text-gray-900">¥{asset.monthly_rent}{' '}<span className="text-xs text-gray-400">/月</span></div></div>}
                      <div><div className="text-gray-400">预期年化</div><div className="font-bold text-green-600 flex items-center"><TrendingUp className="h-3 w-3 mr-1" />{asset.expected_roi}%</div></div>
                      <div><div className="text-gray-400">可购</div><div className="font-bold text-gray-900">{asset.available_units} 份</div></div>
                      <div><div className="text-gray-400">总量</div><div className="font-bold text-gray-500">{asset.total_units} 份</div></div>
                    </div>
                    <button onClick={() => setSelectedAsset(asset)} disabled={asset.available_units === 0}
                      className="w-full mt-4 btn-primary flex items-center justify-center space-x-2">
                      <ShoppingCart className="h-4 w-4" /><span>{asset.available_units > 0 ? '立即购买' : '已售罄'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Portfolio */}
        {activeTab === 'portfolio' && (
          <div>
            <h2 className="text-xl font-bold mb-6">我的投资组合</h2>
            {userAssets.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无投资记录</p>
                <button onClick={() => setActiveTab('browse')} className="btn-primary">浏览资产开始投资</button>
              </div>
            ) : (
              <div className="space-y-6">
                {userAssets.map(ua => (
                  <div key={ua.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{ua.name}</h3>
                          <p className="text-sm text-gray-500">{ua.asset_code} · {ua.battery_type} · {ua.location}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">持有中</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">持有份数</div>
                          <div className="font-bold text-lg">{ua.units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">投资金额</div>
                          <div className="font-bold text-lg">${((ua.units || 0) * (ua.average_cost || ua.unit_price || 0)).toFixed(0)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">累计分红</div>
                          <div className="font-bold text-lg text-green-600">${(ua.total_dividends_received || 0).toFixed(0)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">库存 / 总量</div>
                          <div className="font-bold text-lg">{ua.stock ?? ua.available_units ?? '-'} / {ua.total_units}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-400">预期年化</div>
                          <div className="font-bold text-lg text-green-600">{ua.expected_roi}%</div>
                        </div>
                      </div>
                    </div>

                    {/* 电池单元明细 */}
                    {ua.battery_units && ua.battery_units.length > 0 && (
                      <div className="border-t">
                        <div className="px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600">
                          电池编号明细（{ua.battery_units.length} 块）
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="text-left p-3 font-medium text-gray-500">唯一编号</th>
                                <th className="text-left p-3 font-medium text-gray-500">运营站点</th>
                                <th className="text-center p-3 font-medium text-gray-500">电量</th>
                                <th className="text-center p-3 font-medium text-gray-500">温度</th>
                                <th className="text-center p-3 font-medium text-gray-500">循环次数</th>
                                <th className="text-center p-3 font-medium text-gray-500">健康状态</th>
                                <th className="text-center p-3 font-medium text-gray-500">最后在线</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ua.battery_units.map((bu, idx) => (
                                <tr key={bu.holding_id || idx} className="border-t hover:bg-gray-50/50">
                                  <td className="p-3 font-mono font-medium text-blue-700">{bu.unit_code}</td>
                                  <td className="p-3 text-gray-600">{bu.site_name || bu.site_id || '—'}</td>
                                  <td className="p-3 text-center">
                                    <span className={`font-medium ${(bu.sensor_battery_level ?? 100) > 50 ? 'text-green-600' : (bu.sensor_battery_level ?? 100) > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {bu.sensor_battery_level ?? '—'}{bu.sensor_battery_level != null ? '%' : ''}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-gray-600">{bu.sensor_temperature != null ? `${bu.sensor_temperature}°C` : '—'}</td>
                                  <td className="p-3 text-center text-gray-600">{bu.sensor_cycle_count ?? '—'}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      bu.sensor_health_status === 'normal' ? 'bg-green-100 text-green-700' :
                                      bu.sensor_health_status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {bu.sensor_health_status === 'normal' ? '正常' : bu.sensor_health_status === 'warning' ? '注意' : '异常'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-gray-400">
                                    {bu.sensor_last_online ? new Date(bu.sensor_last_online).toLocaleDateString('zh-CN') : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Orders */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-6">交易记录</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无交易记录</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">资产</th>
                      <th className="text-center p-4">数量</th>
                      <th className="text-right p-4">单价</th>
                      <th className="text-right p-4">金额</th>
                      <th className="text-right p-4">来源</th>
                      <th className="text-right p-4">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td className="p-4"><div className="font-medium">{o.asset?.name || '-'}</div><div className="text-xs text-gray-400">{o.asset?.asset_code}</div></td>
                        <td className="p-4 text-center">{o.units}</td>
                        <td className="p-4 text-right">${o.unit_price}</td>
                        <td className="p-4 text-right font-semibold">${o.total_amount}</td>
                        <td className="p-4 text-right">
                          {o.order_source === 'store' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{o.store?.name || '门店'}</span>
                          ) : <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">在线</span>}
                        </td>
                        <td className="p-4 text-right text-gray-400">{new Date(o.created_at).toLocaleDateString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">购买确认</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">{selectedAsset.name}</div>
              <div className="text-sm text-gray-600">类型: {selectedAsset.battery_type} · 单价: ${selectedAsset.unit_price}</div>
              <div className="text-sm text-green-600">预期年化收益: {selectedAsset.expected_roi}%</div>
            </div>
            <div className="mb-4">
              <label className="label">购买数量</label>
              <input type="number" min="1" max={selectedAsset.available_units} value={purchaseUnits}
                onChange={e => setPurchaseUnits(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedAsset.available_units)))}
                className="input-field" />
            </div>
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between"><span>总金额</span><span className="font-bold text-primary-600">${(Number(selectedAsset.unit_price || 0) * purchaseUnits).toFixed(2)}</span></div>
              {storeRef && <div className="text-xs text-gray-500 mt-1">通过门店引导下单</div>}
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setSelectedAsset(null)} className="flex-1 btn-secondary">取消</button>
              <button onClick={handlePurchase} disabled={purchasing} className="flex-1 btn-primary">{purchasing ? '购买中...' : '确认购买'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
