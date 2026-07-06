'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, agentAPI } from '../../services/api';
import { useRouter } from 'next/navigation';
import {
  User, Store, Building2, ChevronRight, Mail, ShieldCheck,
  FileText, Upload, CheckCircle, Clock, AlertCircle, XCircle
} from 'lucide-react';

// ============ Helpers ============

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || '请求失败');
  return data;
}

// ============ Certification Status Badge ============

const STATUS_MAP = {
  unverified: { label: '待认证', color: 'bg-gray-100 text-gray-600' },
  email_verified: { label: '已邮箱认证', color: 'bg-blue-100 text-blue-700' },
  kyc_submitted: { label: '实名待审核', color: 'bg-orange-100 text-orange-700' },
  kyc_approved: { label: '已实名认证', color: 'bg-green-100 text-green-700' },
  kyc_rejected: { label: '实名被驳回', color: 'bg-red-100 text-red-700' },
  business_verified: { label: '已企业认证', color: 'bg-green-100 text-green-700' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.unverified;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${s.color}`}>
      {(status === 'kyc_approved' || status === 'business_verified') ? <CheckCircle size={14} /> :
       status === 'kyc_submitted' ? <Clock size={14} /> :
       status === 'kyc_rejected' ? <XCircle size={14} /> :
       status === 'email_verified' ? <Mail size={14} /> :
       <AlertCircle size={14} />}
      {s.label}
    </span>
  );
}

// ============ Step Indicator ============

function StepIndicator({ status, role }) {
  const isInvestor = role === 'investor';
  const isFranchisee = role === 'franchisee';

  const steps = [
    {
      key: 'email', label: '邮箱验证',
      done: ['email_verified', 'kyc_submitted', 'kyc_approved', 'kyc_rejected', 'business_verified'].includes(status),
      active: status === 'unverified',
    },
    ...(isInvestor ? [{
      key: 'kyc', label: '实名认证（投资者）', desc: '上传身份证正反面',
      done: ['kyc_approved'].includes(status),
      pending: status === 'kyc_submitted',
      failed: status === 'kyc_rejected',
      active: status === 'email_verified',
    }] : []),
    ...(isFranchisee ? [{
      key: 'kyc', label: '企业认证（加盟商）', desc: '上传营业执照',
      done: ['kyc_approved'].includes(status),
      pending: status === 'kyc_submitted',
      failed: status === 'kyc_rejected',
      active: status === 'email_verified',
    }] : []),
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.key} className="relative flex items-start pb-4 last:pb-0">
          {idx < steps.length - 1 && (
            <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${step.done ? 'bg-green-400' : step.failed ? 'bg-red-300' : 'bg-gray-200'}`} />
          )}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10
            ${step.done ? 'bg-green-500 text-white' :
              step.failed ? 'bg-red-500 text-white' :
              step.pending ? 'bg-orange-400 text-white' :
              step.active ? 'bg-blue-500 text-white' :
              'bg-gray-200 text-gray-400'}`}
          >
            {step.done ? <CheckCircle size={18} /> :
             step.failed ? <XCircle size={18} /> :
             step.pending ? <Clock size={18} /> :
             <span className="text-sm font-bold">{idx + 1}</span>}
          </div>
          <div className="ml-3 pt-1.5">
            <div className={`text-sm font-semibold ${step.done ? 'text-green-700' : step.failed ? 'text-red-700' : step.active ? 'text-blue-700' : 'text-gray-500'}`}>
              {step.label}
            </div>
            {step.desc && <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Email Verification Panel ============

function EmailVerification({ profile, onRefresh, onAuthRefresh }) {
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/auth/send-code', { method: 'POST' });
      setCountdown(60);
      setSuccess('验证码已发送，请查收邮件');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(0, 1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i];
    setCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('请输入完整的6位验证码');
      return;
    }
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ code: fullCode }),
      });
      setSuccess('邮箱验证成功！');
      setCode(['', '', '', '', '', '']);
      // 等待 profile 刷新完成，确保认证状态 UI 同步更新
      await onRefresh();
      // 同步刷新 AuthContext 中的全局 user 状态
      if (onAuthRefresh) await onAuthRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  if (profile?.email_verified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
        <div className="text-green-700 font-semibold">邮箱已认证</div>
        <div className="text-green-600 text-sm mt-1">{profile?.email}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSendCode}
        disabled={sending || countdown > 0}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors
          ${countdown > 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'bg-blue-600 text-white hover:bg-blue-700'}`}
      >
        {countdown > 0 ? `${countdown}秒后可重发` : sending ? '发送中...' : `点击发送验证码到 ${profile?.email}`}
      </button>

      {success && <div className="text-sm text-green-600 bg-green-50 rounded px-3 py-1.5">{success}</div>}
      {error && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-1.5">{error}</div>}

      <div>
        <div className="text-xs text-gray-500 mb-2">6位验证码</div>
        <div className="flex gap-2 justify-between">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleCodeChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              className="w-11 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg
                focus:border-blue-500 focus:outline-none transition-colors"
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleVerify}
        disabled={verifying || code.join('').length !== 6}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors
          ${code.join('').length !== 6 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'bg-green-600 text-white hover:bg-green-700'}`}
      >
        {verifying ? '验证中...' : '验证'}
      </button>
    </div>
  );
}

// ============ Image Upload Card ============

function UploadCard({ label, previewUrl, onUpload, uploading, accept = 'image/*' }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('只支持图片文件（JPG/PNG/WebP）');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">{label}</div>
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img src={previewUrl} alt={label} className="w-full max-h-64 object-contain bg-gray-100" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute top-2 right-2 bg-white/85 hover:bg-white rounded-full p-1.5 shadow transition-colors"
            title="重新上传"
          >
            <Upload size={14} className="text-gray-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">上传中...</span>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">
                拖拽文件到此处，或<span className="text-blue-600">点击选择</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">支持 JPG/PNG/WebP，最大 5MB</div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}

// ============ Document Upload Section ============

function DocumentUpload({ profile, onRefresh }) {
  const [uploading, setUploading] = useState({});
  const role = profile?.role;
  const emailVerified = profile?.email_verified;

  // 邮箱未验证时禁止上传证件
  if (!emailVerified) {
    const certLabel = role === 'investor' ? '实名认证 — 上传身份证' : '企业认证 — 上传营业执照';
    const certType = role === 'investor' ? '实名' : '企业';
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-gray-400" />
          {certLabel}
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-sm text-yellow-700 font-medium">请先验证邮箱后再进行{certType}认证</div>
          <div className="text-xs text-yellow-600 mt-1">完成邮箱验证后可解锁认证功能</div>
        </div>
      </div>
    );
  }

  const handleUpload = async (docType, file) => {
    setUploading(prev => ({ ...prev, [docType]: true }));
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);
    try {
      await apiFetch('/api/auth/upload-doc', {
        method: 'POST',
        body: formData,
      });
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  if (role === 'investor') {
    const isRejected = profile?.certification_status === 'kyc_rejected';
    const isSubmitted = profile?.certification_status === 'kyc_submitted';

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          实名认证 — 上传身份证
        </h3>
        {isRejected && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm text-red-700 flex items-center gap-2 font-medium">
              <XCircle size={16} />
              您的实名认证已被驳回
            </div>
            {profile?.rejection_reason && (
              <div className="text-sm text-red-600 mt-1.5">
                驳回意见：{profile.rejection_reason}
              </div>
            )}
            <div className="text-xs text-red-500 mt-1.5">请根据驳回意见修改后重新上传</div>
          </div>
        )}
        {isSubmitted && !isRejected && profile?.id_card_front_url && profile?.id_card_back_url && (
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 flex items-center gap-2">
            <Clock size={16} />
            您的实名认证资料已提交，正在审核中
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <UploadCard
            label="身份证正面（人像面）"
            previewUrl={profile?.id_card_front_url}
            uploading={uploading['id_card_front']}
            onUpload={file => handleUpload('id_card_front', file)}
          />
          <UploadCard
            label="身份证背面（国徽面）"
            previewUrl={profile?.id_card_back_url}
            uploading={uploading['id_card_back']}
            onUpload={file => handleUpload('id_card_back', file)}
          />
        </div>
      </div>
    );
  }

  if (role === 'franchisee') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          企业认证 — 上传营业执照
        </h3>
        <div className="max-w-md">
          <UploadCard
            label="营业执照"
            previewUrl={profile?.business_license_url}
            uploading={uploading['business_license']}
            onUpload={file => handleUpload('business_license', file)}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ============ Form Field ============

function FormField({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-shadow
          ${disabled ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' :
            'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
      />
    </div>
  );
}

// ============ Main Profile Page ============

export default function Profile() {
  const { user, logout, loadProfile: refreshAuthUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({ full_name: '', phone: '', country: '', language: '', username: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Email editing state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await authAPI.getProfile();
      const u = res.user;
      setProfile(u);
      setForm({
        full_name: u?.full_name || '',
        phone: u?.phone || '',
        country: u?.country || 'China',
        language: u?.language || 'zh',
        username: u?.username || '',
      });
      if (u?.role === 'investor') {
        try {
          const hierRes = await authAPI.getStoreHierarchy();
          setHierarchy(hierRes.bindings || []);
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!form.username || form.username.length < 2) {
      setFormError('用户名至少2个字符');
      return;
    }
    if (form.phone && !/^[\d\s\-\+()]{7,20}$/.test(form.phone)) {
      setFormError('手机号格式不正确');
      return;
    }
    setSaving(true);
    setFormError('');
    setFormSuccess('');
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setFormSuccess('个人资料更新成功');
      loadProfile();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setEmailError('');
    setEmailSuccess('');
    const email = newEmail.trim();
    if (!email) {
      setEmailError('请输入新邮箱地址');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('邮箱格式不正确');
      return;
    }
    if (email.toLowerCase() === (profile?.email || '').toLowerCase()) {
      setEmailError('新邮箱与当前邮箱相同');
      return;
    }
    setEmailSaving(true);
    try {
      const res = await apiFetch('/api/auth/update-email', {
        method: 'PUT',
        body: JSON.stringify({ email }),
      });
      setEmailSuccess(res.message || '邮箱修改成功');
      setIsEditingEmail(false);
      loadProfile();
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有字段');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setPasswordSuccess(res.message || '密码修改成功');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (e) {
      setPasswordError(e.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;
  }

  const status = profile?.certification_status || 'unverified';
  const role = profile?.role;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
        <StatusBadge status={status} />
      </div>

      {/* Three-column layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Certification Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            认证状态
          </h2>
          <StepIndicator status={status} role={role} />
          {status === 'unverified' && (
            <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              完成认证后可解锁投资、开店、加盟功能
            </div>
          )}
        </div>

        {/* MIDDLE: Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">个人信息</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">{profile?.full_name || profile?.username}</div>
                <div className="text-sm text-gray-500">{profile?.email}</div>
              </div>
            </div>

            <FormField label="全名" value={form.full_name} onChange={v => setForm(p => ({ ...p, full_name: v }))} />
            <FormField label="手机号" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} type="tel" placeholder="请输入手机号" />

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">国家/地区</label>
              <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="China">中国</option>
                <option value="Cambodia">柬埔寨</option>
                <option value="Thailand">泰国</option>
                <option value="Vietnam">越南</option>
                <option value="Laos">老挝</option>
                <option value="Myanmar">缅甸</option>
                <option value="Malaysia">马来西亚</option>
                <option value="Singapore">新加坡</option>
                <option value="Indonesia">印度尼西亚</option>
                <option value="Other">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">语言</label>
              <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="km">ភាសាខ្មែរ (高棉语)</option>
              </select>
            </div>

            <FormField label="用户名" value={form.username} onChange={v => setForm(p => ({ ...p, username: v }))} />

            {/* Email field: editable only when unverified */}
            {status === 'unverified' ? (
              isEditingEmail ? (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="请输入新邮箱"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button onClick={handleSaveEmail} disabled={emailSaving}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
                      {emailSaving ? '保存中' : '保存'}
                    </button>
                    <button onClick={() => { setIsEditingEmail(false); setNewEmail(''); setEmailError(''); }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                  </div>
                  {emailError && <div className="text-xs text-red-600 mt-1">{emailError}</div>}
                  {emailSuccess && <div className="text-xs text-green-600 mt-1">{emailSuccess}</div>}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-700 py-2">{profile?.email}</span>
                    <button onClick={() => { setIsEditingEmail(true); setNewEmail(profile?.email || ''); setEmailError(''); setEmailSuccess(''); }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline">
                      修改
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                <FormField label="邮箱" value={profile?.email || ''} onChange={() => {}} disabled />
                <div className="text-xs text-gray-400 mt-1">邮箱认证后不可修改</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">角色</label>
                <div className="text-sm text-gray-700 py-2">
                  {role === 'investor' ? '投资者' : role === 'franchisee' ? '加盟商' :
                   role === 'admin' ? '管理员' : role === 'operator' ? '操作员' : '用户'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">注册时间</label>
                <div className="text-sm text-gray-700 py-2">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
                </div>
              </div>
            </div>

            {formError && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{formError}</div>}
            {formSuccess && <div className="text-sm text-green-600 bg-green-50 rounded px-3 py-2">{formSuccess}</div>}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {saving ? '保存中...' : '保存修改'}
              </button>
              <button onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                修改密码
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Email Verification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">邮箱认证</h2>
          <EmailVerification profile={profile} onRefresh={loadProfile} onAuthRefresh={refreshAuthUser} />
        </div>
      </div>

      {/* Document Upload (full width) */}
      {(role === 'investor' || role === 'franchisee') && (
        <DocumentUpload profile={profile} onRefresh={loadProfile} />
      )}

      {/* Store Hierarchy (investor only) */}
      {hierarchy && hierarchy.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            所属门店层级
          </h3>
          {hierarchy.map((binding, idx) => (
            <div key={idx} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded">
                  <Store className="h-3.5 w-3.5 text-indigo-500" />
                  {binding.store?.store_code || binding.store?.name}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                <span className="font-medium text-gray-800">{binding.store?.name}</span>
                {binding.franchisee && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">加盟商:</span>
                    <span className="font-medium text-gray-800">{binding.franchisee.full_name || binding.franchisee.username}</span>
                  </>
                )}
                {binding.city_agent && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">市级代理:</span>
                    <span className="font-medium text-gray-800">{binding.city_agent.full_name || binding.city_agent.username}</span>
                  </>
                )}
                {binding.agent && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-gray-500">省级代理:</span>
                    <span className="font-medium text-gray-800">{binding.agent.full_name || binding.agent.username}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <button onClick={() => { logout(); router.push('/'); }}
          className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          退出登录
        </button>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-4">修改密码</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">旧密码</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, oldPassword: e.target.value }))}
                  placeholder="请输入旧密码"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="至少6位"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="再次输入新密码"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {passwordError && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-1.5">{passwordError}</div>}
              {passwordSuccess && <div className="text-sm text-green-600 bg-green-50 rounded px-3 py-1.5">{passwordSuccess}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button onClick={handleChangePassword} disabled={passwordSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {passwordSaving ? '提交中...' : '确认修改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
