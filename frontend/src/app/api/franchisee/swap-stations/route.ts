import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * 基于真实电池单元数据构建换电柜槽位
 * 完全对齐首页 /api/battery-units/live 的 buildCabinetSlots 模式
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
      slots.push({
        slot_number: i,
        status: 'empty',
      })
    }
  }
  return slots
}

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

    // ═══════════════════════════════════════════════════════
    // 第一步：匹配用户的站点（加盟申请 / 投资人电池）
    // ═══════════════════════════════════════════════════════
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
      const franchiseLocations = (franchiseApps || []).map((a: any) => a.location).filter(Boolean)
      const { data: sites, error: siteErr } = await adminClient
        .from('operation_sites')
        .select('*')
        .eq('is_active', true)
        .or('site_type.eq.swap_station')

      if (siteErr) return serverError(siteErr.message)

      matchedSites = (sites || []).filter((s: any) => {
        if (!s.name || franchiseLocations.length === 0) return false
        return franchiseLocations.some((loc: string) =>
          s.name === `${loc}加盟换电站` || s.name === `${loc} 加盟换电站`,
        )
      })
    } else if (user.role === 'investor') {
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

    // ═══════════════════════════════════════════════════════
    // 第二步：完全对齐首页 /api/battery-units/live 的电池查询
    //         不再逐站 eq，而是全量 not null + sold-by-name 两组查询
    // ═══════════════════════════════════════════════════════
    const matchedSiteIdSet = new Set(matchedSites.map((s: any) => Number(s.id)))

    // 构建 site_name → site_id 映射（用于 sold-by-name 单元解析）
    const siteNameToId: Record<string, number> = {}
    for (const s of matchedSites) {
      if (s.name) siteNameToId[s.name] = Number(s.id)
    }

    const [assignedRes, soldByNameRes] = await Promise.all([
      // 查询 1：已分配到站点的电池（site_id 不为空）— 跟首页一模一样
      adminClient
        .from('battery_units')
        .select(`
          unit_code,
          status,
          sensor_battery_level,
          sensor_temperature,
          sensor_cycle_count,
          site_id,
          site_name,
          updated_at
        `)
        .not('site_id', 'is', null)
        .order('unit_code', { ascending: true }),

      // 查询 2：已售电池中 site_id 为空但 site_name 有值的（派工后 site_id 未回写）
      // 仅查询与 matchedSites 相关的 site_name，避免全表扫描无关站点
      adminClient
        .from('battery_units')
        .select(`
          unit_code,
          status,
          sensor_battery_level,
          sensor_temperature,
          sensor_cycle_count,
          site_id,
          site_name,
          updated_at
        `)
        .eq('status', 'sold')
        .is('site_id', null)
        .in('site_name', Object.keys(siteNameToId))
        .order('unit_code', { ascending: true }),
    ])

    // 按 site_id 分组电池单元（对齐首页逻辑：site_id 存为字符串需转 Number）
    const unitsBySiteId: Record<number, any[]> = {}
    for (const key of matchedSiteIdSet) {
      unitsBySiteId[key] = []
    }

    // 处理查询 1 结果
    for (const u of (assignedRes.data || [])) {
      const sid = u.site_id != null ? Number(u.site_id) : null
      if (sid != null && matchedSiteIdSet.has(sid)) {
        unitsBySiteId[sid].push(u)
      }
    }

    // 处理查询 2 结果（通过 site_name 解析 site_id）
    for (const u of (soldByNameRes.data || [])) {
      const sid = siteNameToId[u.site_name]
      if (sid != null && matchedSiteIdSet.has(sid)) {
        unitsBySiteId[sid].push(u)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 第三步：模板数据 + 按站点构建 cabinet_slots
    // ═══════════════════════════════════════════════════════
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

    const enriched = matchedSites.map((site: any) => {
      const slotCount = getSlotCount(site)
      const rawUnits = unitsBySiteId[Number(site.id)] || []

      // 去重（按 unit_code）
      const seen = new Set<string>()
      const deduped = rawUnits.filter((u: any) => {
        const key = u.unit_code
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

      // 字段映射：数据库列名 → buildCabinetSlots 入参约定
      const units = deduped.map((u: any) => ({
        unit_code: u.unit_code,
        soc: u.sensor_battery_level ?? null,
        temperature: u.sensor_temperature ?? null,
        voltage: null, // battery_units 表无 voltage 列，首页也不传
        status: u.status,
        last_maintenance: u.updated_at ?? null,
      }))

      const cabinetSlots = buildCabinetSlots(slotCount, units, 0)
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
