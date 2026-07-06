'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { adminAPI } from '../../../services/api';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Loader2, ArrowLeft, Building2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'km', label: 'ខ្មែរ' },
];
const EMPTY_I18N = { 'zh-CN': '', 'zh-TW': '', 'en': '', 'bn': '', 'km': '' };

export default function SiteTypesPage() {
  const { i18n } = useTranslation();
  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [siteTypes, setSiteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', name_i18n: { ...EMPTY_I18N } });
  const [selectedLang, setSelectedLang] = useState('zh-CN');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadSiteTypes();
  }, [user]);

  const loadSiteTypes = async () => {
    setLoading(true);
    try { const r = await adminAPI.getSiteTypes(); setSiteTypes(r.site_types || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setIsEditing(false); setForm({ id: '', name: '', name_i18n: { ...EMPTY_I18N } }); setSelectedLang('zh-CN'); setShowForm(true); };

  const openEdit = (st) => {
    setIsEditing(true);
    setSelectedLang('zh-CN');
    const parse = (v) => {
      if (v && typeof v === 'object') { const f = { ...EMPTY_I18N }; for (const l of LANGUAGES) { if (v[l.code]) f[l.code] = v[l.code]; } return f; }
      const e = { ...EMPTY_I18N }; if (st.name) e['zh-CN'] = st.name; return e;
    };
    setForm({ id: st.id, name: st.name, name_i18n: parse(st.name_i18n) });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('请输入编码名称'); return; }
    if (!form.name_i18n['zh-CN']?.trim()) { alert('至少填写简体中文名称'); return; }
    setSubmitting(true);
    try {
      const build = (obj) => { const r = {}; let h = false; for (const l of LANGUAGES) { if (obj[l.code]?.trim()) { r[l.code] = obj[l.code].trim(); h = true; } } return h ? r : null; };
      const payload = { name: form.name.trim(), name_i18n: build(form.name_i18n) };
      if (isEditing) await adminAPI.updateSiteType(form.id, payload);
      else await adminAPI.createSiteType(payload);
      setShowForm(false);
      await loadSiteTypes();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try { await adminAPI.deleteSiteType(id); await loadSiteTypes(); }
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
            <h1 className="text-2xl font-bold">站点类型管理</h1>
          </div>
          <p className="text-gray-400 text-sm">运营站点分类维护 · 支持5语种名称</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-4 w-4" /><span>共 {siteTypes.length} 种站点类型</span>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />新增类型
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">编码名称</th>
                <th className="text-left p-4">显示名称</th>
                <th className="text-right p-4 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {siteTypes.map(st => (
                <tr key={st.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs text-blue-600">{st.name}</td>
                  <td className="p-4">{st.name_i18n?.[i18n.language] || st.name_i18n?.['zh-CN'] || st.name}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(st)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(st.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {siteTypes.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500 mb-1">暂无站点类型</p>
              <button onClick={openAdd} className="text-blue-600 hover:underline text-sm font-medium">点击新增第一个站点类型</button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">{isEditing ? '编辑站点类型' : '新增站点类型'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">编码名称 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  disabled={isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" placeholder="如 换电站" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">显示名称 <span className="text-red-500">*</span></label>
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
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={`${LANGUAGES.find(l=>l.code===selectedLang)?.label} 名称`} />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEditing ? '保存修改' : '创建类型'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
