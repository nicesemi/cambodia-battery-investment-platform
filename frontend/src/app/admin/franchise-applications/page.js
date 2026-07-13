'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { adminAPI } from '../../../services/api';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

export default function FranchiseApplicationsPage() {
  const { t } = useTranslation();
  const { user, canAccessAdmin } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reviewedRef = useRef({});

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin()) { router.push('/'); return; }
    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getFranchiseSwapApplications();
      // Merge with optimistically reviewed items to prevent replica lag from overriding correct state
      const apps = (data.applications || []).map(app => {
        const reviewed = reviewedRef.current[app.id];
        if (reviewed) {
          console.log('[FRONTEND] merge ref for', app.id, 'server.status:', app.status, 'ref.status:', reviewed.status, 'match:', app.status === reviewed.status);
          if (app.status === reviewed.status) delete reviewedRef.current[app.id];
          return { ...app, ...reviewed };
        }
        return app;
      });
      console.log('[FRONTEND] loaded', apps.length, 'apps, _debug:', data._debug);
      console.log('[FRONTEND] status per app:', apps.map(a => ({ id: a.id.slice(0,8), status: a.status })));
      setApplications(apps);
    } catch (e) {
      setError(e.message || 'Failed to load applications');
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleReview = async (status) => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const res = await adminAPI.reviewFranchiseSwapApplication(reviewModal.id, { status, admin_remark: remark });
      console.log('[FRONTEND] PUT success, returned status:', res.application?.status);
      // Use PUT response directly — bypass replica lag from subsequent GET
      const updatedApp = res.application;
      reviewedRef.current[reviewModal.id] = { status: updatedApp.status, admin_remark: updatedApp.admin_remark };
      setApplications(prev => prev.map(app =>
        app.id === reviewModal.id ? { ...app, ...updatedApp, applicant: app.applicant, template: app.template } : app
      ));
      setReviewModal(null); setRemark('');
      // Delay re-fetch to let Supabase read replica catch up
      setTimeout(() => loadApplications(), 1500);
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
        {t(`adminFa.status.${status}`)}
      </span>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadApplications}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition">
          {t('common.retry')}
        </button>
      </div>
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
            <h1 className="text-2xl font-bold">{t('adminFa.title')}</h1>
          </div>
          <p className="text-gray-400 text-sm">{t('adminFa.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <FileText className="h-4 w-4" />
          <span>{t('adminFa.totalApplications', { count: applications.length })}</span>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 w-10">#</th>
                  <th className="text-left p-3">{t('adminFa.applicant')}</th>
                  <th className="text-left p-3">{t('adminFa.location')}</th>
                  <th className="text-center p-3">{t('adminFa.template')}</th>
                  <th className="text-center p-3">{t('adminFa.cabinetCount')}</th>
                  <th className="text-center p-3">{t('adminFa.battery4820')}</th>
                  <th className="text-center p-3">{t('adminFa.battery6035')}</th>
                  <th className="text-center p-3">{t('adminFa.battery7250')}</th>
                  <th className="text-center p-3">{t('adminFa.status')}</th>
                  <th className="text-left p-3 max-w-[200px]">{t('adminFa.remark')}</th>
                  <th className="text-left p-3">{t('adminFa.createdAt')}</th>
                  <th className="text-center p-3 w-24">{t('adminOs.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => (
                  <tr key={app.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-medium text-gray-900 text-xs">
                        {app.applicant?.username || app.applicant?.email || app.user_id}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{app.location}</td>
                    <td className="p-3 text-center text-xs">
                      {app.template?.name || '-'}
                    </td>
                    <td className="p-3 text-center font-semibold text-xs">{app.cabinet_count}</td>
                    <td className="p-3 text-center text-xs">{app.matched_battery_4820}</td>
                    <td className="p-3 text-center text-xs">{app.matched_battery_6035}</td>
                    <td className="p-3 text-center text-xs">{app.matched_battery_7250}</td>
                    <td className="p-3 text-center">{statusBadge(app.status)}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate" title={app.admin_remark || ''}>
                      {app.admin_remark || '-'}
                    </td>
                    <td className="p-3 text-xs text-gray-400">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {app.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={() => { setReviewModal(app); setRemark(''); }}
                            className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium transition">
                            {t('adminFa.review')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {applications.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">{t('adminFa.noApplications')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">{t('adminFa.reviewTitle')}</h2>
            <div className="space-y-3 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">{t('adminFa.applicant')}:</span> <span className="font-medium">{reviewModal.applicant?.username || reviewModal.applicant?.email || reviewModal.user_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('adminFa.location')}:</span> <span className="font-medium">{reviewModal.location}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('adminFa.template')}:</span> <span className="font-medium">{reviewModal.template?.name || '-'}（{reviewModal.cabinet_count}{t('adminFa.cabinetsUnit')}）</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('adminFa.batteryMatch')}:</span> <span className="font-medium">4820×{reviewModal.matched_battery_4820} / 6035×{reviewModal.matched_battery_6035} / 7250×{reviewModal.matched_battery_7250}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('adminFa.remark')}</label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder={t('adminFa.remarkPlaceholder')} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReviewModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">{t('common.cancel')}</button>
              <button onClick={() => handleReview('rejected')} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />{t('adminFa.reject')}
              </button>
              <button onClick={() => handleReview('approved')} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                {t('adminFa.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
