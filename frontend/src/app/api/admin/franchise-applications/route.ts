import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('franchise_applications')
      .select('*, applicant:user_id(id, email, username, full_name, phone), template:template_id(*)')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    // DEBUG: verify service_role key is loaded
    const keyLen = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length
    return ok({ applications: data || [], _debug: { keyLen, dataLen: (data || []).length } })
  } catch (e: any) {
    return serverError()
  }
}
