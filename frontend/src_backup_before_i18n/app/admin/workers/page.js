'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { Users, Plus, Loader2, X, Edit2, Trash2, User, Phone, Camera, FileText } from 'lucide-react';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', age: '', id_number: '', phone: '', photo_url: '' });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getWorkers();
      setWorkers(data || []);
    } catch (e) {
      console.error('Failed to load workers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  const openCreate = () => {
    setForm({ id: '', name: '', age: '', id_number: '', phone: '', photo_url: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (w) => {
    setForm({ id: w.id, name: w.name || '', age: w.age || '', id_number: w.id_number || '', phone: w.phone || '', photo_url: w.photo_url || '' });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.id_number || !form.phone) return;
    setSubmitting(true);
    try {
      if (isEditing) {
        await adminAPI.updateWorker(form.id, form);
      } else {
        await adminAPI.createWorker(form);
      }
      setShowForm(false);
      await fetchWorkers();
    } catch (e) {
      console.error('Failed to save worker', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除该工人吗？')) return;
    try {
      await adminAPI.deleteWorker(id);
      await fetchWorkers();
    } catch (e) {
      console.error('Failed to delete worker', e);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 使用 FileReader 转 base64 存储
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, photo_url: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> 工人信息维护
          </h2>
          <p className="text-gray-500 text-sm mt-1">管理派工人员的联系方式与证件信息</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />新增工人
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg">暂无工人信息</p>
          <p className="text-sm mt-1">点击"新增工人"添加派工人员</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">工人编号</th>
                <th className="text-left p-4">照片</th>
                <th className="text-left p-4">姓名</th>
                <th className="text-left p-4">年龄</th>
                <th className="text-left p-4">证件号</th>
                <th className="text-left p-4">手机号</th>
                <th className="text-right p-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs text-blue-600">{w.worker_code || '-'}</td>
                  <td className="p-4">
                    {w.photo_url ? (
                      <img src={w.photo_url} alt={w.name} className="w-10 h-10 rounded-full object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">{w.name}</td>
                  <td className="p-4 text-gray-600">{w.age || '-'}</td>
                  <td className="p-4 text-gray-600">{w.id_number}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />{w.phone}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(w)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(w.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑 Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">{isEditing ? '编辑工人' : '新增工人'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 照片 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">照片</label>
                <div className="flex items-center gap-3">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="preview" className="w-16 h-16 rounded-full object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border">
                      <Camera className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-200 transition">
                    上传照片
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  {form.photo_url && (
                    <button type="button" onClick={() => setForm({ ...form, photo_url: '' })}
                      className="text-xs text-red-500 hover:text-red-700">移除</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">姓名 *</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full text-sm outline-none" placeholder="工人姓名" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">年龄</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="年龄" min="16" max="80" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">证件号 *</label>
                <input type="text" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="身份证/护照号" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">手机号 *</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full text-sm outline-none" placeholder="+855-xxx" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5">
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEditing ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
