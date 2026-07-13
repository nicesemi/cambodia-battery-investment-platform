import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('users')
      .select('id, email, username, full_name, phone, role, certification_status, rejection_reason, id_card_front_url, id_card_back_url, business_license_url, created_at')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('certification_status', status)
    } else {
      query = query.in('certification_status', ['kyc_submitted', 'kyc_approved', 'kyc_rejected', 'business_verified'])
    }

    const { data: users, error } = await query
    if (error) return serverError(error.message)

    return ok({ users: users || [] }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (e: any) {
    return serverError()
  }
}
