import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/franchisee/agent-options?region=cn&city=北京
 * 根据用户选择的 region+city，返回该省份/城市是否存在已审批通过的代理，
 * 供前端动态控制上级代理下拉框的必选/可选/隐藏状态。
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const url = new URL(request.url)
    const region = url.searchParams.get('region')
    const city = url.searchParams.get('city')

    if (!region || !city) return badRequest('region and city are required')

    // 查询已审批的省级总代理
    // CN 下 region 存的是省份名（如"江苏"），而前端传入 region=cn，故 CN 不按 region 过滤
    const provinceQuery = supabase
      .from('agent_applications')
      .select('id, full_name, region, city')
      .eq('status', 'approved')
      .eq('agent_type', 'province_agent')
    const { data: provinceAgents } = region === 'cn'
      ? await provinceQuery
      : await provinceQuery.eq('region', region)

    // 查询已审批的市级加盟商（CN 下不限城市，由前端按 parent_agent_id 过滤）
    const cityQuery = supabase
      .from('agent_applications')
      .select('id, full_name, parent_agent_id, city')
      .eq('status', 'approved')
      .eq('agent_type', 'city_franchisee')
    const { data: cityAgents } = region === 'cn'
      ? await cityQuery
      : await cityQuery.eq('region', region).eq('city', city)

    const hasProvinceAgent = (provinceAgents || []).length > 0
    const hasCityAgent = (cityAgents || []).length > 0

    return ok({
      has_province_agent: hasProvinceAgent,
      province_agents: (provinceAgents || []).map(a => ({ id: a.id, name: a.full_name, region: a.region, city: a.city })),
      has_city_agent: hasCityAgent,
      city_agents: (cityAgents || []).map(a => ({ id: a.id, name: a.full_name, parent_agent_id: a.parent_agent_id, city: a.city })),
      // 如果省和市都没有代理，申请将由总部直接审批
      direct_headquarters: !hasProvinceAgent && !hasCityAgent,
    })
  } catch (e: any) {
    return serverError()
  }
}
