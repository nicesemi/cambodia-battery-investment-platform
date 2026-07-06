'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { adminAPI } from '../../../services/api';
import { useRouter } from 'next/navigation';
import { Battery, Plus, Edit, Trash2, Loader2, ArrowLeft, Zap, AlertCircle, Upload, X } from 'lucide-react';
import { formatCurrency, localeCurrency, fetchRates } from '../../../lib/currency';

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
  voltage: '', capacity: '', chemistry: '',
  description: '', description_i18n: { ...EMPTY_I18N },
  scenario: '', scenario_i18n: { ...EMPTY_I18N },
  dimensions: '', net_weight: '', power_kwh: '', unit_price: '',
  monthly_rent: '',
  image_url: '', thumbnail_url: '', is_active: true, sort_order: 0
};

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function BatteryTypesPage() {
  const { t, i18n } = useTranslation();

  // 拉取实时汇率
  useEffect(() => { fetchRates(); }, []);

  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedLang, setSelectedLang] = useState('zh-CN');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadTypes();
  }, [user]);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getBatteryTypes();
      setTypes(data.battery_types || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAddForm = () => { setIsEditing(false); setEditingId(null); setForm(DEFAULT_FORM); setSelectedLang('zh-CN'); setUploadFile(null); setUploadPreview(''); setShowForm(true); };
  const openEditForm = (t) => {
    setIsEditing(true); setEditingId(t.id);
    setSelectedLang('zh-CN');
    // 从 name_i18n / description_i18n / scenario_i18n 解析多语言值
    const parseI18n = (i18nVal) => {
      if (i18nVal && typeof i18nVal === 'object') {
        const filled = { ...EMPTY_I18N };
        for (const lang of LANGUAGES) {
          if (i18nVal[lang.code]) filled[lang.code] = i18nVal[lang.code];
        }
        return filled;
      }
      return { ...EMPTY_I18N };
    };
    const nameI18n = parseI18n(t.name_i18n);
    const descI18n = parseI18n(t.description_i18n);
    const scenarioI18n = parseI18n(t.scenario_i18n);
    // 如果无 i18n 数据但 name 字段有值，回填到 zh-CN
    if (!t.name_i18n && t.name) nameI18n['zh-CN'] = t.name;
    if (!t.description_i18n && t.description) descI18n['zh-CN'] = t.description;
    if (!t.scenario_i18n && t.scenario) scenarioI18n['zh-CN'] = t.scenario;

    setForm({
      name: t.name || '', name_i18n: nameI18n,
      voltage: t.voltage || '', capacity: t.capacity || '',
      chemistry: t.chemistry || '',
      description: t.description || '', description_i18n: descI18n,
      scenario: t.scenario || '', scenario_i18n: scenarioI18n,
      dimensions: t.dimensions || '',
      net_weight: t.net_weight || '', power_kwh: t.power_kwh || '', unit_price: t.unit_price || '',
      monthly_rent: t.monthly_rent != null ? String(t.monthly_rent) : '',
      image_url: t.image_url || '', thumbnail_url: t.thumbnail_url || '',
      is_active: t.is_active !== undefined ? t.is_active : true, sort_order: t.sort_order || 0
    });
    setUploadFile(null);
    setUploadPreview(t.image_url || '');
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { alert('仅支持 PNG / JPEG / WebP / GIF 格式'); return; }
    if (file.size > MAX_IMAGE_SIZE) { alert('图片大小不能超过 10MB'); return; }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setUploadFile(null);
    setUploadPreview('');
    setForm({ ...form, image_url: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name_i18n['zh-CN']?.trim() && !form.name.trim()) { alert('请输入电池类型名称（至少简体中文）'); return; }
    setSubmitting(true);
    try {
      let imageUrl = form.image_url;
      let thumbnailUrl = form.thumbnail_url;
      if (uploadFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '图片上传失败');
        }
        const { url, thumbnail_url } = await res.json();
        imageUrl = url;
        thumbnailUrl = thumbnail_url || '';
        setUploading(false);
      }
      // 构建 i18n 字段，仅保留有值的语种
      const buildI18n = (i18nObj) => {
        const result = {};
        let hasValue = false;
        for (const lang of LANGUAGES) {
          if (i18nObj[lang.code]?.trim()) {
            result[lang.code] = i18nObj[lang.code].trim();
            hasValue = true;
          }
        }
        return hasValue ? result : null;
      };
      const payload = {
        ...form,
        name_i18n: buildI18n(form.name_i18n),
        description_i18n: buildI18n(form.description_i18n),
        scenario_i18n: buildI18n(form.scenario_i18n),
        image_url: imageUrl, thumbnail_url: thumbnailUrl
      };
      if (isEditing) { await adminAPI.updateBatteryType(editingId, payload); }
      else { await adminAPI.createBatteryType(payload); }
      setShowForm(false);
      await loadTypes();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setSubmitting(false); setUploading(false); }
  };

  const handleDelete = async (id) => {
    try { await adminAPI.deleteBatteryType(id); setDeleteConfirm(null); await loadTypes(); }
    catch (err) { alert(err.message || '删除失败'); }
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
            <h1 className="text-2xl font-bold">电池类型维护</h1>
          </div>
          <p className="text-gray-400 text-sm">全场景电池统一总表 · 磷酸铁锂电芯 · 2026工厂批量含税出厂价</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Battery className="h-4 w-4" /><span>共 {types.length} 种电池类型</span>
          </div>
          <button onClick={openAddForm}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增类型
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 w-10">#</th>
                  <th className="text-left p-3 min-w-[180px]">产品型号</th>
                  <th className="text-left p-3">{t('adminBt.voltage')}</th>
                  <th className="text-left p-3">{t('adminBt.capacity')}</th>
                  <th className="text-left p-3">电量</th>
                  <th className="text-left p-3 min-w-[140px]">适用场景</th>
                  <th className="text-left p-3">外形尺寸</th>
                  <th className="text-left p-3">净重</th>
                  <th className="text-right p-3">出厂单价（USD）</th>
                  <th className="text-right p-3">月租金（USD）</th>
                  <th className="text-center p-3">年化收益率</th>
                  <th className="text-center p-3 w-24">{t('adminBt.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t, idx) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-xs">{t.name_i18n?.[i18n.language] || t.name_i18n?.['zh-CN'] || t.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 text-xs">{t.voltage || '—'}</td>
                    <td className="p-3 text-gray-600 text-xs">{t.capacity || '—'}</td>
                    <td className="p-3 text-gray-600 text-xs">{t.power_kwh || '—'}</td>
                    <td className="p-3 text-gray-500 text-xs max-w-[160px] truncate" title={t.scenario_i18n?.[i18n.language] || t.scenario_i18n?.['zh-CN'] || t.scenario}>{t.scenario_i18n?.[i18n.language] || t.scenario_i18n?.['zh-CN'] || t.scenario || '—'}</td>
                    <td className="p-3 text-gray-500 text-xs font-mono">{t.dimensions || '—'}</td>
                    <td className="p-3 text-gray-600 text-xs">{t.net_weight || '—'}</td>
                    <td className="p-3 text-right text-gray-900 font-medium text-xs">{t.unit_price ? (() => { const dc = localeCurrency(Number(t.unit_price), i18n.language); return <><div className="font-semibold">{dc.primary}</div></>; })() : '—'}</td>
                    <td className="p-3 text-right text-xs">{t.monthly_rent != null && t.monthly_rent !== '' ? (() => { const dc = localeCurrency(Number(t.monthly_rent), i18n.language); return <><div className="text-gray-700 font-semibold">{dc.primary} /月</div></>; })() : '—'}</td>
                    <td className="p-3 text-center text-xs font-semibold text-blue-600">{t.annualized_return != null ? `${t.annualized_return}%` : '—'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => openEditForm(t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition" title="编辑"><Edit className="h-3 w-3" /></button>
                        <button onClick={() => setDeleteConfirm(t)} className="text-red-500 hover:bg-red-50 p-1 rounded transition" title="删除"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {types.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Battery className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500 mb-1">{t('adminBt.noTypes')}</p>
              <button onClick={openAddForm} className="text-blue-600 hover:underline text-sm font-medium">点击新增第一个电池类型</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditing ? '编辑电池类型' : '新增电池类型'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">产品型号 * ({LANGUAGES.find(l => l.code === selectedLang)?.label})</label>
                    <div className="flex gap-1 mb-2">
                      {LANGUAGES.map(lang => (
                        <button key={lang.code} type="button"
                          onClick={() => setSelectedLang(lang.code)}
                          className={`px-2.5 py-1 text-xs rounded-md transition ${selectedLang === lang.code ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={form.name_i18n[selectedLang]} onChange={e => setForm({ ...form, name_i18n: { ...form.name_i18n, [selectedLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`${LANGUAGES.find(l => l.code === selectedLang)?.label} — 如 7250 高速电摩换电`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">标称电压</label>
                    <input type="text" value={form.voltage} onChange={e => setForm({ ...form, voltage: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 76.8V" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminBt.capacity')}</label>
                    <input type="text" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 50Ah" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">化学体系</label>
                    <select value={form.chemistry} onChange={e => setForm({ ...form, chemistry: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="">请选择</option>
                      <option value="磷酸铁锂">磷酸铁锂</option>
                      <option value="三元锂">三元锂</option>
                      <option value="锰酸锂">锰酸锂</option>
                      <option value="钛酸锂">钛酸锂</option>
                      <option value="固态电池">固态电池</option>
                      <option value="铅酸">铅酸</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">单台电量</label>
                    <input type="text" value={form.power_kwh} onChange={e => setForm({ ...form, power_kwh: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 3.84kWh" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">外形尺寸 (mm)</label>
                    <input type="text" value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 360×230×200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">净重</label>
                    <input type="text" value={form.net_weight} onChange={e => setForm({ ...form, net_weight: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 29kg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">出厂单价（USD）</label>
                    <input type="text" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 $828" />
                    {form.unit_price && !isNaN(Number(form.unit_price)) && (
                      <p className="text-xs text-gray-400 mt-1">≈ {formatCurrency(Number(form.unit_price), 'zh-CN')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">月租（$/月）</label>
                    <input type="number" min="0" step="0.01" value={form.monthly_rent} onChange={e => setForm({ ...form, monthly_rent: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如 85" />
                    {form.monthly_rent && !isNaN(Number(form.monthly_rent)) && (
                      <p className="text-xs text-gray-400 mt-1">≈ {formatCurrency(Number(form.monthly_rent), 'zh-CN')} /月</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">排序</label>
                    <input type="number" min="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">照片</label>
                    {!uploadPreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition group">
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition" />
                          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition">点击上传电池照片</span>
                          <span className="text-[10px] text-gray-300">PNG / JPEG / WebP / GIF, 不超过 10MB</span>
                        </div>
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                      </label>
                    ) : (
                      <div className="relative inline-block group">
                        <img src={uploadPreview} alt="预览" className="h-32 w-auto rounded-lg border object-cover" />
                        <button type="button" onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {form.image_url && !uploadFile && !uploadPreview && (
                      <p className="text-[10px] text-gray-400 mt-1">当前: {form.image_url}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">适用场景 ({LANGUAGES.find(l => l.code === selectedLang)?.label})</label>
                    <input type="text" value={form.scenario_i18n[selectedLang]} onChange={e => setForm({ ...form, scenario_i18n: { ...form.scenario_i18n, [selectedLang]: e.target.value } })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`${LANGUAGES.find(l => l.code === selectedLang)?.label} — 如 单块：72V两轮电摩、山区爬坡`} />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">描述 ({LANGUAGES.find(l => l.code === selectedLang)?.label})</label>
                    <textarea value={form.description_i18n[selectedLang]} onChange={e => setForm({ ...form, description_i18n: { ...form.description_i18n, [selectedLang]: e.target.value } })}
                      rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder={`${LANGUAGES.find(l => l.code === selectedLang)?.label} — 补充说明（可选）`} />
                  </div>
                  <div className="col-span-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600">启用该电池类型</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditing ? '保存修改' : '创建类型'}
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
              <div><h3 className="text-lg font-bold">确认删除</h3><p className="text-sm text-gray-500">此操作不可撤销</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-2">确定删除 <span className="font-semibold">"{deleteConfirm.name}"</span>？</p>
            <p className="text-xs text-gray-400 mb-6">已使用该类型的资产仍会保留原有类型值。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
