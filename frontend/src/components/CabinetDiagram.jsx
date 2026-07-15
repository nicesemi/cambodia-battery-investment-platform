'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, ChevronRight } from 'lucide-react';
import { formatTime } from '@/lib/date-format';

function resolveI18n(obj, i18nKey, fallback, i18n) {
  const i18nData = obj?.[i18nKey];
  if (!i18nData || typeof i18nData !== 'object') return fallback;
  return i18nData[i18n.language] || i18nData['zh-CN'] || fallback;
}

function computeBatteryHealth(soc, temp, cycles) {
  function sensorHealth(val, g, y, o, gt) {
    if (val == null) return null;
    if (gt) { if (val > g) return 'green'; if (val > y) return 'yellow'; if (val > o) return 'orange'; return 'red'; }
    else { if (val < g) return 'green'; if (val < y) return 'yellow'; if (val < o) return 'orange'; return 'red'; }
  }
  const socH = sensorHealth(soc, 50, 30, 10, true);
  let tempH = null;
  if (temp != null) {
    if (temp < 0 || temp > 45) tempH = 'red';
    else if (temp < 25) tempH = 'green';
    else if (temp < 35) tempH = 'yellow';
    else tempH = 'orange';
  }
  const cycH = sensorHealth(cycles, 300, 500, 1000, false);
  const hs = [socH, tempH, cycH].filter(Boolean);
  if (hs.includes('red')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('orange')) return { status: 'critical', color: '#EF4444' };
  if (hs.includes('yellow')) return { status: 'warning', color: '#F59E0B' };
  return { status: 'normal', color: '#10B981' };
}

export default function CabinetDiagram({ site, onBack, SensorCard, onTrackBattery, compact = false }) {
  const { t, i18n } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const rawSlots = site.cabinet_slots || site.cabinetSlots || [];
  let slots = [];
  if (Array.isArray(rawSlots)) { slots = rawSlots; }
  else if (typeof rawSlots === 'string') { try { slots = JSON.parse(rawSlots); } catch { slots = []; } }
  else if (rawSlots && typeof rawSlots === 'object') { slots = Object.values(rawSlots); }
  if (!Array.isArray(slots)) slots = [];
  const totalSlots = slots.length;
  const occupiedSlots = slots.filter(s => s.battery_unit_code != null).length;
  const emptySlots = totalSlots - occupiedSlots;

  const slotStatusColor = (slot) => {
    if (slot.status === 'empty') return 'bg-gray-200 text-gray-400 border-gray-300';
    const h = computeBatteryHealth(slot.sensor_battery_level, slot.sensor_temperature, null);
    if (h.status === 'normal') return 'bg-green-200 border-green-400 text-green-800';
    if (h.status === 'warning') return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    return 'bg-red-200 border-red-400 text-red-800';
  };

  return (
    <div className="space-y-4">
      {/* 返回按钮 — compact 模式下隐藏 */}
      {!compact && onBack && (
        <button onClick={() => { onBack(); setSelectedSlot(null); }} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <ChevronRight className="h-4 w-4 rotate-180" /> {t('home.backToCabinetList')}
        </button>
      )}

      {/* 站点信息 — compact 模式下用简化版 */}
      {!compact && (
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="font-semibold text-gray-900">{resolveI18n(site, 'name_i18n', site.site_name || site.name, i18n)}</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{site.site_code}</span>
        </div>
      )}

      {/* 槽位统计 */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />{t('home.occupied')} {occupiedSlots}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" />{t('home.empty')} {emptySlots}</span>
        <span className="text-gray-400">{t('home.batteryAssets')} {site.real_battery_count ?? 0}{t('home.blockUnit')} · {t('home.totalPrefix')} {totalSlots}{t('home.slot')}</span>
      </div>

      {/* 选中槽位传感器详情 — 显示在换电柜上方 */}
      {selectedSlot && selectedSlot.status === 'empty' && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {t('home.slotNumber')} {selectedSlot.slot_number}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {t('home.empty')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SensorCard && <SensorCard title={t('home.slotNumber')} value={selectedSlot.slot_number} color="text-gray-600" />}
            {SensorCard && <SensorCard title={t('home.status_label')} value={t('home.empty')} color="text-gray-600" />}
          </div>
        </div>
      )}

      {selectedSlot && selectedSlot.status === 'occupied' && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {t('home.slot')} {selectedSlot.slot_number} · {selectedSlot.battery_unit_code || '—'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              selectedSlot.charging ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {selectedSlot.charging ? t('home.charging') : t('home.standby')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SensorCard && <SensorCard title="SOC" value={selectedSlot.sensor_battery_level} unit="%" color="text-blue-600" />}
            {SensorCard && <SensorCard title={t('home.temperature')} value={selectedSlot.sensor_temperature} unit="°C" color="text-orange-600" />}
            {SensorCard && <SensorCard title={t('home.voltage')} value={selectedSlot.sensor_voltage} unit="V" color="text-purple-600" />}
            {SensorCard && <SensorCard title={t('home.current')} value={selectedSlot.sensor_current} unit="A" color="text-teal-600" />}
            {SensorCard && <SensorCard title={t('home.lastSwap')} value={selectedSlot.last_swap_time ? formatTime(selectedSlot.last_swap_time, i18n.language) : '—'} color="text-gray-600" />}
            {SensorCard && <SensorCard title={t('home.status_label')} value={t('home.occupiedStatus')} color="text-gray-600" />}
          </div>
        </div>
      )}

      {/* 换电柜网格 */}
      <div className="bg-gray-100 rounded-xl p-3 border-2 border-gray-300">
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedSlot(slot);
                if (slot.status === 'occupied') onTrackBattery?.(slot);
              }}
              className={`h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all text-xs font-medium cursor-pointer hover:scale-105 hover:shadow-md ${
                slotStatusColor(slot)
              }`}
            >
              <span className="text-[10px] font-bold">{slot.slot_number}</span>
              {slot.status === 'occupied' && (
                <span className="text-[8px] truncate max-w-full px-0.5">{slot.battery_unit_code || '—'}</span>
              )}
            </button>
          ))}
        </div>
        {/* 柜体底部 */}
        <div className="mt-2 h-3 bg-gray-300 rounded-b-md" />
      </div>
    </div>
  );
}
