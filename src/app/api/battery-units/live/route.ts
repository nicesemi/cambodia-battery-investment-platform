import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

// ─── 大巴 GPS 模拟引擎 ──────────────────────────────────
// BAT-BUS-* 电池单元沿孟加拉主要城市循环移动
const BUS_ROUTE = [
  { city: '达卡 (Dhaka)',     lat: 23.8103, lng: 90.4125 },
  { city: '吉大港 (Chittagong)', lat: 22.3569, lng: 91.7832 },
  { city: '库尔纳 (Khulna)',    lat: 22.8456, lng: 89.5403 },
  { city: '拉杰沙希 (Rajshahi)', lat: 24.3745, lng: 88.6042 },
  { city: '锡尔赫特 (Sylhet)',   lat: 24.8949, lng: 91.8687 },
]

// ─── 货车 GPS 模拟引擎 ──────────────────────────────────
// BAT-TRUCK-* 电池单元沿柬埔寨主要货运线路循环移动
const TRUCK_ROUTE = [
  { city: '金边 (Phnom Penh)',       lat: 11.5564, lng: 104.9282 },
  { city: '西哈努克 (Sihanoukville)',  lat: 10.6253, lng: 103.5234 },
  { city: '贡布 (Kampot)',            lat: 10.6104, lng: 104.1815 },
  { city: '金边 (Phnom Penh)',       lat: 11.5564, lng: 104.9282 },
  { city: '暹粒 (Siem Reap)',        lat: 13.3633, lng: 103.8564 },
  { city: '马德望 (Battambang)',     lat: 13.0957, lng: 103.2022 },
  { city: '金边 (Phnom Penh)',       lat: 11.5564, lng: 104.9282 },
]

const SEGMENT_DURATION_MS = 45_000 // 每段城市间旅程 45 秒（模拟加速）
const BUS_TOTAL_LOOP_MS = BUS_ROUTE.length * SEGMENT_DURATION_MS
const TRUCK_TOTAL_LOOP_MS = TRUCK_ROUTE.length * SEGMENT_DURATION_MS

/** 线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 在路线上计算当前 GPS 位置 */
function computeRoutePosition(
  route: Array<{ city: string; lat: number; lng: number }>,
  totalLoopMs: number,
  offsetMs: number,
): { lat: number; lng: number; city: string; route: typeof route } {
  const now = Date.now() - offsetMs
  const loopProgress = ((now % totalLoopMs) + totalLoopMs) % totalLoopMs / totalLoopMs
  const rawSegment = loopProgress * route.length
  const segIndex = Math.floor(rawSegment) % route.length
  const segT = rawSegment - Math.floor(rawSegment)
  const nextIndex = (segIndex + 1) % route.length
  return {
    lat: lerp(route[segIndex].lat, route[nextIndex].lat, segT),
    lng: lerp(route[segIndex].lng, route[nextIndex].lng, segT),
    city: route[segIndex].city,
    route,
  }
}

/** 基于真实电池单元数据构建换电柜槽位
 *  @param slotCount  - 总仓位数（来自 operation_sites.cabinet_slots）
 *  @param units      - 已分配到此站点的真实电池单元数组（有 sensor 数据）
 *  @param occupiedCount - 已占用槽位数（来自 operation_sites.battery_count）
 *
 *  槽位分配规则：
 *    1. 前 units.length 个槽位 = 真实电池单元传感器数据
 *    2. 接下来 (occupiedCount - units.length) 个槽位 = 占位数据（无真实 sensor）
 *    3. 剩余 (slotCount - occupiedCount) 个槽位 = 空闲
 */
function buildCabinetSlots(
  slotCount: number,
  units: any[],
  occupiedCount?: number,
): Array<Record<string, unknown>> {
  const slots: Array<Record<string, unknown>> = []
  const realUnitCount = units.length
  // occupiedCount 至少为已分配单元数，兜底为 units.length
  const effectiveOccupied = Math.max(realUnitCount, occupiedCount ?? realUnitCount)

  for (let i = 1; i <= slotCount; i++) {
    const unitIndex = i - 1

    if (unitIndex < realUnitCount) {
      // ── 真实电池单元 ──
      const unit = units[unitIndex]
      const soc = unit.soc ?? null
      slots.push({
        slot_number: i,
        status: 'occupied',
        battery_unit_code: unit.unit_code || null,
        sensor_battery_level: soc,
        sensor_temperature: unit.temperature ?? null,
        sensor_voltage: typeof unit.voltage === 'string' ? parseFloat(unit.voltage) || null : (unit.voltage ?? null),
        sensor_current: null,
        charging: unit.status === 'normal' && soc !== null && soc < 80,
        last_swap_time: unit.last_maintenance || null,
      })
    } else if (unitIndex < effectiveOccupied) {
      // ── 占位数据（已占用但无真实电池单元分配）──
      slots.push({
        slot_number: i,
        status: 'occupied',
        battery_unit_code: null,
        sensor_battery_level: null,
        sensor_temperature: null,
        sensor_voltage: null,
        sensor_current: null,
        charging: false,
        last_swap_time: null,
      })
    } else {
      // ── 空闲槽位 ──
      slots.push({
        slot_number: i,
        status: 'empty',
      })
    }
  }
  return slots
}

/** 生成集装箱储能传感器模拟数据 */
function generateContainerSensors(unitCode: string): Record<string, unknown> {
  return {
    unit_code: unitCode,
    soc: Math.round(60 + Math.random() * 35),
    temperature: +(18 + Math.random() * 25).toFixed(1),
    voltage_total: +(380 + Math.random() * 20).toFixed(1),
    current: +(Math.random() * 50).toFixed(1),
    power_kw: +(Math.random() * 20000).toFixed(0),
    energy_throughput_kwh: +(Math.random() * 50000).toFixed(0),
    cell_voltage_min: +(3.1 + Math.random() * 0.3).toFixed(2),
    cell_voltage_max: +(3.4 + Math.random() * 0.3).toFixed(2),
    cell_temp_max: +(25 + Math.random() * 10).toFixed(1),
    insulation_resistance_kohm: Math.round(500 + Math.random() * 200),
    status: Math.random() > 0.1 ? 'normal' : (Math.random() > 0.5 ? 'warning' : 'critical'),
    last_online: new Date(Date.now() - Math.random() * 300000).toISOString(),
  }
}

export async function GET(_request: Request) {
  try {
    // ═══════════════════════════════════════════════════════
    // 第 1 批：并行查询 — 已分配电池 / 未售电池 / 仓库 / 换电柜站点
    // ═══════════════════════════════════════════════════════
    const [
      assignedResult,
      soldByNameResult,
      unsoldResult,
      warehousesResult,
      cabinetSitesResult,
    ] = await Promise.all([
      // 1a. 已分配到站点的 battery_units（site_id 不为空）
      supabase
        .from('battery_units')
        .select(`
          id,
          unit_code,
          status,
          sensor_battery_level,
          sensor_temperature,
          sensor_cycle_count,
          sensor_last_online,
          site_id,
          site_name,
          updated_at,
          battery_asset_id,
          investor_id
        `)
        .not('site_id', 'is', null)
        .order('unit_code', { ascending: true }),

      // 1a2. 已售电池中 site_id 为空但 site_name 有值的（派工后 site_id 未回写）
      supabase
        .from('battery_units')
        .select(`
          id,
          unit_code,
          status,
          sensor_battery_level,
          sensor_temperature,
          sensor_cycle_count,
          sensor_last_online,
          site_id,
          site_name,
          updated_at,
          battery_asset_id,
          investor_id
        `)
        .eq('status', 'sold')
        .is('site_id', null)
        .not('site_name', 'is', null)
        .order('unit_code', { ascending: true }),

      // 1b. 未售电池（仓库）：status='available' 且 site_id IS NULL
      supabase
        .from('battery_units')
        .select(`
          id,
          unit_code,
          status,
          sensor_battery_level,
          sensor_temperature,
          sensor_cycle_count,
          sensor_last_online,
          updated_at,
          battery_asset_id
        `)
        .eq('status', 'available')
        .is('site_id', null)
        .order('unit_code', { ascending: true }),

      // 1c. 仓库列表
      supabase
        .from('warehouses')
        .select('id, warehouse_code, name, address, created_at'),

      // 1d. 全部运营站点（用 admin 绕过 RLS 以读取加盟站点）
      getSupabaseAdmin()
        .from('operation_sites')
        .select('id, name, name_i18n, site_code, site_type, latitude, longitude, city, country, country_i18n, city_i18n, cabinet_slots, battery_count'),
    ])

    const { data: unitsRaw, error: unitsError } = assignedResult
    const { data: soldByNameUnits, error: soldByNameError } = soldByNameResult
    const { data: unsoldUnits, error: unsoldError } = unsoldResult
    const { data: warehouses, error: warehousesError } = warehousesResult
    const { data: cabinetSites, error: cabinetSitesError } = cabinetSitesResult

    if (unitsError) return serverError(unitsError.message)
    if (soldByNameError) return serverError(soldByNameError.message)
    if (unsoldError) return serverError(unsoldError.message)
    if (warehousesError) return serverError(warehousesError.message)
    if (cabinetSitesError) return serverError(cabinetSitesError.message)

    // 合并两组已分配电池：site_id 明确的 + 通过 site_name 匹配的
    const units = [...(unitsRaw || []), ...(soldByNameUnits || [])]

    // 若没有任何数据则返回空结构
    if ((!units || units.length === 0) && (!unsoldUnits || unsoldUnits.length === 0)) {
      return ok({
        sites: [],
        units: [],
        warehouses: [],
        total_batteries: 0,
        total_sites: 0,
        unsold_total: 0,
      })
    }

    // ═══════════════════════════════════════════════════════
    // 第 2 批：基于第 1 批结果推导依赖 ID/Name
    // ═══════════════════════════════════════════════════════
    // 从 site_id 明确的 units 中提取 siteIds
    const assignedSiteIds = unitsRaw
      ? Array.from(new Set(unitsRaw.map((u: any) => u.site_id).filter(Boolean)))
      : []
    // 从 sold-by-name 单元中提取 site_name（用于名称匹配）
    const soldSiteNames: string[] = soldByNameUnits
      ? Array.from(new Set(soldByNameUnits.map((u: any) => u.site_name).filter(Boolean)))
      : []
    const assignedAssetIds = units
      ? Array.from(new Set(units.map((u: any) => u.battery_asset_id).filter(Boolean)))
      : []
    const unsoldAssetIds = unsoldUnits
      ? Array.from(new Set(unsoldUnits.map((u: any) => u.battery_asset_id).filter(Boolean)))
      : []
    const allAssetIds = Array.from(new Set([...assignedAssetIds, ...unsoldAssetIds]))

    // ═══════════════════════════════════════════════════════
    // 第 3 批：并行查询 — 站点（ID + Name）/ 资产
    // ═══════════════════════════════════════════════════════
    const [sitesResult, sitesByNameResult, assetsResult] = await Promise.all([
      // 已分配电池所在站点（按 site_id）- 用 admin 绕过 RLS
      assignedSiteIds.length > 0
        ? getSupabaseAdmin()
            .from('operation_sites')
            .select('id, name, name_i18n, site_code, site_type, latitude, longitude, city, country, country_i18n, city_i18n')
            .in('id', assignedSiteIds)
        : Promise.resolve({ data: [], error: null }),

      // 已售电池通过 site_name 匹配站点 - 用 admin 绕过 RLS
      soldSiteNames.length > 0
        ? getSupabaseAdmin()
            .from('operation_sites')
            .select('id, name, name_i18n, site_code, site_type, latitude, longitude, city, country, country_i18n, city_i18n')
            .in('name', soldSiteNames)
        : Promise.resolve({ data: [], error: null }),

      // 所有关联的 battery_assets
      allAssetIds.length > 0
        ? supabase
            .from('battery_assets')
            .select('id, asset_code, battery_type, battery_type_id, location, warehouse_id')
            .in('id', allAssetIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const { data: sites, error: sitesError } = sitesResult
    const { data: sitesByName, error: sitesByNameError } = sitesByNameResult
    const { data: assets, error: assetsError } = assetsResult

    if (sitesError) return serverError(sitesError.message)
    if (sitesByNameError) return serverError(sitesByNameError.message)
    if (assetsError) return serverError(assetsError.message)

    // ═══════════════════════════════════════════════════════
    // 第 4 批：battery_types（依赖 battery_type_id）
    // ═══════════════════════════════════════════════════════
    let typeMap: Record<string, any> = {}
    if (assets && assets.length > 0) {
      const typeIds = Array.from(
        new Set(assets.map((a: any) => a.battery_type_id).filter(Boolean)),
      )
      if (typeIds.length > 0) {
        const { data: types } = await supabase
          .from('battery_types')
          .select('id, name, voltage')
          .in('id', typeIds)
        if (types) {
          types.forEach((t: any) => {
            typeMap[t.id] = t
          })
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // 构建资产 Map
    // ═══════════════════════════════════════════════════════
    const assetMap: Record<string, any> = {}
    if (assets) {
      assets.forEach((a: any) => {
        assetMap[a.id] = {
          asset_code: a.asset_code || '',
          battery_type: a.battery_type || (typeMap[a.battery_type_id]?.name || '未知型号'),
          voltage: typeMap[a.battery_type_id]?.voltage || '—',
          location: a.location || '',
          warehouse_id: a.warehouse_id || null,
        }
      })
    }

    // ═══════════════════════════════════════════════════════
    // 构建站点 Map（已分配电池的站点，含名称匹配）
    // ═══════════════════════════════════════════════════════
    const siteMap: Record<string, any> = {}
    // siteNameToId：用于 sold-by-name 单元的 site_name → site_id 解析
    const siteNameToId: Record<string, number> = {}
    const buildSiteMap = (sitesList: any[] | null) => {
      if (!sitesList) return
      sitesList.forEach((s: any) => {
        siteMap[s.id] = s
        if (s.name) siteNameToId[s.name] = s.id
      })
    }
    buildSiteMap(sites)
    buildSiteMap(sitesByName)

    // ═══════════════════════════════════════════════════════
    // 构建运营站点 Map（按 id 索引，用于匹配，含 battery_count）
    // ═══════════════════════════════════════════════════════
    const cabSiteMap: Record<string, any> = {}
    if (cabinetSites) {
      cabinetSites.forEach((cs: any) => {
        cabSiteMap[cs.id] = cs
      })
    }

    // 辅助：从 operation_sites 获取仓位数（cabinet_slots 存的是整数仓位数）
    const getSlotCount = (siteId: string | number): number => {
      const cs = cabSiteMap[siteId]
      if (cs && cs.cabinet_slots != null) {
        const val = typeof cs.cabinet_slots === 'number' ? cs.cabinet_slots : parseInt(String(cs.cabinet_slots))
        if (!isNaN(val) && val > 0) return val
      }
      return 6
    }

    // ═══════════════════════════════════════════════════════
    // 构建仓库 Map
    // ═══════════════════════════════════════════════════════
    const warehouseMap: Record<string, any> = {}
    if (warehouses) {
      warehouses.forEach((w: any) => {
        warehouseMap[w.id] = {
          id: w.id,
          warehouse_code: w.warehouse_code,
          name: w.name,
          address: w.address || '',
          // warehouse 可能没有 lat/lng，用 battery_assets.location 作为标识
          location: '',
          unsold_batteries: [] as any[],
          battery_count: 0,
        }
      })
    }

    // ═══════════════════════════════════════════════════════
    // 工具函数：状态推算
    // ═══════════════════════════════════════════════════════
    // 单传感器健康值：green=正常, yellow=注意, orange=警告, red=严重
    const sensorHealth = (value: number | null, thresholds: { green: number; yellow: number; orange: number }, direction: 'gt' | 'lt'): 'red' | 'orange' | 'yellow' | 'green' | null => {
      if (value == null) return null
      if (direction === 'gt') {
        if (value > thresholds.green) return 'green'
        if (value > thresholds.yellow) return 'yellow'
        if (value > thresholds.orange) return 'orange'
        return 'red'
      } else {
        if (value < thresholds.green) return 'green'
        if (value < thresholds.yellow) return 'yellow'
        if (value < thresholds.orange) return 'orange'
        return 'red'
      }
    }

    const computeOverallHealth = (soc: number | null, temp: number | null, cycles: number | null): 'normal' | 'warning' | 'critical' => {
      const socH = sensorHealth(soc, { green: 50, yellow: 30, orange: 10 }, 'gt')
      // temperature: <0 or >45 red, 0-25 green, 25-35 yellow, 35-45 orange
      let tempH: 'red' | 'orange' | 'yellow' | 'green' | null = null
      if (temp != null) {
        if (temp < 0 || temp > 45) tempH = 'red'
        else if (temp >= 0 && temp < 25) tempH = 'green'
        else if (temp >= 25 && temp < 35) tempH = 'yellow'
        else tempH = 'orange'
      }
      const cyclesH = sensorHealth(cycles, { green: 300, yellow: 500, orange: 1000 }, 'lt')
      const healths = [socH, tempH, cyclesH].filter(Boolean) as string[]
      if (healths.includes('red')) return 'critical'
      if (healths.includes('orange')) return 'critical'
      if (healths.includes('yellow')) return 'warning'
      return 'normal'
    }

    // ═══════════════════════════════════════════════════════
    // 按站点分组已分配电池（含动态 GPS）
    // ═══════════════════════════════════════════════════════
    const siteGroups: Record<string, any> = {}
    const allUnits: any[] = []
    let busIndex = 0
    let truckIndex = 0

    if (units) {
      units.forEach((u: any) => {
        const assetInfo = assetMap[u.battery_asset_id] || {
          battery_type: '—',
          voltage: '—',
          asset_code: '',
          location: '',
        }
        // 解析 site_id：优先用已有值，否则通过 site_name 查 siteNameToId
        // 注意：battery_units.site_id 存储为字符串，需转为数字以匹配 siteMap/cabSiteMap 的整数 key
        let resolvedSiteId: number | null = u.site_id != null ? Number(u.site_id) : null
        if (resolvedSiteId == null && u.site_name) {
          resolvedSiteId = siteNameToId[u.site_name] ?? null
        }
        const site = resolvedSiteId != null ? (siteMap[resolvedSiteId] || {}) : {}
        const displayStatus = computeOverallHealth(u.sensor_battery_level, u.sensor_temperature, u.sensor_cycle_count)

        let unitLat: number | null = site.latitude || null
        let unitLng: number | null = site.longitude || null
        let routeData: Array<{ city: string; lat: number; lng: number }> | null = null
        let currentCity: string | null = null

        const unitCode = String(u.unit_code || '')

        // BAT-BUS-* 动态 GPS
        if (unitCode.startsWith('BAT-BUS')) {
          const offsetMs = (busIndex * SEGMENT_DURATION_MS) % BUS_TOTAL_LOOP_MS
          const pos = computeRoutePosition(BUS_ROUTE, BUS_TOTAL_LOOP_MS, offsetMs)
          unitLat = pos.lat
          unitLng = pos.lng
          currentCity = pos.city
          routeData = BUS_ROUTE
          busIndex++
        }

        // BAT-TRUCK-* 动态 GPS
        if (unitCode.startsWith('BAT-TRUCK')) {
          const offsetMs = (truckIndex * SEGMENT_DURATION_MS) % TRUCK_TOTAL_LOOP_MS
          const pos = computeRoutePosition(TRUCK_ROUTE, TRUCK_TOTAL_LOOP_MS, offsetMs)
          unitLat = pos.lat
          unitLng = pos.lng
          currentCity = pos.city
          routeData = TRUCK_ROUTE
          truckIndex++
        }

        // 集装箱储能传感器
        const isContainer =
          assetInfo.battery_type &&
          String(assetInfo.battery_type).toLowerCase().includes('container')
        const containerSensors = isContainer ? generateContainerSensors(unitCode) : null

        const unitData: Record<string, any> = {
          id: u.id,
          unit_code: u.unit_code,
          asset_code: assetInfo.asset_code || '',
          battery_type: assetInfo.battery_type,
          status: displayStatus,
          voltage: assetInfo.voltage,
          temperature: u.sensor_temperature,
          soc: u.sensor_battery_level,
          soh: computeOverallHealth(u.sensor_battery_level, u.sensor_temperature, u.sensor_cycle_count),
          cycle_count: u.sensor_cycle_count,
          last_maintenance: u.updated_at,
          site_id: resolvedSiteId,
          site_name: site.name || '',
          site_code: site.site_code || '',
          latitude: unitLat,
          longitude: unitLng,
          site_type: site.site_type || '',
          db_status: u.status,
          investor_id: u.investor_id,
          battery_asset_id: u.battery_asset_id,
        }

        // 扩展车辆线路数据
        if (routeData) {
          unitData.route = routeData
          unitData.current_city = currentCity
          unitData.vehicle_type = unitCode.startsWith('BAT-BUS') ? 'bus' : 'truck'
        }

        // 扩展集装箱储能传感器数据
        if (containerSensors) {
          unitData.container_sensors = containerSensors
        }

        allUnits.push(unitData)

        const siteKey = resolvedSiteId != null ? String(resolvedSiteId) : '__unresolved__'
        if (!siteGroups[siteKey]) {
          // 判断是否为换电柜站点
          const cabSite = resolvedSiteId != null ? cabSiteMap[resolvedSiteId] : null
          const isCabinetSite = cabSite || (site.site_type && String(site.site_type).includes('换电'))

          const cabFromDb = cabSite?.cabinet_slots != null ? true : false

          siteGroups[siteKey] = {
            site_id: resolvedSiteId,
            site_name: site.name || '',
            name_i18n: site.name_i18n || null,
            site_code: site.site_code || '',
            site_type: site.site_type || '',
            latitude: site.latitude || null,
            longitude: site.longitude || null,
            city: site.city || '',
            city_i18n: site.city_i18n || null,
            country: site.country || '',
            country_i18n: site.country_i18n || null,
            battery_count: 0,
            real_battery_count: (resolvedSiteId != null ? cabSiteMap[resolvedSiteId]?.battery_count : null) ?? 0,
            units: [] as any[],
            cabinet_slots: undefined,
            _isCabinetSite: isCabinetSite,
            _cabinetFromDb: isCabinetSite ? (cabSite?.cabinet_slots != null) : undefined,
          }
        }
        siteGroups[siteKey].units.push(unitData)
        siteGroups[siteKey].battery_count = siteGroups[siteKey].units.length
      })
    }

    // ═══════════════════════════════════════════════════════
    // 后处理：按 operation_sites 仓数 + 真实电池单元构建换电柜槽位
    // ═══════════════════════════════════════════════════════
    Object.keys(siteGroups).forEach((key) => {
      const site = siteGroups[key]
      if (site._isCabinetSite) {
        const slotCount = getSlotCount(site.site_id)
        site.cabinet_slots = buildCabinetSlots(slotCount, site.units, site.real_battery_count)
      }
      delete site._isCabinetSite
      delete site._cabinetFromDb
    })

    // ═══════════════════════════════════════════════════════
    // 补充：仅换电柜站点（无已分配电池的独立柜站点）
    // ═══════════════════════════════════════════════════════
    if (cabinetSites) {
      cabinetSites.forEach((cs: any) => {
        const key = String(cs.id)
        if (!siteGroups[key]) {
          const slotCount = getSlotCount(cs.id)
          const cabFromDb = cs.cabinet_slots != null ? true : false

          siteGroups[key] = {
            site_id: cs.id,
            site_name: cs.name || '',
            name_i18n: cs.name_i18n || null,
            site_code: cs.site_code || '',
            site_type: cs.site_type || '',
            latitude: cs.latitude || null,
            longitude: cs.longitude || null,
            city: cs.city || '',
            city_i18n: cs.city_i18n || null,
            country: cs.country || '',
            country_i18n: cs.country_i18n || null,
            battery_count: 0,
            real_battery_count: cs.battery_count ?? 0,
            units: [],
            cabinet_slots: buildCabinetSlots(slotCount, [], cs.battery_count ?? 0),
          }
        }
      })
    }

    // ═══════════════════════════════════════════════════════
    // 未售电池按仓库分组
    // ═══════════════════════════════════════════════════════
    const unsoldWarehouseMap: Record<string, any> = {} // key = warehouse_id or '__unassigned__'

    if (unsoldUnits) {
      unsoldUnits.forEach((u: any) => {
        const assetInfo = assetMap[u.battery_asset_id] || {
          battery_type: '—',
          voltage: '—',
          asset_code: '',
          location: '',
          warehouse_id: null,
        }
        const displayStatus = computeOverallHealth(u.sensor_battery_level, u.sensor_temperature, u.sensor_cycle_count)
        const whId = assetInfo.warehouse_id || '__unassigned__'
        const locationLabel = assetInfo.location || '未知仓库'

        if (!unsoldWarehouseMap[whId]) {
          const wh = whId !== '__unassigned__' ? warehouseMap[whId] : null
          unsoldWarehouseMap[whId] = {
            id: wh?.id || whId,
            name: wh?.name || `未分配仓库 (${locationLabel})`,
            warehouse_code: wh?.warehouse_code || '',
            address: wh?.address || '',
            location: locationLabel,
            unsold_batteries: [] as any[],
            battery_count: 0,
          }
        }

        // 集装箱储能传感器
        const isContainer =
          assetInfo.battery_type &&
          String(assetInfo.battery_type).toLowerCase().includes('container')
        const containerSensors = isContainer
          ? generateContainerSensors(String(u.unit_code || ''))
          : null

        const batteryData: Record<string, any> = {
          id: u.id,
          unit_code: u.unit_code,
          asset_code: assetInfo.asset_code,
          battery_type: assetInfo.battery_type,
          status: displayStatus,
          voltage: assetInfo.voltage,
          temperature: u.sensor_temperature,
          soc: u.sensor_battery_level,
          soh: computeOverallHealth(u.sensor_battery_level, u.sensor_temperature, u.sensor_cycle_count),
          cycle_count: u.sensor_cycle_count,
          last_maintenance: u.updated_at,
        }

        if (containerSensors) {
          batteryData.container_sensors = containerSensors
        }

        unsoldWarehouseMap[whId].unsold_batteries.push(batteryData)
        unsoldWarehouseMap[whId].battery_count = unsoldWarehouseMap[whId].unsold_batteries.length
      })
    }

    // 补充：有仓库但无未售电池的仓库也展示（battery_count=0）
    if (warehouses) {
      warehouses.forEach((w: any) => {
        if (!unsoldWarehouseMap[w.id]) {
          unsoldWarehouseMap[w.id] = {
            id: w.id,
            name: w.name,
            warehouse_code: w.warehouse_code,
            address: w.address || '',
            location: '',
            unsold_batteries: [],
            battery_count: 0,
          }
        }
      })
    }

    // ═══════════════════════════════════════════════════════
    // 返回增强响应（site_type 直接从 operation_sites 表取值，不做任何二次推断）
    // ═══════════════════════════════════════════════════════
    return ok({
      sites: Object.values(siteGroups),
      units: allUnits,
      warehouses: Object.values(unsoldWarehouseMap),
      total_batteries: allUnits.length,
      total_sites: Object.keys(siteGroups).length,
      unsold_total: unsoldUnits ? unsoldUnits.length : 0,
    })
  } catch (e: any) {
    return serverError()
  }
}
