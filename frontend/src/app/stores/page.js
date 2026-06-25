'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Search, Battery, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storesAPI } from '../../services/api';

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const amapReady = useAmap();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [filterCountry, setFilterCountry] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ─── 权限校验：投资者、加盟商、管理员、运营人员均可访问 ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    const allowedRoles = ['investor', 'franchisee', 'admin', 'operator'];
    if (!allowedRoles.includes(user.role)) {
      router.push('/');
      return;
    }
    loadStores();
  }, [user, authLoading]);

  const loadStores = async () => {
    try {
      const data = await storesAPI.getApprovedStores();
      setStores(data.stores || []);
    } catch (e) {
      console.error('Stores load failed:', e);
      setError(e.message || '门店数据加载失败');
    } finally { setLoading(false); }
  };

  const countries = ['all', ...new Set(stores.map(s => s.country || s.city || '').filter(Boolean))];

  const filteredStores = stores.filter(s => {
    if (filterCountry !== 'all') {
      const sCountry = s.country || s.city || '';
      if (sCountry !== filterCountry) return false;
    }
    const name = s.name || s.store_name || '';
    const city = s.city || '';
    const address = s.address || '';
    if (searchText && !name.includes(searchText) && !city.includes(searchText) && !address.includes(searchText)) return false;
    return true;
  });

  // ─── 地图初始化 ──────────────────────────────────
  useEffect(() => {
    if (!amapReady || !containerRef.current || mapRef.current || filteredStores.length === 0) return;
    const AMap = window.AMap;
    const map = new AMap.Map(containerRef.current, {
      center: [105, 14],
      zoom: 4,
      mapStyle: 'amap://styles/light',
    });
    mapRef.current = map;

    filteredStores.forEach(s => {
      const lng = s.lng || s.longitude || 0;
      const lat = s.lat || s.latitude || 0;
      if (!lng || !lat) return;
      const count = s.total_batteries || s.count || 0;
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: `<div style="width:40px;height:40px;background:#007AFF;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 16px rgba(0,0,0,0.3);cursor:pointer;border:2px solid #fff">${count}</div>`,
        offset: new AMap.Pixel(-20, -20),
      });
      marker.on('click', () => {
        setSelectedStore(s);
        map.setZoomAndCenter(10, [lng, lat]);
      });
      map.add(marker);
    });

    return () => { map.destroy(); mapRef.current = null; };
  }, [amapReady, filteredStores]);

  useEffect(() => {
    if (!mapRef.current || filteredStores.length === 0) return;
    const first = filteredStores[0];
    setSelectedStore(first);
    const lng = first.lng || first.longitude || 0;
    const lat = first.lat || first.latitude || 0;
    if (lng && lat) mapRef.current.setZoomAndCenter(10, [lng, lat]);
  }, [filterCountry]);

  const focusStore = (store) => {
    setSelectedStore(store);
    const lng = store.lng || store.longitude || 0;
    const lat = store.lat || store.latitude || 0;
    if (mapRef.current && lng && lat) mapRef.current.setZoomAndCenter(12, [lng, lat]);
    document.getElementById('store-detail')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">加载门店数据中...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-red-500 text-lg font-medium">数据加载失败</div>
        <p className="text-gray-400">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); loadStores(); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">在营区县门店</h1>
          <p className="text-blue-100 text-lg">{stores.length} 家区县门店 · 覆盖多城市</p>
        </div>
      </section>

      {/* Map Section */}
      <section className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div ref={containerRef} className="w-full h-[450px] md:h-[550px]" />
        </div>
      </section>

      {/* Search + Filter */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索门店名称、城市、地址..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setFilterCountry(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filterCountry === c
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400'
                }`}
              >
                {c === 'all' ? '全部' : c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Store List */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map(store => (
            <div
              key={store.id}
              id="store-detail"
              onClick={() => focusStore(store)}
              className={`bg-white rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                selectedStore?.id === store.id
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {store.images && store.images.length > 0 && (
                <div className="h-40 overflow-hidden rounded-t-2xl">
                  <img
                    src={store.images[0]}
                    alt={`${store.name || store.store_name || ''} 门店照片`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{store.name || store.store_name || '—'}</h3>
                    <p className="text-sm text-blue-600 font-medium">
                      {store.country && `${store.country} · `}{store.city || '—'}
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                    {store.type || '区县门店'}
                  </span>
                </div>
                {(store.store_code) && (
                  <p className="text-xs text-gray-400 mb-2 font-mono">编码: {store.store_code}</p>
                )}
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />{store.address || '—'}
                </div>
                {store.phone && (
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <Phone className="h-4 w-4 mr-2 flex-shrink-0" />{store.phone}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Battery className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-bold text-blue-600">{store.total_batteries || store.count || 0}</span>
                    <span className="text-xs text-gray-400">电池</span>
                  </div>
                  {store.owner_name && (
                    <span className="text-xs text-gray-400">负责人: {store.owner_name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredStores.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-4" />
            <p>未找到匹配的门店</p>
          </div>
        )}
      </section>
    </div>
  );
}
