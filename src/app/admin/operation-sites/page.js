'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Edit, Trash2, Loader2, ArrowLeft, Zap, AlertCircle, Search } from 'lucide-react';
const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'km', label: 'ខ្មែរ' },
];
const EMPTY_I18N = { 'zh-CN': '', 'zh-TW': '', 'en': '', 'bn': '', 'km': '' };


const DEFAULT_FORM = {
  name: '', name_i18n: { ...EMPTY_I18N },
  country: '', country_i18n: { ...EMPTY_I18N },
  city: '', city_i18n: { ...EMPTY_I18N },
  address: '', longitude: '', latitude: '',
  battery_count: '', status: '运营中', site_type: '', contact: '', description: '',
  battery_type: '', cabinet_slots: '', template_id: '', image_url: ''
};

const DEFAULT_FILE = null;

export default function OperationSitesPage() {
  const { t, i18n } = useTranslation();
  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [file, setFile] = useState(DEFAULT_FILE);
  const [previewUrl, setPreviewUrl] = useState('');
  const [batteryTypes, setBatteryTypes] = useState([]);
  const [siteTypes, setSiteTypes] = useState([]);
  const [swapTemplates, setSwapTemplates] = useState([]);
  const [selectedLang, setSelectedLang] = useState('zh-CN');

  // 地理编码：优先通过后端代理调 Nominatim，失败则打开 Google Maps 手动查
  const handleGeocode = async () => {
    const addr = [form.country, form.city, form.address].filter(Boolean).join(' ');
    if (!addr.trim()) { setGeoError('请先填写国家、城市和地址'); return; }
    setGeocoding(true);
    setGeoError('');
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (data.lon && data.lat) {
        setForm(prev => ({ ...prev, longitude: data.lon, latitude: data.lat }));
      } else {
        // 后端代理不通，降级为打开 Google Maps 手动查坐标
        window.open(`https://www.google.com/maps/search/${encodeURIComponent(addr)}`, '_blank');
      }
    } catch (e) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(addr)}`, '_blank');
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadSites();
    fetch('/api/battery-types').then(res => res.json()).then(data => {
      setBatteryTypes(data.battery_types || []);
    }).catch(() => {});
    fetch('/api/admin/site-types', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => {
      setSiteTypes(data.site_types || []);
    }).catch(() => {});
    fetch('/api/admin/swap-stations', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => {
      setSwapTemplates(data.templates || []);
    }).catch(() => {});
  }, [user]);

  const loadSites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/operation-sites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAddForm = () => { setIsEditing(false); setEditingId(null); setForm(DEFAULT_FORM); setFile(DEFAULT_FILE); setPreviewUrl(''); setShowForm(true); };
  const openEditForm = (s) => {
    setIsEditing(true); setEditingId(s.id);
    setFile(DEFAULT_FILE);
    setPreviewUrl(s.image_url || '');
    const parseI18nOs = (v, fallback) => {
      if (v && typeof v === 'object') { const f = { ...EMPTY_I18N }; for (const l of LANGUAGES) { if (v[l.code]) f[l.code] = v[l.code]; } return f; }
      const e = { ...EMPTY_I18N }; if (fallback) e['zh-CN'] = fallback; return e;
    };
    setSelectedLang('zh-CN');
    setForm({
      name: s.name || '', name_i18n: parseI18nOs(s.name_i18n, s.name),
      country: s.country || '', country_i18n: parseI18nOs(s.country_i18n, s.country),
      city: s.city || '', city_i18n: parseI18nOs(s.city_i18n, s.city),
      address: s.address || '', longitude: s.longitude != null ? String(s.longitude) : '',
      latitude: s.latitude != null ? String(s.latitude) : '',
      battery_count: s.battery_count != null ? String(s.battery_count) : '',
      status: s.status || '运营中', site_type: s.site_type || '',
      site_code: s.site_code || '', contact: s.contact || '', description: s.description || '',
      battery_type: s.battery_type || '', cabinet_slots: s.cabinet_slots != null ? String(s.cabinet_slots) : '',
      template_id: s.template_id || '',
      image_url: s.image_url || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.country.trim() || !form.city.trim() || !form.battery_count) {
      alert('请填写必填项：名称、国家、城市、电池数量');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `/api/admin/operation-sites/${editingId}` : '/api/admin/operation-sites';
      const method = isEditing ? 'PUT' : 'POST';

      const buildI18nOs = (obj) => { const r = {}; let h = false; for (const l of LANGUAGES) { if (obj[l.code]?.trim()) { r[l.code] = obj[l.code].trim(); h = true; } } return h ? r : null; };

      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('name_i18n', JSON.stringify(buildI18nOs(form.name_i18n || {}) || {}));
      fd.append('country', form.country);
      fd.append('country_i18n', JSON.stringify(buildI18nOs(form.country_i18n || {}) || {}));
      fd.append('city', form.city);
      fd.append('city_i18n', JSON.stringify(buildI18nOs(form.city_i18n || {}) || {}));
      fd.append('address', form.address);
      fd.append('longitude', form.longitude);
      fd.append('latitude', form.latitude);
      fd.append('battery_count', form.battery_count);
      fd.append('status', form.status);
      fd.append('site_type', form.site_type);
      if (isEditing && form.site_code) {
        fd.append('site_code', form.site_code);
      }
      fd.append('contact', form.contact);
      fd.append('description', form.description);
      fd.append('battery_type', form.battery_type);
      fd.append('cabinet_slots', form.cabinet_slots);
      if (form.template_id) {
        fd.append('template_id', form.template_id);
      }
      if (file) {
        fd.append('image', file);
      } else if (isEditing && !file && form.image_url) {
        // 编辑模式未换图时保留原有 image_url
        fd.append('keep_image_url', form.image_url);
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '操作失败');
      }
      setShowForm(false);
      await loadSites();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/operation-sites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('删除失败');
      setDeleteConfirm(null);
      await loadSites();
    } catch (err) { alert(err.message || '删除失败'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => router.push('/admin')} className="p-1.5 rounded-lg hover:bg-white/10 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">{t('adminOs.title')}</h1>
          </div>
          <p className="text-gray-400 text-sm">全球运营网络 · 首页地图数据管理</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" /><span>共 {sites.length} 个站点</span>
          </div>
          <button onClick={openAddForm}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增站点
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-center p-3 w-16">站点编码</th>
                  <th className="text-left p-3 w-10">#</th>
                  <th className="text-left p-3 min-w-[180px]">{t('adminOs.siteName')}</th>
                  <th className="text-left p-3">国家</th>
                  <th className="text-left p-3">城市</th>
                  <th className="text-center p-3">电池数</th>
                  <th className="text-center p-3">电池类型</th>
                  <th className="text-center p-3">站点类型</th>
                  <th className="text-center p-3">仓数</th>
                  <th className="text-center p-3">状态</th>
                  <th className="text-center p-3">图片</th>
                  <th className="text-center p-3 w-24">{t('adminOs.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, idx) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-center text-gray-500 text-xs font-mono">{s.site_code || '-'}</td>
                    <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-xs">{s.name_i18n?.[i18n.language] || s.name_i18n?.['zh-CN'] || s.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 text-xs">{s.country_i18n?.[i18n.language] || s.country_i18n?.['zh-CN'] || s.country}</td>
                    <td className="p-3 text-gray-600 text-xs">{s.city_i18n?.[i18n.language] || s.city_i18n?.['zh-CN'] || s.city}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-green-500" />
                        <span className="font-semibold text-xs">{s.battery_count}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-xs">
                      {s.battery_type ? (() => {
                          const bt = batteryTypes.find(b => b.name === s.battery_type);
                          const display = bt ? (bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name) : s.battery_type;
                          return <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{display}</span>;
                        })() : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-3 text-center text-gray-500 text-xs">
                      {s.site_type ? (() => { const st = siteTypes.find(t => t.name === s.site_type); return st ? (st.name_i18n?.[i18n.language] || st.name_i18n?.['zh-CN'] || st.name) : s.site_type; })() : '-'}
                    </td>
                    <td className="p-3 text-center text-gray-500 text-xs">
                      {['4820', '6035', '7250', '72100'].some(p => s.battery_type?.startsWith(p)) && s.cabinet_slots != null ? s.cabinet_slots : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        s.status === '运营中' ? 'bg-green-100 text-green-700' :
                        s.status === '建设中' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{s.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {s.image_url ? (
                        <Image src={s.image_url} alt={s.name} width={32} height={32} className="object-cover rounded border mx-auto" loading="lazy" />
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => openEditForm(s)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition" title="编辑"><Edit className="h-3 w-3" /></button>
                        <button onClick={() => setDeleteConfirm(s)} className="text-red-500 hover:bg-red-50 p-1 rounded transition" title="删除"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sites.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500 mb-1">{t('adminOs.noSites')}</p>
              <button onClick={openAddForm} className="text-blue-600 hover:underline text-sm font-medium">点击新增第一个站点</button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditing ? '编辑运营站点' : '新增运营站点'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">站点名称 *</label>
                    <div className="flex gap-1 mb-2">
                      {LANGUAGES.map(lang => (
                        <button type="button" key={lang.code}
                          onClick={() => setSelectedLang(lang.code)}
                          className={`px-2 py-0.5 text-xs rounded-full transition ${selectedLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={form.name_i18n?.[selectedLang] || ''}
                      onChange={e => setForm({ ...form, name_i18n: { ...form.name_i18n, [selectedLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`站点名称（${LANGUAGES.find(l=>l.code===selectedLang)?.label}）`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">国家 *</label>
                    <div className="flex gap-1 mb-2">
                      {LANGUAGES.map(lang => (
                        <button type="button" key={lang.code}
                          onClick={() => setSelectedLang(lang.code)}
                          className={`px-2 py-0.5 text-xs rounded-full transition ${selectedLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={form.country_i18n?.[selectedLang] || ''}
                      onChange={e => setForm({ ...form, country_i18n: { ...form.country_i18n, [selectedLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`国家（${LANGUAGES.find(l=>l.code===selectedLang)?.label}）`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">城市 *</label>
                    <div className="flex gap-1 mb-2">
                      {LANGUAGES.map(lang => (
                        <button type="button" key={lang.code}
                          onClick={() => setSelectedLang(lang.code)}
                          className={`px-2 py-0.5 text-xs rounded-full transition ${selectedLang === lang.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={form.city_i18n?.[selectedLang] || ''}
                      onChange={e => setForm({ ...form, city_i18n: { ...form.city_i18n, [selectedLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`城市（${LANGUAGES.find(l=>l.code===selectedLang)?.label}）`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电池数量 *</label>
                    <input type="number" min="0" value={form.battery_count} onChange={e => setForm({ ...form, battery_count: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 86" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">经度 (自动生成)</label>
                    <input type="text" value={form.longitude} disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" placeholder="地址解析后自动填充" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">纬度 (自动生成)</label>
                    <input type="text" value={form.latitude} disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" placeholder="地址解析后自动填充" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">电池类型</label>
                    <select value={form.battery_type} onChange={e => setForm({ ...form, battery_type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="">请选择</option>
                      {batteryTypes.map(bt => (
                        <option key={bt.id} value={bt.name}>{bt.name_i18n?.[i18n.language] || bt.name_i18n?.['zh-CN'] || bt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">运营状态</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="运营中">{t('adminOs.operational')}</option>
                      <option value="建设中">建设中</option>
                      <option value="已暂停">已暂停</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">站点图片</label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setFile(f);
                            setPreviewUrl(URL.createObjectURL(f));
                          }
                        }}
                        className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" />
                      {previewUrl && (
                        <img src={previewUrl} alt="预览" className="h-10 w-10 object-cover rounded border" />
                      )}
                    </div>
                    {file && <p className="text-xs text-gray-400 mt-1">已选择: {file.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">站点类型</label>
                    <select value={form.site_type} onChange={e => setForm({ ...form, site_type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="">请选择</option>
                      {siteTypes.map(st => (
                        <option key={st.id} value={st.name}>{st.name_i18n?.[i18n.language] || st.name_i18n?.['zh-CN'] || st.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">站点编码</label>
                    {isEditing ? (
                      <input type="text" value={form.site_code || ''} disabled
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 font-mono" />
                    ) : (
                      <p className="text-xs text-gray-400 mt-1.5">保存后自动生成</p>
                    )}
                  </div>
                  {(['4820', '6035', '7250', '72100'].some(p => form.battery_type?.startsWith(p)) || form.site_type?.includes('swap') || form.site_type?.includes('换电')) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">换电柜仓数</label>
                    {swapTemplates.length > 0 && (form.site_type?.includes('swap') || form.site_type?.includes('换电')) ? (
                      <select value={form.template_id}
                        onChange={e => {
                          const tid = e.target.value;
                          const tmpl = swapTemplates.find(t => t.id === tid);
                          setForm({
                            ...form,
                            template_id: tid,
                            cabinet_slots: tmpl ? String(tmpl.cabinet_count) : form.cabinet_slots
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                        <option value="">自定义</option>
                        {swapTemplates.map(tmpl => (
                          <option key={tmpl.id} value={tmpl.id}>
                            {tmpl.name}（{tmpl.cabinet_count}仓）
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="number" min="0" value={form.cabinet_slots} onChange={e => setForm({ ...form, cabinet_slots: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 12" />
                    )}
                  </div>
                  )}
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">具体地址</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 No. 128, Monivong Blvd" />
                      <button type="button" onClick={handleGeocode} disabled={geocoding}
                        className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
                        {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                        地址解析
                      </button>
                    </div>
                    {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminOs.phone')}</label>
                    <input type="text" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 +855 23 456 7890" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">描述</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder="站点介绍（可选）" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditing ? '保存修改' : '创建站点'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              <div><h3 className="text-lg font-bold">{t('adminOs.confirmDelete')}</h3><p className="text-sm text-gray-500">此操作不可撤销</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-2">确定删除站点 <span className="font-semibold">"{deleteConfirm.name}"</span>？</p>
            <p className="text-xs text-gray-400 mb-6">该站点将从数据库中永久删除。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">{t('adminOs.confirmDelete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
