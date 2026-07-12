'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Loader2, ArrowLeft, AlertCircle, BatteryCharging } from 'lucide-react';
import { formatCurrency, localeCurrency, fetchRates } from '../../../lib/currency';

const DEFAULT_FORM = {
  name: '', cabinet_count: '6', price: '', monthly_rent: '', annual_roi: '',
  gps_lat: '', gps_lng: '', image_url: ''
};

export default function SwapStationsPage() {
  const { t, i18n } = useTranslation();
  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    fetchRates();
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/swap-stations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setIsEditing(false); setEditingId(null);
    setForm(DEFAULT_FORM); setFile(null); setPreviewUrl('');
    setShowForm(true);
  };

  const openEdit = (tmpl) => {
    setIsEditing(true); setEditingId(tmpl.id);
    setFile(null); setPreviewUrl(tmpl.image_url || '');
    setForm({
      name: tmpl.name || '',
      cabinet_count: String(tmpl.cabinet_count || ''),
      price: tmpl.price != null ? String(tmpl.price) : '',
      monthly_rent: tmpl.monthly_rent != null ? String(tmpl.monthly_rent) : '',
      annual_roi: tmpl.annual_roi != null ? String(tmpl.annual_roi) : '',
      gps_lat: tmpl.gps_lat != null ? String(tmpl.gps_lat) : '',
      gps_lng: tmpl.gps_lng != null ? String(tmpl.gps_lng) : '',
      image_url: tmpl.image_url || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cabinet_count || !form.price) {
      alert(t('adminSw.fillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `/api/admin/swap-stations/${editingId}` : '/api/admin/swap-stations';
      const method = isEditing ? 'PUT' : 'POST';

      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('cabinet_count', form.cabinet_count);
      fd.append('price', form.price);
      fd.append('monthly_rent', form.monthly_rent || '0');
      fd.append('annual_roi', form.annual_roi || '0');
      fd.append('gps_lat', form.gps_lat);
      fd.append('gps_lng', form.gps_lng);
      if (file) {
        fd.append('image', file);
      } else if (isEditing && !file && form.image_url) {
        fd.append('keep_image_url', form.image_url);
      }

      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error((await res.json()).error || t('common.operationFailed'));
      setShowForm(false);
      await loadTemplates();
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/swap-stations/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(t('common.operationFailed'));
      setDeleteConfirm(null);
      await loadTemplates();
    } catch (err) { alert(err.message); }
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
            <h1 className="text-2xl font-bold">{t('adminSw.title')}</h1>
          </div>
          <p className="text-gray-400 text-sm">{t('adminSw.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BatteryCharging className="h-4 w-4" />
            <span>{t('adminSw.totalTemplates', { count: templates.length })}</span>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />{t('adminSw.addTemplate')}
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 w-10">#</th>
                  <th className="text-left p-3 min-w-[180px]">{t('adminSw.name')}</th>
                  <th className="text-center p-3">{t('adminSw.cabinetCount')}</th>
                  <th className="text-right p-3">{t('adminSw.price')}</th>
                  <th className="text-right p-3">{t('adminSw.monthlyRent')}</th>
                  <th className="text-right p-3">{t('adminSw.annualRoi')}</th>
                  <th className="text-center p-3">{t('adminSw.image')}</th>
                  <th className="text-center p-3">{t('adminSw.gps')}</th>
                  <th className="text-center p-3 w-24">{t('adminOs.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tmpl, idx) => (
                  <tr key={tmpl.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="p-3 font-medium text-gray-900 text-sm">{tmpl.name}</td>
                    <td className="p-3 text-center font-semibold text-sm">{tmpl.cabinet_count}</td>
                    <td className="p-3 text-right font-mono text-sm">${Number(tmpl.price).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-sm">${Number(tmpl.monthly_rent).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-sm">{Number(tmpl.annual_roi)}%</td>
                    <td className="p-3 text-center">
                      {tmpl.image_url ? (
                        <img src={tmpl.image_url} alt={tmpl.name} className="h-8 w-8 object-cover rounded border mx-auto" />
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="p-3 text-center text-xs text-gray-400">
                      {tmpl.gps_lat != null && tmpl.gps_lng != null
                        ? `${Number(tmpl.gps_lat).toFixed(4)}, ${Number(tmpl.gps_lng).toFixed(4)}`
                        : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => openEdit(tmpl)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition"><Edit className="h-3 w-3" /></button>
                        <button onClick={() => setDeleteConfirm(tmpl)} className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {templates.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <BatteryCharging className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500 mb-1">{t('adminSw.noTemplates')}</p>
              <button onClick={openAdd} className="text-blue-600 hover:underline text-sm font-medium">{t('adminSw.addFirstTemplate')}</button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">{isEditing ? t('adminSw.editTemplate') : t('adminSw.addTemplate')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.name')} *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={t('adminSw.namePlaceholder')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.cabinetCount')} *</label>
                    <input type="number" min="1" value={form.cabinet_count}
                      onChange={e => setForm({ ...form, cabinet_count: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.price')} (USD) *</label>
                    <input type="number" min="0" step="0.01" value={form.price}
                      onChange={e => {
                        const p = e.target.value;
                        const mr = form.monthly_rent;
                        const priceVal = parseFloat(p) || 0;
                        const rentVal = parseFloat(mr) || 0;
                        const roi = priceVal > 0 && rentVal > 0 ? ((rentVal * 12 / priceVal) * 100).toFixed(1) : form.annual_roi;
                        setForm({ ...form, price: p, annual_roi: roi });
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.monthlyRent')} (USD)</label>
                    <input type="number" min="0" step="0.01" value={form.monthly_rent}
                      onChange={e => setForm({ ...form, monthly_rent: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.annualRoi')} (%)</label>
                    <input type="number" min="0" step="0.1" value={form.annual_roi}
                      onChange={e => setForm({ ...form, annual_roi: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.gpsLat')}</label>
                    <input type="number" step="any" value={form.gps_lat}
                      onChange={e => setForm({ ...form, gps_lat: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.gpsLng')}</label>
                    <input type="number" step="any" value={form.gps_lng}
                      onChange={e => setForm({ ...form, gps_lng: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminSw.image')}</label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                      }}
                      className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" />
                    {previewUrl && <img src={previewUrl} alt="" className="h-10 w-10 object-cover rounded border" />}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEditing ? t('adminSw.save') : t('adminSw.create')}
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
              <div><h3 className="text-lg font-bold">{t('adminSw.confirmDelete')}</h3><p className="text-sm text-gray-500">{t('adminSw.irreversible')}</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{t('adminSw.confirmDeleteMsg', { name: deleteConfirm.name })}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">{t('adminSw.confirmDelete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
