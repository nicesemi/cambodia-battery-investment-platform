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

  // 2. Check env vars
  diagnostics.env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'MISSING',
  }

  // 3. Check Supabase admin connection
  try {
    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient.from('franchise_applications').select('id, status', { count: 'exact', head: false })
    diagnostics.db = error 
      ? { ok: false, error: error.message, code: error.code }
      : { ok: true, count: data?.length ?? 0, sample: data?.slice(0, 3) }
  } catch (e: any) {
    diagnostics.db = { ok: false, error: e?.message || String(e) }
  }

  return ok({ diagnostics })
}
