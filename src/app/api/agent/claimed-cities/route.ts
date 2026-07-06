import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/claimed-cities?region=<province>
 * 返回某省下已被市级加盟商申请（pending + approved）的城市列表
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const url = new URL(request.url)
    const region = url.searchParams.get('region')
    if (!region) return badRequest('region parameter is required')

    const { data, error } = await supabase
      .from('agent_applications')
      .select('city, status')
      .eq('agent_type', 'city_franchisee')
      .eq('region', region)
      .eq('status', 'approved')

    if (error) return serverError(error.message)

    const cities = Array.from(new Set((data || []).map(d => d.city).filter(Boolean)))
    return ok({ claimed_cities: cities })
  } catch (e: any) {
    return serverError()
  }
}
