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

    console.log('[DEBUG GET] raw apps count:', apps?.length, 'error:', error)
    if (apps && apps.length > 0) {
      console.log('[DEBUG GET] first app id:', apps[0].id, 'status:', apps[0].status)
      const pendingApps = apps.filter(a => a.status === 'pending')
      const rejectedApps = apps.filter(a => a.status === 'rejected')
      console.log('[DEBUG GET] pending:', pendingApps.length, 'rejected:', rejectedApps.length)
    }

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

    // Step 4: Query operation_sites to get site_code for approved applications
    const approvedApps = apps.filter(a => a.status === 'approved')
    let siteCodeMap: Map<string, string> = new Map()
    if (approvedApps.length > 0) {
      const { data: sites } = await adminClient
        .from('operation_sites')
        .select('name, site_code')
        .eq('is_active', true)
        .eq('site_type', 'swap_station')
      if (sites) {
        for (const a of approvedApps) {
          const match = sites.find((s: any) => s.name && s.name.includes(a.location))
          if (match?.site_code) {
            siteCodeMap.set(a.id, match.site_code)
          }
        }
      }
    }

    // Step 5: Merge
    const applications = apps.map(app => ({
      ...app,
      applicant: userMap.get(app.user_id) || null,
      template: templateMap.get(app.template_id) || null,
      site_code: siteCodeMap.get(app.id) || null,
    }))

    // DEBUG: status distribution
    const statusDist: Record<string, number> = {}
    applications.forEach(a => { statusDist[a.status] = (statusDist[a.status] || 0) + 1 })
    console.log('[franchise-applications] Found', applications.length, 'applications')
    return ok({ applications, _debug: { version: 'v3-20260713', total: applications.length, status_distribution: statusDist, sample_ids: applications.slice(0, 5).map(a => ({ id: a.id, status: a.status })) } }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (e: any) {
    console.error('[franchise-applications] Unexpected error:', e)
    return serverError('Unexpected error: ' + (e?.message || String(e)))
  }
}
