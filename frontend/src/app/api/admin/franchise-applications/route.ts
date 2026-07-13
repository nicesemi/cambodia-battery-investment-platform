import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized('Token authentication failed')
    if (user.role !== 'admin' && user.role !== 'operator') return unauthorized('Admin only')

    console.log('[franchise-applications] User authenticated:', user.email, 'role:', user.role)

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('franchise_applications')
      .select('*, applicant:user_id(id, email, username, full_name, phone), template:template_id(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[franchise-applications] Supabase query error:', error)
      return serverError('Database query failed: ' + error.message)
    }

    console.log('[franchise-applications] Found', data?.length ?? 0, 'applications')
    return ok({ applications: data || [] })
  } catch (e: any) {
    console.error('[franchise-applications] Unexpected error:', e)
    return serverError('Unexpected error: ' + (e?.message || String(e)))
  }
}
