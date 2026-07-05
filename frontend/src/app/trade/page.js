'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RotateCcw, Package, Calculator } from 'lucide-react';
import { formatCurrency, localeCurrency, fetchRates } from '../../lib/currency';
import { useTranslation } from 'react-i18next';

export default function Trade() {
  const { t, i18n } = useTranslation();

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

  const { user } = useAuth();
  const router = useRouter();

  const [myUnits, setMyUnits] = useState([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [previewMap, setPreviewMap] = useState({});  // unitId → buyback result
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }});
      if (listRes.ok) {
        const json = await listRes.json();
        setMyUnits(json.units || []);
      }
    } catch (e) { console.error('Load my units error:', e); }
    finally { setLoading(false); }
  };

  const fetchPreview = async (unitId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/trades/sell-to-platform?unitId=${unitId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }});
      if (res.ok) {
        const json = await res.json();
        setPreviewMap(prev => ({ ...prev, [unitId]: json }));
      }
    } catch (e) { /* ignore */ }
  };

  const toggleUnitSelection = (unitId) => {
    setSelectedUnitIds(prev => {
      const isAdding = !prev.includes(unitId);
      const next = isAdding ? [...prev, unitId] : prev.filter(id => id !== unitId);
      if (isAdding) fetchPreview(unitId);
      if (!isAdding) {
        setPreviewMap(p => { const { [unitId]: _, ...rest } = p; return rest; });
      }
      return next;
    });
  };

  const handleSellToPlatform = async () => {
    if (selectedUnitIds.length === 0) { setSellMsg(t('trade.selectFirst')); return; }
    setSelling(true); setSellMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/trades/sell-to-platform', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: selectedUnitIds })});
      const json = await res.json();
      if (!res.ok) { setSellMsg(json.error || t('trade.sellFailed')); return; }
      setSellMsg(t('trade.sellSuccess', { total: json.totalBuyback.toFixed(2), totalCny: (json.totalBuyback * 7.25).toFixed(2), balance: json.newBalance.toFixed(2), balanceCny: (json.newBalance * 7.25).toFixed(2) }));
      setSelectedUnitIds([]);
      setPreviewMap({});
      loadMyUnits();
    } catch (e) { setSellMsg(t('trade.sellFailed')); }
    finally { setSelling(false); }
  };

  const selectedPreviews = selectedUnitIds.map(id => previewMap[id]).filter(Boolean);
  const totalBuyback = selectedPreviews.reduce((sum, p) => sum + (p.buybackPrice || 0), 0);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">{t('trade.loading')}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('trade.title')}</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('trade.myUnits')}</h2>
            <button onClick={loadMyUnits} className="p-1 text-gray-400 hover:text-gray-600"><RotateCcw className="h-4 w-4" /></button>
          </div>
          {myUnits.length === 0
            ? <div className="text-sm text-gray-400 text-center py-8">{t('trade.noUnits')}</div>
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
                    <div className="mt-1 text-xs text-gray-500">{t('trade.purchasePrice')}: {formatCurrency(Number(unit.unit_price || 1000), i18n.language)}</div>
                  </div>))}
              </div>}
          {selectedUnitIds.length > 0 && (
            <button onClick={handleSellToPlatform} disabled={selling}
              className="mt-4 w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {selling ? t('trade.processing') : t('trade.sellConfirm', { count: selectedUnitIds.length, totalBuyback: totalBuyback.toFixed(2), totalCny: (totalBuyback * 7.25).toFixed(2) })}
            </button>)}
          {sellMsg && (
            <div className={`mt-3 p-2 rounded text-sm ${sellMsg.includes('$') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{sellMsg}</div>)}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />{t('trade.preview')}</h2>
          {selectedPreviews.length === 0 && <div className="text-sm text-gray-400 text-center py-12">{t('trade.previewHint')}</div>}
          {selectedPreviews.length > 0 && (
            <div className="space-y-3">
              {selectedPreviews.map((p, i) => {
                const unit = myUnits.find(u => u.id === selectedUnitIds[i]);
                return (
                  <div key={selectedUnitIds[i]} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{unit?.unit_code || selectedUnitIds[i]?.slice(0, 10)}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${p.penaltyRate > 30 ? 'bg-red-100 text-red-700' : p.penaltyRate > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {p.tier}
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">{t('trade.purchasePrice')}</span><span className="font-medium">{formatCurrency(p.purchasePrice, i18n.language)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('trade.holding')}</span><span className="font-medium">{p.monthsHeld?.toFixed(1)}{t('trade.months')}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('trade.residual')}</span><span className="font-medium">{formatCurrency(p.residualValue, i18n.language)} ({p.residualRate}%)</span></div>
                      {p.penaltyRate > 0 && (
                        <div className="flex justify-between"><span className="text-red-500">{t('trade.penalty')} ({p.penaltyRate}%)</span><span className="font-medium text-red-500">-{formatCurrency(p.penaltyAmount, i18n.language)}</span></div>
                      )}
                      <div className="border-t pt-1.5 flex justify-between">
                        <span className="font-medium text-primary-900">{t('trade.buybackPrice')}</span>
                        <span className="font-bold text-primary-700">{formatCurrency(p.buybackPrice, i18n.language)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* 合计汇总 */}
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary-600">{t('trade.previewTotal', { count: selectedPreviews.length })}</span>
                  <span className="text-2xl font-bold text-primary-700">{formatCurrency(totalBuyback, i18n.language)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
