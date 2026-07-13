import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const diagnostics: Record<string, any> = {}

  // 1. Check auth
  try {
    const user = await authenticateToken(request)
    diagnostics.auth = user ? { ok: true, email: user.email, role: user.role } : { ok: false, reason: 'Token verification failed or missing' }
  } catch (e: any) {
    diagnostics.auth = { ok: false, error: e?.message || String(e) }
  }

  // 2. Check all franchise_applications with status
  try {
    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('franchise_applications')
      .select('id, status, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    diagnostics.applications = error
      ? { ok: false, error: error.message, code: error.code }
      : { ok: true, count: data?.length ?? 0, rows: data }
  } catch (e: any) {
    diagnostics.applications = { ok: false, error: e?.message || String(e) }
  }

  // 3. Check timestamp to verify code is live
  diagnostics.server_time = new Date().toISOString()
  diagnostics.code_version = 'debug-v2-20260713'

  return ok({ diagnostics })
}
