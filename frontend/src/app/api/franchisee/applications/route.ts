import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // Franchisee sees own applications
    const { data, error } = await supabase
      .from('franchisee_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    return ok({ applications: data || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'franchisee') return unauthorized('Franchisee only')

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
