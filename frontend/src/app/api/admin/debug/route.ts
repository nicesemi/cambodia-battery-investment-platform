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

  // 3. Check review_log table
  try {
    const adminClient = getSupabaseAdmin()
    const { data: logs, error: logErr } = await adminClient
      .from('review_log')
      .select('*')
    diagnostics.review_log = logErr
      ? { ok: false, error: logErr.message, code: logErr.code }
      : { ok: true, count: logs?.length ?? 0, rows: logs }
  } catch (e: any) {
    diagnostics.review_log = { ok: false, error: e?.message || String(e) }
  }

  // 4. Simulate merge
  try {
    const adminClient = getSupabaseAdmin()
    const { data: apps } = await adminClient
      .from('franchise_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (apps && apps.length > 0) {
      const appIds = apps.map(a => a.id)
      const { data: reviewLogs } = await adminClient
        .from('review_log')
        .select('*')
        .in('application_id', appIds)
      const reviewMap = new Map((reviewLogs || []).map(l => [l.application_id, l]))
      const merged = apps.map(app => {
        const log = reviewMap.get(app.id)
        if (log) return { id: app.id, original_status: app.status, merged_status: log.status }
        return { id: app.id, original_status: app.status, merged_status: app.status }
      })
      diagnostics.merge_sim = { ok: true, rows: merged }
      diagnostics.merge_map_size = reviewMap.size
    }
  } catch (e: any) {
    diagnostics.merge_sim = { ok: false, error: e?.message || String(e) }
  }

  // 5. Check timestamp to verify code is live
  diagnostics.server_time = new Date().toISOString()
  diagnostics.code_version = 'debug-v3-mergecheck-20260714'

  return ok({ diagnostics })
}
