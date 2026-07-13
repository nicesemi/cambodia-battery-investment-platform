import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/franchise-applications — 投资者查看自己的加盟申请
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data, error } = await getSupabaseAdmin()
      .from('franchise_applications')
      .select('*, template:template_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    return ok({ applications: data || [] })
  } catch (e: any) {
    return serverError()
  }
}

/**
 * POST /api/franchise-applications — 投资者提交加盟申请
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { template_id, location, matched_battery_4820, matched_battery_6035, matched_battery_7250 } = body

    if (!template_id || !location) {
      return badRequest('缺少必填字段: template_id, location')
    }

    // Get template to fill cabinet_count
    const adminClient = getSupabaseAdmin()
    const { data: template } = await adminClient
      .from('swap_station_templates')
      .select('id, cabinet_count')
      .eq('id', template_id)
      .single()

    if (!template) return badRequest('所选模板不存在')

    const { data, error } = await adminClient
      .from('franchise_applications')
      .insert({
        user_id: user.id,
        template_id,
        location: location.trim(),
        cabinet_count: template.cabinet_count,
        matched_battery_4820: matched_battery_4820 || 0,
        matched_battery_6035: matched_battery_6035 || 0,
        matched_battery_7250: matched_battery_7250 || 0,
        status: 'pending',
      })
      .select('*, template:template_id(*)')
      .single()

    if (error) return serverError(error.message)
    return ok({ message: '加盟申请已提交', application: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
