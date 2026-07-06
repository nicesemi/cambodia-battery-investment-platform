import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('agent_applications')
      .select('*, applicant:user_id(id, email, username, full_name, phone)')
      .neq('agent_type', 'city_franchisee')
      .order('created_at', { ascending: false })

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) return serverError(error.message)
    return ok({ applications: data || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return badRequest('Application ID required')

    const body = await request.json()
    const { status, review_note } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return badRequest('Status must be approved or rejected')
    }

    const { data, error } = await supabase
      .from('agent_applications')
      .update({ status, reviewed_by: user.id, review_note: review_note || '' })
      .eq('id', id)
      .select().single()

    if (error) return serverError(error.message)
    return ok({ application: data })
  } catch (e: any) {
    return serverError()
  }
}
