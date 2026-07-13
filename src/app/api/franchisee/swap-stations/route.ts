import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator' && user.role !== 'investor') {
      return unauthorized('Franchisee only')
    }

    const adminClient = getSupabaseAdmin()

    // 1. 获取当前用户已审批的加盟申请
    // 先查 franchise_applications（admin 审批使用的表）
    const { data: franchiseApps, error: appErr } = await adminClient
      .from('franchise_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (appErr) return serverError(appErr.message)

    // 同时查 franchisee_applications（加盟商提交使用的表）
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

    // 2. 查询关联的 operation_sites（兼容 site_type: 'swap_station' 和 '换电站'）
    const { data: sites, error: siteErr } = await adminClient
      .from('operation_sites')
      .select('*')
      .in('franchise_application_id', allAppIds)
      .in('site_type', ['swap_station', '换电站'])
      .eq('is_active', true)

    if (siteErr) return serverError(siteErr.message)

    const stations = sites || []

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
