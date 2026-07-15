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

    let matchedSites: any[] = []

    if (user.role === 'investor') {
      // Investor: 通过 investor_battery_units → battery_units.site_id → operation_sites 找换电站
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
    } else {
      // Franchisee/admin/operator: 通过 franchise_applications.location 匹配 operation_sites.name
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

      if (allAppIds.length === 0) return ok({ stations: [] })

      const franchiseLocations = (franchiseApps || []).map((a: any) => a.location).filter(Boolean)
      const { data: sites, error: siteErr } = await adminClient
        .from('operation_sites')
        .select('*')
        .eq('is_active', true)
        .or('site_type.eq.swap_station')

      if (siteErr) return serverError(siteErr.message)

      matchedSites = (sites || []).filter((s: any) => {
        if (!s.name || franchiseLocations.length === 0) return false
        return franchiseLocations.some((loc: string) => s.name === `${loc} 加盟换电站`)
      })
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

    // 4. 逐个站点查询真实电池单元并构建槽位数组
    const enriched = await Promise.all(
      matchedSites.map(async (site: any) => {
        const slotCount = getSlotCount(site)

        // 查询分配到此站点的真实电池单元（带 sensor 数据）
        // 两条路径：site_id 精确匹配 + site_name 回退（派工后 site_id 可能未回写）
        const [unitsByIdRes, unitsByNameRes] = await Promise.all([
          adminClient
            .from('battery_units')
            .select('unit_code, soc, temperature, voltage, status, last_maintenance')
            .eq('site_id', site.id)
            .order('unit_code', { ascending: true }),
          site.name
            ? adminClient
                .from('battery_units')
                .select('unit_code, soc, temperature, voltage, status, last_maintenance')
                .is('site_id', null)
                .eq('site_name', site.name)
                .order('unit_code', { ascending: true })
            : Promise.resolve({ data: [] }),
        ])

        const units = [...(unitsByIdRes.data || []), ...(unitsByNameRes.data || [])]

        const cabinetSlots = buildCabinetSlots(
          slotCount,
          units,
          0,
        )

        // 只返回 operation_sites 和模板的有效字段，不暴露原始 cabinet_slots 整数
        const { cabinet_slots: _, ...siteRest } = site
        return {
          ...siteRest,
          cabinet_slots: cabinetSlots,
          template: templateMap[site.template_id] || null,
        }
      }),
    )

    return ok({ stations: enriched })
  } catch (e: any) {
    return serverError()
  }
}
