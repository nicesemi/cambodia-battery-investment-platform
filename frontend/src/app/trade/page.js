'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tradeAPI, assetAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function Trade() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [orderType, setOrderType] = useState('buy');
  const [price, setPrice] = useState(1000);
  const [quantity, setQuantity] = useState(1);
  const [orderBook, setOrderBook] = useState({ buyOrders: [], sellOrders: [] });
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const assetsRes = await assetAPI.getAssets();
      setAssets(assetsRes.data.assets);
      
      if (assetsRes.data.assets.length > 0) {
        setSelectedAsset(assetsRes.data.assets[0]);
        setPrice(assetsRes.data.assets[0].unit_price);
        loadOrderBook(assetsRes.data.assets[0].id);
      }
      
      loadMyOrders();
    } catch (error) {
      console.error('Load trade data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderBook = async (assetId) => {
    try {
      const res = await tradeAPI.getOrderBook(assetId);
      setOrderBook(res.data);
    } catch (error) {
      console.error('Load order book error:', error);
    }
  };

  const loadMyOrders = async () => {
    try {
      const res = await tradeAPI.getMyOrders();
      setMyOrders(res.data.orders || []);
    } catch (error) {
      console.error('Load my orders error:', error);
    }
  };

  const handleAssetChange = (asset) => {
    setSelectedAsset(asset);
    setPrice(asset.unit_price);
    loadOrderBook(asset.id);
  };

  const handleSubmitOrder = async () => {
    try {
      await tradeAPI.createOrder({
        assetId: selectedAsset.id,
        orderType,
        price,
        units: quantity,
      });
      alert('订单提交成功！');
      loadOrderBook(selectedAsset.id);
      loadMyOrders();
    } catch (error) {
      alert(error.response?.data?.error || '下单失败');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await tradeAPI.cancelOrder(orderId);
      alert('订单已取消');
      loadMyOrders();
    } catch (error) {
      alert('取消失败');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">资产交易</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 下单区域 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">下单</h2>
          
          <div className="mb-4">
            <label className="label">选择资产</label>
            <select
              value={selectedAsset?.id || ''}
              onChange={(e) => {
                const asset = assets.find(a => a.id === e.target.value);
                if (asset) handleAssetChange(asset);
              }}
              className="input-field"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex mb-4 border rounded-lg overflow-hidden">
            <button
              onClick={() => setOrderType('buy')}
              className={`flex-1 py-2 font-medium transition-colors ${
                orderType === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              买入
            </button>
            <button
              onClick={() => setOrderType('sell')}
              className={`flex-1 py-2 font-medium transition-colors ${
                orderType === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              卖出
            </button>
          </div>

          <div className="mb-4">
            <label className="label">价格 (USD)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="input-field"
              step="0.01"
            />
          </div>

          <div className="mb-4">
            <label className="label">数量</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="input-field"
              min="1"
            />
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">总额</span>
              <span className="font-semibold">${Number(price * quantity || 0).toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSubmitOrder}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              orderType === 'buy'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {orderType === 'buy' ? '确认买入' : '确认卖出'}
          </button>
        </div>

        {/* 订单簿 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">订单簿</h2>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-600 mb-2">买单</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {orderBook.buyOrders.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-2">暂无买单</div>
              ) : (
                orderBook.buyOrders.map((o, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 px-2 bg-green-50 rounded">
                    <span className="text-green-600">${o.price}</span>
                    <span>{o.total_units} 份</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-red-600 mb-2">卖单</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {orderBook.sellOrders.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-2">暂无卖单</div>
              ) : (
                orderBook.sellOrders.map((o, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 px-2 bg-red-50 rounded">
                    <span className="text-red-600">${o.price}</span>
                    <span>{o.total_units} 份</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 我的订单 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">我的订单</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {myOrders.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">暂无订单</div>
            ) : (
              myOrders.map((order) => (
                <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.order_type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {order.order_type === 'buy' ? '买' : '卖'}
                      </span>
                      <span className="ml-2 text-sm font-medium">{order.asset_name}</span>
                    </div>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-2">
                    <div>价格: ${order.price}</div>
                    <div>数量: {order.filled_units}/{order.units}</div>
                  </div>
                  <div className={`mt-1 text-xs ${
                    order.status === 'filled' ? 'text-green-600' :
                    order.status === 'cancelled' ? 'text-gray-400' : 'text-yellow-600'
                  }`}>
                    {order.status === 'filled' ? '已成交' :
                     order.status === 'cancelled' ? '已取消' : '待成交'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
