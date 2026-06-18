'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assetAPI } from '../../services/api';
import { MapPin, TrendingUp, Battery, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Invest() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [userAssets, setUserAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [purchaseUnits, setPurchaseUnits] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [assetsRes, userAssetsRes] = await Promise.all([
        assetAPI.getAssets(),
        assetAPI.getUserAssets(),
      ]);
      setAssets(assetsRes.data.assets);
      setUserAssets(userAssetsRes.data.userAssets || []);
    } catch (error) {
      console.error('Load assets error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedAsset) return;
    
    setPurchasing(true);
    try {
      await assetAPI.purchaseAsset({
        assetId: selectedAsset.id,
        units: purchaseUnits,
      });
      alert('购买成功！');
      setSelectedAsset(null);
      setPurchaseUnits(1);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || '购买失败');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">电池资产投资</h1>

      {/* My Assets Summary */}
      {userAssets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">我的持仓</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {userAssets.map((ua) => (
              <div key={ua.id} className="card bg-green-50">
                <div className="font-semibold text-gray-900">{ua.name}</div>
                <div className="text-sm text-gray-600 mt-2">
                  <div>持有: {ua.units} 份</div>
                  <div>成本: ${Number(ua.average_cost || 0).toFixed(2)}</div>
                  <div>累计分红: ${Number(ua.total_dividends_received || 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Assets */}
      <h2 className="text-xl font-semibold mb-4">可投资资产</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{asset.name}</h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {asset.location}
                </div>
              </div>
              <Battery className="h-8 w-8 text-primary-600" />
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {asset.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <div className="text-gray-500">单价</div>
                <div className="font-semibold text-gray-900">${asset.unit_price}</div>
              </div>
              <div>
                <div className="text-gray-500">预期年化</div>
                <div className="font-semibold text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {asset.expected_roi}%
                </div>
              </div>
              <div>
                <div className="text-gray-500">可购</div>
                <div className="font-semibold text-gray-900">{asset.available_units} 份</div>
              </div>
              <div>
                <div className="text-gray-500">电池类型</div>
                <div className="font-semibold text-gray-900">{asset.battery_type}</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedAsset(asset)}
              disabled={asset.available_units === 0}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>立即购买</span>
            </button>
          </div>
        ))}
      </div>

      {/* Purchase Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">购买确认</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">{selectedAsset.name}</div>
              <div className="text-sm text-gray-600">单价: ${selectedAsset.unit_price}</div>
            </div>

            <div className="mb-4">
              <label className="label">购买数量</label>
              <input
                type="number"
                min="1"
                max={selectedAsset.available_units}
                value={purchaseUnits}
                onChange={(e) => setPurchaseUnits(parseInt(e.target.value) || 1)}
                className="input-field"
              />
            </div>

            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between">
                <span>总金额</span>
                <span className="font-bold text-primary-600">
                  ${(Number(selectedAsset.unit_price || 0) * purchaseUnits).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedAsset(null)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 btn-primary"
              >
                {purchasing ? '购买中...' : '确认购买'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
