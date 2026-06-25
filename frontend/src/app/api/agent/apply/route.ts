import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, forbidden } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      return unauthorized('Franchisee or admin only')
    }

    const body = await request.json()
    const { agent_type, full_name, phone, region, city, reason, parent_agent_id } = body

    if (!agent_type || !full_name || !phone) {
      return badRequest('agent_type, full_name, phone are required')
    }

    // 市级加盟商申请时，禁止已有省级代理身份的用户申请
    if (agent_type === 'city_franchisee') {
      const { data: existingProvince } = await supabase
        .from('agent_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('agent_type', 'province_agent')
        .eq('status', 'approved')
        .maybeSingle()

      if (existingProvince) {
        return forbidden('您已是审批通过的省级总代理，不能申请市级加盟商')
      }

      // 验证 parent_agent_id 有效且为省级代理
      if (parent_agent_id) {
        const { data: parent } = await supabase
          .from('agent_applications')
          .select('id, agent_type, city')
          .eq('id', parent_agent_id)
          .eq('agent_type', 'province_agent')
          .eq('status', 'approved')
          .maybeSingle()

        if (!parent) {
          return badRequest('上级省级代理无效或未审批通过')
        }
      }
    }

    const { data, error } = await supabase.from('agent_applications').insert({
      user_id: user.id,
      agent_type,
      full_name,
      phone,
      region,
      city: city || null,
      reason: reason || null,
      parent_agent_id: parent_agent_id || null,
      status: 'pending'
    }).select().single()

    if (error) return serverError(error.message)
    return ok({ application: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
