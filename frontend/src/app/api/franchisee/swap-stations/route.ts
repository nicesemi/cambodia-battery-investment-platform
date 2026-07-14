import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      return unauthorized('Franchisee only')
    }

    const adminClient = getSupabaseAdmin()

    // 1. 获取当前用户已审批的加盟申请
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

    if (allAppIds.length === 0) {
      return ok({ stations: [] })
    }

    // 2. 查询 operation_sites（无 franchise_application_id 列，用 name 模式匹配）
    // name 格式：{location}加盟换电站
    const { data: sites, error: siteErr } = await adminClient
      .from('operation_sites')
      .select('*')
      .eq('is_active', true)
      .or('site_type.eq.swap_station,site_type.eq.换电站')

    if (siteErr) return serverError(siteErr.message)

    // 通过 name 中的 location 匹配加盟申请
    const franchiseLocations = (franchiseApps || []).map((a: any) => a.location).filter(Boolean)
    const matchedSites = (sites || []).filter((s: any) => {
      if (!s.name) return false
      return franchiseLocations.some((loc: string) =>
        s.name.includes(loc) || s.name.includes('加盟换电站')
      )
    })

    const stations = matchedSites

    // 3. 补充模板数据（用于生成占位槽位）
    const templateIds = [...new Set(stations.map((s: any) => s.template_id).filter(Boolean))]
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

    // 4. 丰富站点数据：解析 cabinet_slots，或根据模板生成占位槽位
    const enriched = stations.map((site: any) => {
      let slots = []
      const rawSlots = site.cabinet_slots
      if (Array.isArray(rawSlots) && rawSlots.length > 0) {
        slots = rawSlots
      } else if (typeof rawSlots === 'string') {
        try { slots = JSON.parse(rawSlots) } catch { slots = [] }
      }

      // 如果有 cabinet_slots 数据就用，否则根据 cabinet_count 和 template 生成占位槽位
      if (!Array.isArray(slots) || slots.length === 0) {
        const template = templateMap[site.template_id]
        const cabinetCount = site.cabinet_count || template?.cabinet_count || 1
        const batteryCount = site.battery_count ?? 0
        // 每个仓默认 12 个槽位（参考 swap_station_templates 常见设计）
        const slotsPerCabinet = template?.slots_per_cabinet || 12
        const totalSlots = cabinetCount * slotsPerCabinet

        slots = []
        for (let i = 0; i < totalSlots; i++) {
          slots.push({
            slot_number: i + 1,
            status: i < batteryCount ? 'occupied' : 'empty',
            battery_unit_code: null,
            charging: false,
          })
        }
      }

      return {
        ...site,
        cabinet_slots: slots,
        template: templateMap[site.template_id] || null,
      }
    })

    return ok({ stations: enriched })
  } catch (e: any) {
    return serverError()
  }
}
