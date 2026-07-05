import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request) {
  try {
    // 从已派工电池（battery_units.site_name 不为空）聚合运营站点
    const { data: dispatchedSites, error: unitError } = await supabase
      .from('battery_units')
      .select('site_name')
      .not('site_name', 'is', null)
      .neq('site_name', '')

    if (unitError) return serverError(unitError.message)

    const siteNames = Array.from(new Set((dispatchedSites || []).map((d: any) => d.site_name).filter(Boolean)))

    if (siteNames.length === 0) return ok({ sites: [] })

    // 查询匹配的 operation_sites 获取完整信息
    const { data: sites, error } = await supabase
      .from('operation_sites')
      .select('*')
      .in('name', siteNames)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    // 统计每个站点的电池数量
    const { data: counts } = await supabase
      .from('battery_units')
      .select('site_name')
      .in('site_name', siteNames)

    const countMap: Record<string, number> = {}
    ;(counts || []).forEach((c: any) => {
      countMap[c.site_name] = (countMap[c.site_name] || 0) + 1
    })

    const mergedSites = (sites || []).map((s: any) => ({
      ...s,
      battery_count: countMap[s.name] || 0,
    }))

    return ok({ sites: mergedSites })
  } catch (e: any) {
    return serverError()
  }
}
