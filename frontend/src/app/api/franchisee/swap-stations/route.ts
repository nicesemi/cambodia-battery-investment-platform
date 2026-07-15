import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * 基于真实电池单元数据构建换电柜槽位
 * 对齐首页 /api/battery-units/live 的 buildCabinetSlots 模式
 *
 * @param slotCount  - 总槽位数（来自 operation_sites.cabinet_slots）
 * @param units      - 已分配到此站点的真实电池单元数组（带 sensor 数据）
 * @param occupiedCount - 据库记录的已占用槽位数（operation_sites.battery_count）
 *
 * 槽位分配规则：
 *   1. 前 units.length 个槽位 = 真实电池单元传感器数据
 *   2. 接下来 (occupiedCount - units.length) 个槽位 = 占位数据（无真实 sensor）
 *   3. 剩余 (slotCount - occupiedCount) 个槽位 = 空闲
 */
function buildCabinetSlots(
  slotCount: number,
  units: any[],
  occupiedCount?: number,
): Array<Record<string, unknown>> {
  const slots: Array<Record<string, unknown>> = []
  const realUnitCount = units.length
  const effectiveOccupied = Math.max(realUnitCount, occupiedCount ?? realUnitCount)

  for (let i = 1; i <= slotCount; i++) {
    const unitIndex = i - 1

    if (unitIndex < realUnitCount) {
      // 真实电池单元
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
      // 占位数据（已占用但无真实电池单元分配）
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
      // 空闲槽位
      slots.push({
        slot_number: i,
        status: 'empty',
      })
    }
  }
  return slots
}

/** 从 operation_sites 读取 cabinet_slots 整数，fallback=6 */
function getSlotCount(site: any): number {
  if (site && site.cabinet_slots != null) {
    const val = typeof site.cabinet_slots === 'number' ? site.cabinet_slots : parseInt(String(site.cabinet_slots))
    if (!isNaN(val) && val > 0) return val
  }
  return 6
}

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator' && user.role !== 'investor') {
      return unauthorized('Access denied')
    }

    const adminClient = getSupabaseAdmin()

    // ── 第一步：先查用户是否有加盟申请（无论 user.role 是什么）──
    const { data: franchiseApps, error: appErr } = await adminClient
      .from('franchise_applications')
      .select('id, location')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (appErr) return serverError(appErr.message)

    const { data: franchiseeApps } = await adminClient
      .from('franchisee_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    const allAppIds = [
      ...(franchiseApps || []).map((a: any) => a.id),
      ...(franchiseeApps || []).map((a: any) => a.id),
    ]

    let matchedSites: any[] = []

    if (allAppIds.length > 0) {
      // ── 有加盟申请：通过 location 匹配 operation_sites.name（精确匹配自己的站）──
      const franchiseLocations = (franchiseApps || []).map((a: any) => a.location).filter(Boolean)
      const { data: sites, error: siteErr } = await adminClient
        .from('operation_sites')
        .select('*')
        .eq('is_active', true)
        .or('site_type.eq.swap_station')

      if (siteErr) return serverError(siteErr.message)

      matchedSites = (sites || []).filter((s: any) => {
        if (!s.name || franchiseLocations.length === 0) return false
        // 兼容两种命名格式：${loc}加盟换电站（无空格）和 ${loc} 加盟换电站（有空格）
        return franchiseLocations.some((loc: string) =>
          s.name === `${loc}加盟换电站` || s.name === `${loc} 加盟换电站`,
        )
      })
    } else if (user.role === 'investor') {
      // ── 无加盟申请的纯投资人：通过 investor_battery_units → battery_units.site_id 找所有部署了电池的站 ──
      const { data: ibuRows } = await adminClient
        .from('investor_battery_units')
        .select('battery_unit_id')
        .eq('investor_id', user.id)

      if (!ibuRows || ibuRows.length === 0) return ok({ stations: [] })

      const buIds = ibuRows.map((r: any) => r.battery_unit_id)

      const { data: bus } = await adminClient
        .from('battery_units')
        .select('site_id')
        .in('id', buIds)
        .not('site_id', 'is', null)

      if (!bus || bus.length === 0) return ok({ stations: [] })

      const siteIds = [...new Set(bus.map((b: any) => b.site_id))]

      const { data: sites } = await adminClient
        .from('operation_sites')
        .select('*')
        .in('id', siteIds)
        .eq('is_active', true)
        .or('site_type.eq.swap_station')

      matchedSites = sites || []
    }

    if (matchedSites.length === 0) {
      return ok({ stations: [] })
    }

    // 3. 批量查询模板数据
    const templateIds = [...new Set(matchedSites.map((s: any) => s.template_id).filter(Boolean))]
    const templateMap: Record<string, any> = {}
    if (templateIds.length > 0) {
      const { data: templates } = await adminClient
        .from('swap_station_templates')
        .select('*')
        .in('id', templateIds)
      for (const t of (templates || [])) {
        templateMap[t.id] = t
      }
    }

    // ── 4. 批量查询所有匹配站点的真实电池单元 ──
    //    对齐首页 /api/battery-units/live 的批量查询模式，避免逐站查询
    //    带来的 site.id 类型不匹配 / site_name 格式分歧问题。
    const matchedSiteIds = matchedSites.map((s: any) => s.id)

    // 收集所有可能的 site_name 变体（原始 + 空格变体），用于 IN 批量查询
    const siteNameVariants: string[] = []
    matchedSites.forEach((s: any) => {
      if (!s.name) return
      siteNameVariants.push(s.name)
      if (s.name.includes('加盟换电站')) {
        const alt = s.name.includes(' 加盟换电站')
          ? s.name.replace(' 加盟换电站', '加盟换电站')
          : s.name.replace('加盟换电站', ' 加盟换电站')
        siteNameVariants.push(alt)
      }
    })
    const uniqueSiteNames = [...new Set(siteNameVariants)]

    // 两路并行（对齐首页的 assigned + sold-by-name 模式）：
    //   路径 A — site_id 精配
    //   路径 B — site_name 回退（site_id 为空但 site_name 匹配）
    const [unitsByIdRes, unitsByNameRes] = await Promise.all([
      adminClient
        .from('battery_units')
        .select('unit_code, sensor_battery_level, sensor_temperature, voltage, status, updated_at, site_id, site_name')
        .in('site_id', matchedSiteIds)
        .order('unit_code', { ascending: true }),
      uniqueSiteNames.length > 0
        ? adminClient
            .from('battery_units')
            .select('unit_code, sensor_battery_level, sensor_temperature, voltage, status, updated_at, site_id, site_name')
            .is('site_id', null)
            .in('site_name', uniqueSiteNames)
            .order('unit_code', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (unitsByIdRes.error) return serverError(unitsByIdRes.error.message)
    if (unitsByNameRes.error) return serverError(unitsByNameRes.error.message)

    const allUnits = [
      ...(unitsByIdRes.data || []),
      ...(unitsByNameRes.data || []),
    ]

    // 构建 site_id → units 和 site_name → units 的本地索引
    const unitsBySiteId: Record<string, any[]> = {}
    const unitsBySiteName: Record<string, any[]> = {}

    allUnits.forEach((u: any) => {
      const idKey = u.site_id != null ? String(u.site_id) : null
      if (idKey) {
        ;(unitsBySiteId[idKey] ??= []).push(u)
      }
      if (u.site_name) {
        // 同时索引 site_name 本身及空格变体
        const names = [u.site_name]
        if (u.site_name.includes('加盟换电站')) {
          const alt = u.site_name.includes(' 加盟换电站')
            ? u.site_name.replace(' 加盟换电站', '加盟换电站')
            : u.site_name.replace('加盟换电站', ' 加盟换电站')
          names.push(alt)
        }
        names.forEach((n) => {
          ;(unitsBySiteName[n] ??= []).push(u)
        })
      }
    })

    // 去重：同一 unit 可能同时被 site_id 和 site_name 索引命中
    const dedup = (arr: any[]) => {
      const seen = new Set<string>()
      return arr.filter((u: any) => {
        const key = u.unit_code
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // ── 5. 为每个匹配站点组装最终数据 ──
    const enriched = matchedSites.map((site: any) => {
      const slotCount = getSlotCount(site)

      // 拼接：site_id 精确 + site_name 原始 + site_name 空格变体
      const rawUnits = dedup([
        ...(unitsBySiteId[String(site.id)] || []),
        ...(site.name ? (unitsBySiteName[site.name] || []) : []),
      ])

      // 如果 site.name 含"加盟换电站"，额外拉入空格变体对应的 units
      if (site.name && site.name.includes('加盟换电站')) {
        const alt = site.name.includes(' 加盟换电站')
          ? site.name.replace(' 加盟换电站', '加盟换电站')
          : site.name.replace('加盟换电站', ' 加盟换电站')
        rawUnits.push(...(unitsBySiteName[alt] || []))
      }

      // 二次去重（经过拼接后）
      const units = dedup(rawUnits)

      // 映射字段名，对齐 buildCabinetSlots 的入参约定
      const mappedUnits = units.map((u: any) => ({
        unit_code: u.unit_code,
        soc: u.sensor_battery_level ?? null,
        temperature: u.sensor_temperature ?? null,
        voltage: u.voltage ?? null,
        status: u.status,
        last_maintenance: u.updated_at ?? null,
      }))

      const cabinetSlots = buildCabinetSlots(slotCount, mappedUnits, 0)

      const { cabinet_slots: _, ...siteRest } = site
      return {
        ...siteRest,
        cabinet_slots: cabinetSlots,
        template: templateMap[site.template_id] || null,
      }
    })

    return ok({ stations: enriched })
  } catch (e: any) {
    return serverError()
  }
}
