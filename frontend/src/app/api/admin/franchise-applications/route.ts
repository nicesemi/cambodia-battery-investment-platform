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

    // Step 1: Query franchise_applications without joins (known to work)
    const { data: apps, error } = await adminClient
      .from('franchise_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[franchise-applications] Supabase query error:', error)
      return serverError('Database query failed: ' + error.message)
    }

    if (!apps || apps.length === 0) {
      return ok({ applications: [] })
    }

    // Step 2: Collect unique user_ids and template_ids
    const userIds = [...new Set(apps.map(a => a.user_id).filter(Boolean))]
    const templateIds = [...new Set(apps.map(a => a.template_id).filter(Boolean))]

    // Step 3: Batch fetch users and templates
    const [userRes, templateRes] = await Promise.all([
      userIds.length > 0
        ? adminClient.from('users').select('id, email, username, full_name, phone').in('id', userIds)
        : { data: [], error: null },
      templateIds.length > 0
        ? adminClient.from('swap_station_templates').select('*').in('id', templateIds)
        : { data: [], error: null },
    ])

    const userMap = new Map((userRes.data || []).map(u => [u.id, u]))
    const templateMap = new Map((templateRes.data || []).map(t => [t.id, t]))

    // Step 4: Merge
    const applications = apps.map(app => ({
      ...app,
      applicant: userMap.get(app.user_id) || null,
      template: templateMap.get(app.template_id) || null,
    }))

    console.log('[franchise-applications] Found', applications.length, 'applications')
    return ok({ applications })
  } catch (e: any) {
    console.error('[franchise-applications] Unexpected error:', e)
    return serverError('Unexpected error: ' + (e?.message || String(e)))
  }
}
