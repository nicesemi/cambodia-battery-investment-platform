'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RotateCcw, Package, Calculator } from 'lucide-react';

export default function Trade() {
  const { user } = useAuth();
  const router = useRouter();

  const [myUnits, setMyUnits] = useState([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [previewResult, setPreviewResult] = useState(null);
  const [selling, setSelling] = useState(false);
  const [sellMsg, setSellMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role === 'franchisee') { router.push('/franchisee'); return; }
    loadMyUnits();
  }, [user]);

  const loadMyUnits = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const listRes = await fetch('/api/trades/sell-to-platform?list=1', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (listRes.ok) {
        const json = await listRes.json();
        setMyUnits(json.units || []);
      }
    } catch (e) { console.error('Load my units error:', e); }
    finally { setLoading(false); }
  };

  const handlePreviewBuyback = async (unitId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/trades/sell-to-platform?unitId=${unitId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setPreviewResult(json);
      }
    } catch (e) { /* ignore */ }
  };

  const toggleUnitSelection = (unitId) => {
    setSelectedUnitIds(prev => {
      const next = prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId];
      if (!prev.includes(unitId)) handlePreviewBuyback(unitId);
      return next;
    });
  };

  const handleSellToPlatform = async () => {
    if (selectedUnitIds.length === 0) { setSellMsg('请先选择要出售的电池单元'); return; }
    setSelling(true); setSellMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/trades/sell-to-platform', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: selectedUnitIds }),
      });
      const json = await res.json();
      if (!res.ok) { setSellMsg(json.error || '出售失败'); return; }
      setSellMsg(`成功！共获得 $${json.totalBuyback.toFixed(2)}，新余额 $${json.newBalance.toFixed(2)}`);
      setSelectedUnitIds([]);
      setPreviewResult(null);
      loadMyUnits();
    } catch (e) { setSellMsg('出售失败'); }
    finally { setSelling(false); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">加载中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">平台回购</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">我的电池单元</h2>
            <button onClick={loadMyUnits} className="p-1 text-gray-400 hover:text-gray-600"><RotateCcw className="h-4 w-4" /></button>
          </div>
          {myUnits.length === 0
            ? <div className="text-sm text-gray-400 text-center py-8">暂无可回购的电池单元</div>
            : <div className="space-y-2 max-h-96 overflow-y-auto">
                {myUnits.map(unit => (
                  <div key={unit.id} onClick={() => toggleUnitSelection(unit.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedUnitIds.includes(unit.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked={selectedUnitIds.includes(unit.id)} readOnly className="h-4 w-4" />
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{unit.unit_code || unit.id?.slice(0, 8)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{unit.asset_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">购入价: ${Number(unit.unit_price || 1000).toFixed(2)}</div>
                  </div>))}
              </div>}
          {selectedUnitIds.length > 0 && (
            <button onClick={handleSellToPlatform} disabled={selling}
              className="mt-4 w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {selling ? '处理中...' : `出售 ${selectedUnitIds.length} 个单元给平台`}
            </button>)}
          {sellMsg && (
            <div className={`mt-3 p-2 rounded text-sm ${sellMsg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{sellMsg}</div>)}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />回购价格预览</h2>
          {!previewResult && <div className="text-sm text-gray-400 text-center py-12">点击左侧电池单元查看回购价格</div>}
          {previewResult && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                {[
                  ['购入价格', `$${previewResult.purchasePrice?.toFixed(2)}`, 'text-gray-600'],
                  ['持有时间', `${previewResult.monthsHeld?.toFixed(1)} 月`, 'text-gray-600'],
                  ['残值', `$${previewResult.residualValue?.toFixed(2)}`, 'text-gray-600'],
                  ['残值率', `${previewResult.residualRate}%`, 'text-gray-600'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between"><span className={cls}>{label}</span><span className="font-medium">{val}</span></div>
                ))}
                {previewResult.penaltyRate > 0 && <>
                  <div className="border-t pt-2 flex justify-between"><span className="text-red-600">罚金 ({previewResult.penaltyRate}%)</span><span className="font-medium text-red-600">-${previewResult.penaltyAmount?.toFixed(2)}</span></div>
                </>}
              </div>
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary-900">回购价格</span>
                  <span className="text-2xl font-bold text-primary-700">${previewResult.buybackPrice?.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-xs text-primary-600">{previewResult.formula}</div>
              </div>
              <div className="p-3 rounded-lg text-xs bg-blue-50 text-blue-800">
                {previewResult.tier}：残值 = 购入价 × (1 - 持有月数 / 60)，回购价 = 残值 × (1 - 罚金比例)
              </div>
            </div>)}
        </div>
      </div>
    </div>
  );
}
