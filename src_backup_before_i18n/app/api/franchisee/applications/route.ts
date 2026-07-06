import { supabase } from '@/lib/supabase'
import { authenticateToken, requireVerified } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data, error } = await supabase
      .from('franchisee_applications')
      .select(`
        *,
        parent_agent:agent_applications!parent_agent_id(full_name, region, city)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    // 展平 parent_agent 字段到顶层
    const applications = (data || []).map(app => {
      const pa = app.parent_agent
      return {
        ...app,
        parent_agent_name: pa?.full_name || '',
        parent_agent_region: pa?.region || '',
        parent_agent_city: pa?.city || '',
        parent_agent: undefined,
      }
    })

    return ok({ applications })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'franchisee') return unauthorized('Franchisee only')

    // Check certification status
    const certError = requireVerified(user)
    if (certError) return certError

    const body = await request.json()
    const { store_name, city, address, phone, reason } = body

    if (!store_name || !city || !phone) {
      return badRequest('store_name, city, phone are required')
    }

    const bodyData: any = {
      user_id: user.id,
      store_name, city, address, phone, reason,
      status: 'pending'
    }
    // 支持关联上级代理
    if (body.parent_agent_id) bodyData.parent_agent_id = body.parent_agent_id

    const { data, error } = await supabase.from('franchisee_applications').insert(bodyData).select().single()

    if (error) return serverError(error.message)
    return ok({ application: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
