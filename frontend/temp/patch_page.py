#!/usr/bin/env python3
"""Targeted i18n replacements for page.js. Uses precise old_str → new_str mapping."""
import re

PAGE_JS = "/Users/daxixi/Library/Application Support/com.tencent.mac.marvis/MarvisData/User/oAN1i2VmsGbdO4eyNVh90OQ9zP5E/workspace/conv_19ed68a9a2d_8b165236c049/output/battery_swap_platform/cambodia-battery-investment/frontend/src/app/page.js"

with open(PAGE_JS, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

def replace(old, new):
    global content, changes
    if old not in content:
        print(f"WARN: not found: {old[:60]}...")
        return
    content = content.replace(old, new)
    changes += 1
    print(f"OK: {old[:60]}...")

# ═══════════════════════════════════════════════════════════════
# 1. Add useTranslation() to module-level sub-components
# ═══════════════════════════════════════════════════════════════

# BatteryAssetsSection
replace(
    'function BatteryAssetsSection() {\n  const [activeCategory, setActiveCategory]',
    'function BatteryAssetsSection() {\n  const { t } = useTranslation();\n  const [activeCategory, setActiveCategory]'
)

# BatteryNetworkSection
replace(
    'function BatteryNetworkSection({ amapReady }) {\n  const mapRef',
    'function BatteryNetworkSection({ amapReady }) {\n  const { t } = useTranslation();\n  const mapRef'
)

# CabinetDiagram
replace(
    'function CabinetDiagram({ site, onBack, SensorCard, onTrackBattery }) {\n  const [selectedSlot, setSelectedSlot]',
    'function CabinetDiagram({ site, onBack, SensorCard, onTrackBattery }) {\n  const { t } = useTranslation();\n  const [selectedSlot, setSelectedSlot]'
)

# VehicleDetail
replace(
    'function VehicleDetail({ vehicle, onBack, generateRoutePath, SensorCard, onTrackToMap }) {\n  const route',
    'function VehicleDetail({ vehicle, onBack, generateRoutePath, SensorCard, onTrackToMap }) {\n  const { t } = useTranslation();\n  const route'
)

# ContainerDetail
replace(
    'function ContainerDetail({ unit, onBack, SensorCard }) {\n  const cs',
    'function ContainerDetail({ unit, onBack, SensorCard }) {\n  const { t } = useTranslation();\n  const cs'
)

# WarehouseDetail
replace(
    'function WarehouseDetail({ warehouse, onBack }) {\n  const batteries',
    'function WarehouseDetail({ warehouse, onBack }) {\n  const { t } = useTranslation();\n  const batteries'
)

# FranchiseStoresSection
replace(
    'function FranchiseStoresSection({ amapReady }) {\n  const mapRef',
    'function FranchiseStoresSection({ amapReady }) {\n  const { t } = useTranslation();\n  const mapRef'
)

# StatCounter already has its own rendering and doesn't use useTranslation - but label comes from parent component
# No change needed for StatCounter - labels passed as props from parent

# ═══════════════════════════════════════════════════════════════
# 2. BatteryAssetsSection — categories array labels
# ═══════════════════════════════════════════════════════════════
# These are inside the function body, after useTranslation is available

replace(
    "{ key:'swap', label:'两轮/三轮换电', icon:'🏍️', desc:'外卖骑手、快递配送、电摩出行' }",
    "{ key:'swap', label:t('home.catSwap'), icon:'🏍️', desc:t('home.catSwapDesc') }"
)

replace(
    "{ key:'vehicle', label:'物流/客运车辆', icon:'🚛', desc:'城市物流、客运车队电池托管' }",
    "{ key:'vehicle', label:t('home.catVehicle'), icon:'🚛', desc:t('home.catVehicleDesc') }"
)

replace(
    "{ key:'commercial', label:'移动储能柜', icon:'🚚', desc:'峰谷套利、需量管理、备电' }",
    "{ key:'commercial', label:t('home.catCommercial'), icon:'🚚', desc:t('home.catCommercialDesc') }"
)

replace(
    "{ key:'container', label:'固定储能柜', icon:'📦', desc:'电网级储能、光伏配储' }",
    "{ key:'container', label:t('home.catContainer'), icon:'📦', desc:t('home.catContainerDesc') }"
)

# ═══════════════════════════════════════════════════════════════
# 3. BatteryAssetsSection — JSX text replacements
# ═══════════════════════════════════════════════════════════════

# Section header
replace(
    '<Battery className="h-4 w-4 mr-2" /> 电池资产</div>',
    '<Battery className="h-4 w-4 mr-2" /> {t(\'home.batteryAssets\')}</div>'
)

replace(
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">电池资产矩阵</h2>',
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t(\'home.batteryAssetsMatrix\')}</h2>'
)

replace(
    '<p className="text-gray-500 max-w-2xl mx-auto">覆盖换电、商用车辆、工商业储能及固定储能柜全品类，20款标准化电池资产</p>',
    '<p className="text-gray-500 max-w-2xl mx-auto">{t(\'home.batteryAssetsDesc\')}</p>'
)

# Auto play button
replace(
    "{autoPlay ? '⏸ 停止轮播' : '▶ 自动轮播'}",
    "{autoPlay ? t('home.stopAutoPlay') : t('home.autoPlay')}"
)

# Grid labels (电压, 电流, 重量) — these are in the asset list
replace(
    '<div className="text-gray-400">电压</div><div className="font-semibold text-gray-700">{item.voltage}</div>',
    '<div className="text-gray-400">{t(\'home.voltage\')}</div><div className="font-semibold text-gray-700">{item.voltage}</div>'
)

replace(
    '<div className="text-gray-400">电流</div><div className="font-semibold text-gray-700">{item.current}</div>',
    '<div className="text-gray-400">{t(\'home.current\')}</div><div className="font-semibold text-gray-700">{item.current}</div>'
)

replace(
    '<div className="text-gray-400">重量</div><div className="font-semibold text-gray-700">{item.weight}</div>',
    '<div className="text-gray-400">{t(\'home.weight\')}</div><div className="font-semibold text-gray-700">{item.weight}</div>'
)

# Detail panel labels — this is in the selectedAsset detail array
# We need to replace the label strings inside the array
replace(
    "{ label:'标称电压', value:selectedAsset.voltage }, { label:'容量', value:selectedAsset.capacity },\n                { label:'持续电流', value:selectedAsset.current }, { label:'外形尺寸', value:selectedAsset.size },\n                { label:'净重', value:selectedAsset.weight }, { label:'单台电量', value:selectedAsset.energy },",
    "{ label:t('home.nominalVoltage'), value:selectedAsset.voltage }, { label:t('home.capacity'), value:selectedAsset.capacity },\n                { label:t('home.continuousCurrent'), value:selectedAsset.current }, { label:t('home.dimensions'), value:selectedAsset.size },\n                { label:t('home.netWeight'), value:selectedAsset.weight }, { label:t('home.unitEnergy'), value:selectedAsset.energy },"
)

# Register link
replace(
    '<Link href="/register" className="text-blue-600 font-medium text-sm hover:underline">注册登录，查看投资收益率与详情 →</Link>',
    '<Link href="/register" className="text-blue-600 font-medium text-sm hover:underline">{t(\'home.registerToView\')}</Link>'
)

# Bottom text
replace(
    '<p className="text-sm text-gray-400">共 {Object.values(BATTERY_ASSETS).flat().length} 款标准化电池产品 · 参数公开透明 · 登录查看投资详情</p>',
    '<p className="text-sm text-gray-400">共 {Object.values(BATTERY_ASSETS).flat().length}{t(\'home.totalProducts\')}</p>'
)

# ═══════════════════════════════════════════════════════════════
# 4. BatteryNetworkSection — nodeIconConfig labels
# ═══════════════════════════════════════════════════════════════

replace(
    "'swap':      { color:'#f97316', svg:svgIcons.swap,      label:'换电站',   iconBg:'bg-orange-100', iconText:'text-orange-700' }",
    "'swap':      { color:'#f97316', svg:svgIcons.swap,      label:t('home.nodeType.swap'),   iconBg:'bg-orange-100', iconText:'text-orange-700' }"
)

replace(
    "'bus':       { color:'#3b82f6', svg:svgIcons.bus,       label:'运营线路',   iconBg:'bg-blue-100',   iconText:'text-blue-700' }",
    "'bus':       { color:'#3b82f6', svg:svgIcons.bus,       label:t('home.nodeType.bus'),   iconBg:'bg-blue-100',   iconText:'text-blue-700' }"
)

replace(
    "'commercial':{ color:'#7c3aed', svg:svgIcons.truck,      label:'移动储能柜', iconBg:'bg-purple-100', iconText:'text-purple-700' }",
    "'commercial':{ color:'#7c3aed', svg:svgIcons.truck,      label:t('home.nodeType.commercial'), iconBg:'bg-purple-100', iconText:'text-purple-700' }"
)

replace(
    "'container': { color:'#ef4444', svg:svgIcons.container, label:'固定储能柜', iconBg:'bg-red-100', iconText:'text-red-700' }",
    "'container': { color:'#ef4444', svg:svgIcons.container, label:t('home.nodeType.container'), iconBg:'bg-red-100', iconText:'text-red-700' }"
)

# ═══════════════════════════════════════════════════════════════
# 5. BATTERY_STATUS_LABELS replacement (used in JSX)
# ═══════════════════════════════════════════════════════════════

# Replace usage: {BATTERY_STATUS_LABELS[computeBatteryHealth(...).status] || ...}
# With: {t('home.status.' + computeBatteryHealth(...).status) || ...}
# But this is tricky because it's inside JSX. Let me handle the specific occurrences.

# In VehicleDetail
replace(
    "<span className=\"text-xs font-medium text-gray-900\">{BATTERY_STATUS_LABELS[vHealth.status]}</span>",
    "<span className=\"text-xs font-medium text-gray-900\">{t(vHealth.status === 'normal' ? 'home.status.normal' : vHealth.status === 'warning' ? 'home.status.warning' : vHealth.status === 'critical' ? 'home.status.critical' : 'home.status.offline')}</span>"
)

# In ContainerDetail
replace(
    "<span className=\"text-xs font-medium text-gray-900\">{BATTERY_STATUS_LABELS[uHealth.status]}</span>",
    "<span className=\"text-xs font-medium text-gray-900\">{t(uHealth.status === 'normal' ? 'home.status.normal' : uHealth.status === 'warning' ? 'home.status.warning' : uHealth.status === 'critical' ? 'home.status.critical' : 'home.status.offline')}</span>"
)

# In selectedBatteryUnit sensor detail
replace(
    "<span className=\"text-[10px] text-gray-500\">{BATTERY_STATUS_LABELS[computeBatteryHealth(selectedBatteryUnit.soc, selectedBatteryUnit.temperature, selectedBatteryUnit.cycle_count).status] || selectedBatteryUnit.status}</span>",
    "<span className=\"text-[10px] text-gray-500\">{(() => { const s = computeBatteryHealth(selectedBatteryUnit.soc, selectedBatteryUnit.temperature, selectedBatteryUnit.cycle_count).status; return t(s === 'normal' ? 'home.status.normal' : s === 'warning' ? 'home.status.warning' : s === 'critical' ? 'home.status.critical' : 'home.status.offline'); })() || selectedBatteryUnit.status}</span>"
)

# ═══════════════════════════════════════════════════════════════
# 6. Network Section — Tab buttons
# ═══════════════════════════════════════════════════════════════

replace(
    '{ label:\'换电站\', icon:Zap, iconColor:\'text-orange-500\', iconBg:\'bg-orange-100\'',
    '{ label:t(\'home.nodeType.swap\'), icon:Zap, iconColor:\'text-orange-500\', iconBg:\'bg-orange-100\''
)

replace(
    '{ label:\'运营线路\', icon:Bus, iconColor:\'text-blue-500\', iconBg:\'bg-blue-100\'',
    '{ label:t(\'home.nodeType.bus\'), icon:Bus, iconColor:\'text-blue-500\', iconBg:\'bg-blue-100\''
)

replace(
    '{ label:\'移动储能柜\', icon:Truck, iconColor:\'text-purple-500\', iconBg:\'bg-purple-100\'',
    '{ label:t(\'home.nodeType.commercial\'), icon:Truck, iconColor:\'text-purple-500\', iconBg:\'bg-purple-100\''
)

replace(
    '{ label:\'固定储能柜\', icon:Container, iconColor:\'text-red-500\', iconBg:\'bg-red-100\'',
    '{ label:t(\'home.nodeType.container\'), icon:Container, iconColor:\'text-red-500\', iconBg:\'bg-red-100\''
)

# ═══════════════════════════════════════════════════════════════
# 7. Network section headings and descriptions
# ═══════════════════════════════════════════════════════════════

replace(
    '<div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">\n          <Globe className="h-4 w-4 mr-2" /> 电池网络分布',
    '<div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">\n          <Globe className="h-4 w-4 mr-2" /> {t(\'home.batteryNetwork\')}'
)

replace(
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">电池网络实时分布</h2>',
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t(\'home.networkTitle\')}</h2>'
)

replace(
    '<p className="text-gray-500 max-w-2xl mx-auto">全球在运电池资产可视化监控，实时电量与服役状态一目了然</p>',
    '<p className="text-gray-500 max-w-2xl mx-auto">{t(\'home.networkDesc\')}</p>'
)

# ═══════════════════════════════════════════════════════════════
# 8. Site type config (siteTypeConfig)
# ═══════════════════════════════════════════════════════════════

replace(
    "const siteTypeConfig = useMemo(() => ({\n    '换电站': 'bg-blue-100 text-blue-700',\n    '运营线路': 'bg-amber-100 text-amber-700',\n    '移动储能柜': 'bg-purple-100 text-purple-700',\n    '固定储能柜': 'bg-red-100 text-red-700',\n  }), []);",
    "const siteTypeConfig = useMemo(() => ({\n    [t('home.nodeType.swap')]: 'bg-blue-100 text-blue-700',\n    [t('home.nodeType.bus')]: 'bg-amber-100 text-amber-700',\n    [t('home.nodeType.commercial')]: 'bg-purple-100 text-purple-700',\n    [t('home.nodeType.container')]: 'bg-red-100 text-red-700',\n  }), [t]);"
)

# ═══════════════════════════════════════════════════════════════
# 9. Site list sidebar headers — swap/line/mobile/fixed
# ═══════════════════════════════════════════════════════════════

replace(
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">换电站站点</span>',
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t(\'home.swapSites\')}</span>'
)

replace(
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">运营线路站点</span>',
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t(\'home.lineSites\')}</span>'
)

replace(
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">移动储能柜站点</span>',
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t(\'home.mobileSites\')}</span>'
)

replace(
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">固定储能柜站点</span>',
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t(\'home.fixedSites\')}</span>'
)

# Empty state messages
replace(
    '<p className="py-12 text-center text-gray-400 text-sm">暂无换电站站点</p>',
    '<p className="py-12 text-center text-gray-400 text-sm">{t(\'home.noSwapSites\')}</p>'
)

replace(
    '<p className="py-12 text-center text-gray-400 text-sm">暂无运营线路站点</p>',
    '<p className="py-12 text-center text-gray-400 text-sm">{t(\'home.noLineSites\')}</p>'
)

replace(
    '<p className="py-12 text-center text-gray-400 text-sm">暂无移动储能柜站点</p>',
    '<p className="py-12 text-center text-gray-400 text-sm">{t(\'home.noMobileSites\')}</p>'
)

replace(
    '<p className="py-12 text-center text-gray-400 text-sm">暂无固定储能柜站点</p>',
    '<p className="py-12 text-center text-gray-400 text-sm">{t(\'home.noFixedSites\')}</p>'
)

# ═══════════════════════════════════════════════════════════════
# 10. Site list - back button
# ═══════════════════════════════════════════════════════════════

replace(
    '返回站点列表',
    "{t('home.backToSiteList')}"
)

# ═══════════════════════════════════════════════════════════════
# 11. Site list — "本站车辆" / "本站电池单元"
# ═══════════════════════════════════════════════════════════════

replace(
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">\n                      本站车辆',
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">\n                      {t(\'home.siteVehicles\')}'
)

replace(
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">\n                      本站电池单元',
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">\n                      {t(\'home.siteUnits\')}'
)

# ═══════════════════════════════════════════════════════════════
# 12. "健康度" in unit list
# ═══════════════════════════════════════════════════════════════

replace(
    '{unit.health != null && <span>健康度 {unit.health}%</span>}',
    '{unit.health != null && <span>{t(\'home.health\')} {unit.health}%</span>}'
)

# ═══════════════════════════════════════════════════════════════
# 13. Sensor labels — "温度", "SOC", "SOH", "循环次数", "电压", "电流"
# ═══════════════════════════════════════════════════════════════

# In the selectedBatteryUnit detail panel
replace(
    '<SensorCard title="温度" value={selectedBatteryUnit.temperature} unit="°C" color="text-orange-600" />',
    "<SensorCard title={t('home.temperature')} value={selectedBatteryUnit.temperature} unit=\"°C\" color=\"text-orange-600\" />"
)

replace(
    '<SensorCard title="电压" value={selectedBatteryUnit.voltage} unit="V" color="text-purple-600" />',
    "<SensorCard title={t('home.voltage')} value={selectedBatteryUnit.voltage} unit=\"V\" color=\"text-purple-600\" />"
)

replace(
    '<SensorCard title="电流" value={selectedBatteryUnit.current} unit="A" color="text-teal-600" />',
    "<SensorCard title={t('home.current')} value={selectedBatteryUnit.current} unit=\"A\" color=\"text-teal-600\" />"
)

replace(
    '<SensorCard title="循环次数" value={selectedBatteryUnit.cycle_count} color="text-gray-600" />',
    "<SensorCard title={t('home.cycleCount')} value={selectedBatteryUnit.cycle_count} color=\"text-gray-600\" />"
)

# ═══════════════════════════════════════════════════════════════
# 14. CabinetDiagram replacements
# ═══════════════════════════════════════════════════════════════

replace(
    '返回换电柜列表',
    "{t('home.backToCabinetList')}"
)

# Cabinet slot legend
replace(
    '<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />已占用 {occupiedSlots}</span>',
    "<span className=\"flex items-center gap-1\"><span className=\"w-2.5 h-2.5 rounded-sm bg-yellow-400\" />{t('home.occupied')} {occupiedSlots}</span>"
)

replace(
    '<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" />空闲 {emptySlots}</span>',
    "<span className=\"flex items-center gap-1\"><span className=\"w-2.5 h-2.5 rounded-sm bg-gray-300\" />{t('home.empty')} {emptySlots}</span>"
)

replace(
    '<span className="text-gray-400">电池 {site.real_battery_count ?? 0} 块 · 共 {totalSlots} 槽</span>',
    "<span className=\"text-gray-400\">{t('home.batteryAssets')} {site.real_battery_count ?? 0}{t('home.blockUnit')} · 共 {totalSlots}{t('home.slot')}</span>"
)

# Slot detail — slot number
replace(
    '<span className="text-xs font-semibold text-gray-500">\n              槽位 {selectedSlot.slot_number}\n            </span>',
    "<span className=\"text-xs font-semibold text-gray-500\">\n              {t('home.slotNumber')} {selectedSlot.slot_number}\n            </span>"
)

replace(
    '<SensorCard title="槽位编号" value={selectedSlot.slot_number} color="text-gray-600" />',
    "<SensorCard title={t('home.slotNumber')} value={selectedSlot.slot_number} color=\"text-gray-600\" />"
)

# Slot detail — 空闲
replace(
    '<span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">\n              空闲\n            </span>',
    "<span className=\"text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500\">\n              {t('home.empty')}\n            </span>"
)

replace(
    '<SensorCard title="状态" value="空闲" color="text-gray-600" />',
    "<SensorCard title={t('home.status_label')} value={t('home.empty')} color=\"text-gray-600\" />"
)

# Slot detail — 充电中 / 待机
replace(
    "{selectedSlot.charging ? '充电中' : '待机'}",
    "{selectedSlot.charging ? t('home.charging') : t('home.standby')}"
)

# Slot detail occupied sensors
replace(
    "<SensorCard title=\"温度\" value={selectedSlot.sensor_temperature} unit=\"°C\" color=\"text-orange-600\" />\n            <SensorCard title=\"电压\" value={selectedSlot.sensor_voltage} unit=\"V\" color=\"text-purple-600\" />\n            <SensorCard title=\"电流\" value={selectedSlot.sensor_current} unit=\"A\" color=\"text-teal-600\" />\n            <SensorCard title=\"最近换电\" value={selectedSlot.last_swap_time ? new Date(selectedSlot.last_swap_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—'} color=\"text-gray-600\" />\n            <SensorCard title=\"状态\" value=\"已占用\" color=\"text-gray-600\" />",
    "<SensorCard title={t('home.temperature')} value={selectedSlot.sensor_temperature} unit=\"°C\" color=\"text-orange-600\" />\n            <SensorCard title={t('home.voltage')} value={selectedSlot.sensor_voltage} unit=\"V\" color=\"text-purple-600\" />\n            <SensorCard title={t('home.current')} value={selectedSlot.sensor_current} unit=\"A\" color=\"text-teal-600\" />\n            <SensorCard title={t('home.lastSwap')} value={selectedSlot.last_swap_time ? new Date(selectedSlot.last_swap_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—'} color=\"text-gray-600\" />\n            <SensorCard title={t('home.status_label')} value={t('home.occupiedStatus')} color=\"text-gray-600\" />"
)

# ═══════════════════════════════════════════════════════════════
# 15. VehicleDetail replacements
# ═══════════════════════════════════════════════════════════════

replace(
    '返回电池单元列表',
    "{t('home.backToUnitList')}"
)

replace(
    '在地图上查看',
    "{t('home.trackOnMap')}"
)

# Vehicle type badges
replace(
    "{vehicle.vehicle_type === 'truck' ? '货车' : vehicle.site_type === '固定储能柜' ? '固定柜' : '移动柜'}",
    "{vehicle.vehicle_type === 'truck' ? t('home.truck') : vehicle.site_type === t('home.fixedStorage') ? t('home.fixedStorage') : t('home.mobileStorage')}"
)

# Wait, this has an issue. The site_type check uses a Chinese string comparison. Let me use a different approach.
# The comparison '固定储能柜' is a data value check - need to keep it as-is since it compares against DB data.
# Only the DISPLAY text should be translated.
# Let me fix this:

# Actually let me redo this one. The comparison should stay against the raw value.
# The display labels need i18n.
replace(
    "{vehicle.vehicle_type === 'truck' ? '货车' : vehicle.site_type === '固定储能柜' ? '固定柜' : '移动柜'}",
    "{vehicle.vehicle_type === 'truck' ? t('home.truck') : vehicle.site_type === '固定储能柜' ? t('home.fixedStorage') : t('home.mobileStorage')}"
)

# Vehicle sensors
replace(
    '<SensorCard title="温度" value={vehicle.temperature} unit="°C" color="text-orange-600" />',
    "<SensorCard title={t('home.temperature')} value={vehicle.temperature} unit=\"°C\" color=\"text-orange-600\" />"
)

replace(
    '<SensorCard title="循环次数" value={vehicle.cycle_count} color="text-gray-600" />',
    "<SensorCard title={t('home.cycleCount')} value={vehicle.cycle_count} color=\"text-gray-600\" />"
)

replace(
    '<SensorCard title="电压" value={vehicle.voltage} color="text-purple-600" />',
    "<SensorCard title={t('home.voltage')} value={vehicle.voltage} color=\"text-purple-600\" />"
)

replace(
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">传感器数据</div>',
    "<div className=\"text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2\">{t('home.sensorData')}</div>"
)

replace(
    '<div className="text-xs font-semibold text-gray-500 mb-2">运营线路</div>',
    "<div className=\"text-xs font-semibold text-gray-500 mb-2\">{t('home.operatingRoute')}</div>"
)

replace(
    '<SensorCard title="最后维护" value={vehicle.last_maintenance ? new Date(vehicle.last_maintenance).toLocaleDateString(\'zh-CN\') : \'—\'} color="text-gray-600" />',
    "<SensorCard title={t('home.lastMaintenance')} value={vehicle.last_maintenance ? new Date(vehicle.last_maintenance).toLocaleDateString('zh-CN') : '—'} color=\"text-gray-600\" />"
)

replace(
    '<span className="text-xs text-gray-400">电量水平</span>',
    "<span className=\"text-xs text-gray-400\">{t('home.batteryLevel')}</span>"
)

# ═══════════════════════════════════════════════════════════════
# 16. ContainerDetail replacements
# ═══════════════════════════════════════════════════════════════

replace(
    '返回储能列表',
    "{t('home.backToStorageList')}"
)

# Fixed storage badge
replace(
    '<span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">固定储能柜</span>',
    "<span className=\"text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full\">{t('home.fixedStorage')}</span>"
)

# Container status indicator
replace(
    "<span className=\"text-[10px] text-gray-500\">{unit.status === 'normal' ? '运行中' : unit.status === 'warning' ? '预警' : '故障'}</span>",
    "<span className=\"text-[10px] text-gray-500\">{unit.status === 'normal' ? t('home.running') : unit.status === 'warning' ? t('home.status.warning') : t('home.fault')}</span>"
)

# Storage sensors section header
replace(
    '<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">储能传感器</div>',
    "<div className=\"text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2\">{t('home.storageSensor')}</div>"
)

# Container unit sensors
replace(
    '<SensorCard title="温度" value={cs.temperature || unit.temperature} unit="°C" color="text-orange-600" />',
    "<SensorCard title={t('home.temperature')} value={cs.temperature || unit.temperature} unit=\"°C\" color=\"text-orange-600\" />"
)

replace(
    '<SensorCard title="总电压" value={cs.voltage_total} unit="V" color="text-purple-600" />',
    "<SensorCard title={t('home.totalVoltage')} value={cs.voltage_total} unit=\"V\" color=\"text-purple-600\" />"
)

replace(
    '<SensorCard title="电流" value={cs.current} unit="A" color="text-teal-600" />',
    "<SensorCard title={t('home.current')} value={cs.current} unit=\"A\" color=\"text-teal-600\" />"
)

replace(
    '<SensorCard title="功率" value={cs.power_kw ? `${(cs.power_kw / 1000).toFixed(1)}` : \'—\'} unit="kW" color="text-indigo-600" />',
    "<SensorCard title={t('home.power')} value={cs.power_kw ? `${(cs.power_kw / 1000).toFixed(1)}` : '—'} unit=\"kW\" color=\"text-indigo-600\" />"
)

replace(
    '<SensorCard title="能量吞吐" value={cs.energy_throughput_kwh ? `${(cs.energy_throughput_kwh / 1000).toFixed(1)}` : \'—\'} unit="MWh" color="text-gray-600" />',
    "<SensorCard title={t('home.energyThroughput')} value={cs.energy_throughput_kwh ? `${(cs.energy_throughput_kwh / 1000).toFixed(1)}` : '—'} unit=\"MWh\" color=\"text-gray-600\" />"
)

replace(
    '<SensorCard title="电芯最低电压"',
    "<SensorCard title={t('home.cellVoltageMin')}"
)

replace(
    '<SensorCard title="电芯最高电压"',
    "<SensorCard title={t('home.cellVoltageMax')}"
)

replace(
    '<SensorCard title="电芯最高温度"',
    "<SensorCard title={t('home.cellTempMax')}"
)

replace(
    '<SensorCard title="绝缘电阻"',
    "<SensorCard title={t('home.insulationResistance')}"
)

# Container independent op
replace(
    "<p className=\"text-sm text-gray-500 mt-1\">{unit.site_name || '独立运营'}</p>",
    "<p className=\"text-sm text-gray-500 mt-1\">{unit.site_name || t('home.independentOp')}</p>"
)

# ═══════════════════════════════════════════════════════════════
# 17. WarehouseDetail replacements
# ═══════════════════════════════════════════════════════════════

replace(
    '返回仓库列表',
    "{t('home.backToWarehouseList')}"
)

replace(
    "<p className=\"text-[10px] text-gray-400\">编码: {warehouse.warehouse_code}</p>",
    "<p className=\"text-[10px] text-gray-400\">{t('home.code')}: {warehouse.warehouse_code}</p>"
)

replace(
    '<span className="text-xs text-gray-500">未售电池:</span>',
    "<span className=\"text-xs text-gray-500\">{t('home.unsoldBatteries')}:</span>"
)

replace(
    '<div className="py-8 text-center text-gray-400 text-sm">此仓库暂无未售电池</div>',
    "<div className=\"py-8 text-center text-gray-400 text-sm\">{t('home.noUnsoldBattery')}</div>"
)

# ═══════════════════════════════════════════════════════════════
# 18. FranchiseStoresSection
# ═══════════════════════════════════════════════════════════════

replace(
    '<Store className="h-4 w-4 mr-2" /> 加盟门店</div>',
    "<Store className=\"h-4 w-4 mr-2\" /> {t('home.franchiseStores')}</div>"
)

replace(
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">加盟门店网络</h2>',
    "<h2 className=\"text-3xl md:text-4xl font-bold text-gray-900 mb-4\">{t('home.franchiseNetwork')}</h2>"
)

replace(
    '<p className="text-gray-500 max-w-2xl mx-auto">投资者购买电池资产的销售门店，覆盖全球</p>',
    "<p className=\"text-gray-500 max-w-2xl mx-auto\">{t('home.franchiseDesc')}</p>"
)

# Franchise stats
replace(
    "{ icon:Store, label:'门店总数', value:`${franchiseStores.length}` }",
    "{ icon:Store, label:t('home.totalStores'), value:`${franchiseStores.length}` }"
)

replace(
    "{ icon:ShoppingBag, label:'累计销量', value:`${franchiseStores.reduce((a,b)=>a+b.soldCount,0)}` }",
    "{ icon:ShoppingBag, label:t('home.cumulativeSales'), value:`${franchiseStores.reduce((a,b)=>a+b.soldCount,0)}` }"
)

replace(
    "{ icon:Globe, label:'覆盖区域', value:'全球' }",
    "{ icon:Globe, label:t('home.coverage'), value:t('home.global') }"
)

# Franchise sidebar header
replace(
    '<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">加盟门店</span>',
    "<span className=\"text-xs font-semibold text-gray-400 uppercase tracking-wider\">{t('home.franchiseStores')}</span>"
)

replace(
    "<span className=\"text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full\">{franchiseStores.length} 家</span>",
    "<span className=\"text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full\">{franchiseStores.length}{t('home.storesUnit')}</span>"
)

# Franchise detail panel
replace(
    "{ label:'已售电池类型', value:selectedStore.soldBattery }",
    "{ label:t('home.soldBatteryType'), value:selectedStore.soldBattery }"
)

replace(
    "{ label:'已售电池数量', value:`${selectedStore.soldCount} 组` }",
    "{ label:t('home.soldBatteryCount'), value:`${selectedStore.soldCount}${t('home.groupsUnit')}` }"
)

replace(
    "{ label:'联系电话', value:selectedStore.phone }",
    "{ label:t('home.storePhone'), value:selectedStore.phone }"
)

replace(
    "{ label:'门店地址', value:selectedStore.address }",
    "{ label:t('home.storeAddress'), value:selectedStore.address }"
)

replace(
    '<span className="text-sm">门店照片待上传</span>',
    "<span className=\"text-sm\">{t('home.storePhotoPending')}</span>"
)

# Legend
replace(
    '<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-gray-900 rounded-full" />中国大陆</span>',
    "<span className=\"flex items-center gap-1.5 text-xs text-gray-500\"><span className=\"w-3 h-3 bg-gray-900 rounded-full\" />{t('home.chinaMainland')}</span>"
)

replace(
    '<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />香港</span>',
    "<span className=\"flex items-center gap-1.5 text-xs text-gray-500\"><span className=\"w-3 h-3 bg-red-600 rounded-full\" />{t('home.hongkong')}</span>"
)

replace(
    '<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />澳门</span>',
    "<span className=\"flex items-center gap-1.5 text-xs text-gray-500\"><span className=\"w-3 h-3 bg-green-600 rounded-full\" />{t('home.macau')}</span>"
)

# "已售电池 X 组"
replace(
    '已售电池 <span className="font-semibold text-gray-700">{s.soldCount}</span> 组',
    "{t('home.soldBattery')} <span className=\"font-semibold text-gray-700\">{s.soldCount}</span>{t('home.groupsUnit')}"
)

# ═══════════════════════════════════════════════════════════════
# 19. HomePage Hero + CTA (already has useTranslation)
# ═══════════════════════════════════════════════════════════════

replace(
    '<p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">\n              管理好每1度电。1kWh 基于区块链+IoT技术，构建东南亚最大换电网络。\n              每一度电都能创造价值，加入绿色能源革命。\n            </p>',
    "<p className=\"text-lg text-gray-300 mb-8 max-w-lg leading-relaxed\">\n              {t('home.heroTagline')}\n            </p>"
)

# Hero buttons (logged out)
replace(
    '<Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">\n                    立即注册 <ArrowRight className="ml-2 h-5 w-5" />\n                  </Link>',
    "<Link href=\"/register\" className=\"inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg\">\n                    {t('home.registerNow')} <ArrowRight className=\"ml-2 h-5 w-5\" />\n                  </Link>"
)

replace(
    '<Link href="/invest" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">\n                    <Play className="mr-2 h-5 w-5" /> 了解投资\n                  </Link>',
    "<Link href=\"/invest\" className=\"inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition\">\n                    <Play className=\"mr-2 h-5 w-5\" /> {t('home.learnInvest')}\n                  </Link>"
)

# Hero buttons (logged in)
replace(
    '<Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">\n                    开始投资 <ArrowRight className="ml-2 h-5 w-5" />\n                  </Link>',
    "<Link href=\"/invest\" className=\"inline-flex items-center bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg\">\n                    {t('home.startInvest')} <ArrowRight className=\"ml-2 h-5 w-5\" />\n                  </Link>"
)

replace(
    '<Link href="/trade" className="inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition">\n                    去交易市场\n                  </Link>',
    "<Link href=\"/trade\" className=\"inline-flex items-center border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition\">\n                    {t('home.goTrade')}\n                  </Link>"
)

# StatCounter labels
replace(
    '<StatCounter end={1000} label="活跃用户" suffix="+" />',
    "<StatCounter end={1000} label={t('home.activeUsers')} suffix=\"+\" />"
)

replace(
    '<StatCounter end={50} label="运营换电站" suffix="+" />',
    "<StatCounter end={50} label={t('home.operatingStations')} suffix=\"+\" />"
)

replace(
    '<StatCounter end={38} label="年化收益率" suffix="%" />',
    "<StatCounter end={38} label={t('home.annualReturn')} suffix=\"%\" />"
)

# CTA section
replace(
    '<h2 className="text-3xl md:text-4xl font-bold mb-4">加入 1kWh 电池资产平台</h2>',
    "<h2 className=\"text-3xl md:text-4xl font-bold mb-4\">{t('home.ctaTitle')}</h2>"
)

replace(
    '<p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">管理好每1度电，1度电也能创造价值。加入 1kWh，让每一度电都为你赚钱。</p>',
    "<p className=\"text-gray-400 text-lg mb-8 max-w-2xl mx-auto\">{t('home.ctaDesc')}</p>"
)

# CTA buttons (logged out)
replace(
    '<Link href="/register" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">\n                免费注册 <ArrowRight className="ml-2 h-5 w-5" />\n              </Link>',
    "<Link href=\"/register\" className=\"inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg\">\n                {t('home.freeRegister')} <ArrowRight className=\"ml-2 h-5 w-5\" />\n              </Link>"
)

replace(
    '<Link href="/invest" className="inline-flex items-center border-2 border-white/20 text-white font-bold px-10 py-4 rounded-xl hover:bg-white/10 transition text-lg">\n                了解更多\n              </Link>',
    "<Link href=\"/invest\" className=\"inline-flex items-center border-2 border-white/20 text-white font-bold px-10 py-4 rounded-xl hover:bg-white/10 transition text-lg\">\n                {t('home.learnMore')}\n              </Link>"
)

# CTA button (logged in)
replace(
    '<Link href="/invest" className="inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg">\n              进入投资中心 <ArrowRight className="ml-2 h-5 w-5" />\n            </Link>',
    "<Link href=\"/invest\" className=\"inline-flex items-center bg-white text-gray-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg text-lg\">\n              {t('home.enterInvestCenter')} <ArrowRight className=\"ml-2 h-5 w-5\" />\n            </Link>"
)

# Write back
with open(PAGE_JS, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nDone. {changes} replacements made.")
