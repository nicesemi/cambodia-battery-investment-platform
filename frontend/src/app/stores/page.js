'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Store, Battery, Globe, DollarSign, ShoppingBag, Camera, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storesAPI } from '../../services/api';
import { formatCurrency, localeCurrency, fetchRates } from '../../lib/currency';
import { useTranslation } from 'react-i18next';

// ─── 门店坐标硬编码 ──────────────────────────────────
const STORE_COORDS = {
  'STORE-00001': { lat: 31.03, lng: 121.23 },
  'STORE-00002': { lat: 32.06, lng: 118.79 },
  'STORE-00003': { lat: 28.23, lng: 112.94 },
  'STORE-00004': { lat: 28.20, lng: 113.08 }};

// ─── 高德地图加载器 ──────────────────────────────────
function useAmap() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.AMap) { setLoaded(true); return; }
    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    if (!key) return;
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);
  return loaded;
}

export default function StoresPage() {
  const { t, i18n } = useTranslation();


  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);


  // ─── 数据映射（组件内部，可访问 t）─────────────────
  function mapStore(s) {
    const coord = STORE_COORDS[s.store_code] || {};
    const totalSales = Number(s.total_sales) || 0;
    const orderCount = Number(s.order_count) || 0;
    return {
      id: s.id,
      name: s.name || s.store_name || '—',
      city: s.city || '',
      region: s.country || s.city || '',
      address: s.address || '',
      phone: s.phone || '',
      lng: s.lng || s.longitude || coord.lng || 0,
      lat: s.lat || s.latitude || coord.lat || 0,
      soldBattery: orderCount ? `${orderCount} ${t('stores.orderUnit')}` : (s.battery_count ? `${s.battery_count} ${t('stores.groupUnit')}` : '—'),
      soldCount: orderCount || (s.battery_count || s.total_batteries || 0),
      revenue: totalSales,
      revenueDisplay: totalSales ? formatCurrency(totalSales, i18n.language) : formatCurrency(0, i18n.language),      status: s.status || 'operating',
      img: (s.images && s.images.length > 0) ? s.images[0] : (s.photo_url || null),
      images: s.images || [],
      photo_url: s.photo_url || null,
      storeCode: s.store_code || '',
      totalSales};
  }
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const amapReady = useAmap();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    const allowedRoles = ['investor', 'franchisee', 'admin', 'operator'];
    if (!allowedRoles.includes(user.role)) { router.push('/'); return; }
    loadStores();
  }, [user, authLoading]);

  const loadStores = async () => {
    try {
      const data = await storesAPI.getApprovedStores();
      setStores((data.stores || []).map(mapStore));
    } catch (e) {
      setError(e.message || t('stores.loadError'));
    } finally { setLoading(false); }
  };

  // ─── 地图初始化 ──────────────────────────────────
  useEffect(() => {
    if (!amapReady || !containerRef.current || stores.length === 0) return;
    if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    const AMap = window.AMap;
    const map = new AMap.Map(containerRef.current, {
      center: [113.5, 30],
      zoom: 5,
      mapStyle: 'amap://styles/light'});
    mapRef.current = map;
    stores.forEach((s) => {
      if (!s.lng || !s.lat) return;
      const marker = new AMap.Marker({
        position: [s.lng, s.lat],
        content: `<div style="width:36px;height:36px;background:#1a1a1a;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${s.soldCount}</div>`,
        offset: new AMap.Pixel(-18, -18)});
      marker.on('click', () => {
        map.setZoomAndCenter(15, [s.lng, s.lat]);
        setSelectedStore(s);
      });
      map.add(marker);
    });
    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady, stores]);

  const focusStore = (store) => {
    setSelectedStore(store);
    if (mapRef.current && store.lng && store.lat) mapRef.current.setZoomAndCenter(15, [store.lng, store.lat]);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">{t('stores.loading')}</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-red-500 text-lg font-medium">{t('stores.loadError')}</div>
        <p className="text-gray-400">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); loadStores(); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">{t('stores.retry')}</button>
      </div>
    );
  }

  return (
    <section className="py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Store className="h-4 w-4 mr-2" />{t('stores.franchiseStores')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('stores.network')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t('stores.description')}</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(() => {
            const totalRevenue = stores.reduce((a, b) => a + (b.totalSales || 0), 0);
            const totalOrders = stores.reduce((a, b) => a + (b.soldCount || 0), 0);
            return [
              { icon: Store, label: t('stores.totalStores'), value: `${stores.length}` },
              { icon: ShoppingBag, label: t('stores.totalSales'), value: `${totalOrders}` },
              { icon: DollarSign, label: t('stores.totalRevenue'), value: formatCurrency(totalRevenue, i18n.language) },
              { icon: Globe, label: t('stores.coverage'), value: t('stores.global') },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center">
                <s.icon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                {s.secondary && <div className="text-xs text-gray-400 mt-0.5">{s.secondary}</div>}
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ));
          })()}
        </div>

        {/* 左地图 右列表 */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div ref={containerRef} className="w-full h-[550px] rounded-2xl shadow-lg bg-gray-100 border border-gray-200" />
            <div className="flex justify-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-gray-900 rounded-full" />{t('stores.chinaMainland')}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />{t('stores.hongkong')}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />{t('stores.macau')}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('stores.franchiseStores')}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t('stores.storeCount', { count: stores.length })}</span>
            </div>
            <div className="space-y-2.5 overflow-y-auto max-h-[510px] pr-1">
              {stores.map((s) => (
                <div
                  key={s.id}
                  onClick={() => focusStore(s)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedStore?.id === s.id
                      ? 'border-gray-900 bg-gray-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {s.img ? (
                        <img src={s.img} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Store className="h-5 w-5 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">{s.name}</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">{t(`stores.status.${s.status}`, s.status)}</span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center"><MapPin className="h-2.5 w-2.5 mr-0.5" />{s.city} · {s.address}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs">
                        <span className="text-gray-500">{t('stores.soldLabel2')} <span className="font-semibold text-gray-700">{s.soldCount}</span>{t('stores.groupUnit')}</span>
                        <span className="text-gray-500">{t('stores.revenueLabel2')} <span className="font-semibold text-gray-700">{s.revenueDisplay}</span>
                          <span className="text-gray-400 ml-1">{s.revenueSecondary}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 选中门店详情 */}
        {selectedStore && (
          <div className="mt-8 grid md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-purple-600 font-medium mt-1">{selectedStore.city} · {selectedStore.region} · {selectedStore.status}</p>
                </div>
                <button onClick={() => setSelectedStore(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('stores.soldBatteryType'), value: selectedStore.soldBattery },
                  { label: t('stores.totalSales'), value: `${selectedStore.soldCount} ${t('stores.batteryGroup')}` },
                  { label: t('stores.totalRevenue'), value: selectedStore.revenueDisplay, secondary: selectedStore.revenueSecondary },
                  { label: t('stores.phone'), value: selectedStore.phone || '—' },
                  { label: t('stores.address'), value: selectedStore.address },
                ].map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{p.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{p.value}</div>
                    {p.secondary && <div className="text-xs text-gray-400 mt-0.5">{p.secondary}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-56 bg-gray-100">
              {((selectedStore.images && selectedStore.images.length > 0) || selectedStore.photo_url) ? (
                <div className="flex gap-2 overflow-x-auto h-full p-2">
                  {[...(selectedStore.images || []), ...(selectedStore.photo_url ? [selectedStore.photo_url] : [])].map((url, i) => (
                    <img key={i} src={url} alt={`${selectedStore.name} ${t('stores.photoAlt2', { index: i + 1 })}`} loading="lazy" decoding="async" className="h-full object-contain rounded-lg bg-gray-50 flex-shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="h-10 w-10 mb-2" />
                  <span className="text-sm">{t('stores.photoPending')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
