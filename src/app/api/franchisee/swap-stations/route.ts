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

    // 1. 获取当前用户已审批的加盟申请 location（审批时 operation_site name = '{location} 加盟换电站'）
    const { data: franchiseApps, error: appErr } = await adminClient
      .from('franchise_applications')
      .select('id, location')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (appErr) return serverError(appErr.message)

    const appLocations = (franchiseApps || []).map((a: any) => a.location)

    if (appLocations.length === 0) {
      return ok({ stations: [] })
    }

    // 2. 查询所有换电站类型站点，按 name 模式过滤
    const { data: allSites, error: siteErr } = await adminClient
      .from('operation_sites')
      .select('*')
      .in('site_type', ['swap_station', '换电站'])
      .eq('is_active', true)

    if (siteErr) return serverError(siteErr.message)

    // 筛选：name 包含 "{location}" 且包含 "加盟" 的站点
    const stations = (allSites || []).filter((s: any) => {
      const name = s.name || ''
      return appLocations.some(loc => name.includes(loc)) && name.includes('加盟')
    })

    if (stations.length === 0) {
      return ok({ stations: [] })
    }

    // 3. 补充模板数据
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

    // 4. 将 cabinet_slots（integer=总槽位数）转为前端需要的槽位数组
    const enriched = stations.map((site: any) => {
      const rawSlots = site.cabinet_slots
      // cabinet_slots 为 integer 类型（总槽位数），也可能为 JSON 字符串
      let totalSlots = 0
      if (typeof rawSlots === 'number' && rawSlots > 0) {
        totalSlots = rawSlots
      } else if (typeof rawSlots === 'string') {
        const parsed = Number(rawSlots)
        if (!isNaN(parsed) && parsed > 0) {
          totalSlots = parsed
        } else {
          // 尝试 JSON 解析（兼容历史数据）
          try { const arr = JSON.parse(rawSlots); totalSlots = Array.isArray(arr) ? arr.length : 0 } catch { totalSlots = 0 }
        }
      }

      // 生成槽位数组（全部为空，因为新站点还没有电池分配）
      const slots = Array.from({ length: totalSlots }, (_, i) => ({
        slot_number: i + 1,
        status: 'empty',
        battery_unit_code: null,
        charging: false,
      }))

      // 推断 cabinet_count（没有该列时根据总槽位数反推）
      const cabinetCount = site.cabinet_count
        || (templateMap[site.template_id]?.cabinet_count)
        || Math.max(1, Math.ceil(totalSlots / 12))

      return {
        ...site,
        cabinet_count: cabinetCount,
        cabinet_slots: slots,
        template: templateMap[site.template_id] || null,
      }
    })

    return ok({ stations: enriched })
  } catch (e: any) {
    return serverError()
  }
}
