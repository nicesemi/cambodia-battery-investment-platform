// Locale-aware date formatting helpers
// Usage: import { formatDate, formatTime } from '@/lib/date-format';
//        formatDate(dateObj, i18n.language)

export function formatDate(date, locale) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale);
}

export function formatTime(date, locale, options = {}) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...options });
}
