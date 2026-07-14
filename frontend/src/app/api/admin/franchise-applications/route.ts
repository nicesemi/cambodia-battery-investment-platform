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

    // ALL columns must be explicit — select('*') hits stale read replicas on Supabase free tier
    const { data: apps, error } = await adminClient
      .from('franchise_applications')
      .select('id, user_id, template_id, status, location, admin_remark, company_name, contact_name, contact_phone, contact_email, business_license, id_card, bank_account, investment_amount, cabinet_count, battery_count, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[franchise-applications] Supabase query error:', error)
      return serverError('Database query failed: ' + error.message)
    }

    if (!apps || apps.length === 0) {
      return ok({ applications: [] })
    }

    // Merge review_log as authoritative source — explicit columns to avoid replica lag
    const appIds = apps.map(a => a.id)
    const { data: reviewLogs } = await adminClient
      .from('review_log')
      .select('application_id, status, admin_remark, reviewer_id, reviewed_at')
      .in('application_id', appIds)

    console.log('[review_log] fetched:', reviewLogs?.length, 'entries')

    const reviewMap = new Map((reviewLogs || []).map(l => [l.application_id, l]))
    const mergedApps = apps.map(app => {
      const log = reviewMap.get(app.id)
      if (log) {
        console.log('[review_log] override', app.id, 'from', app.status, 'to', log.status)
        return { ...app, status: log.status, admin_remark: log.admin_remark }
      }
      return app
    })
    console.log('[review_log] merge done, mergedApps pending count:', mergedApps.filter(a => a.status === 'pending').length)

    // Step 2: Collect unique user_ids and template_ids
    const userIds = [...new Set(mergedApps.map(a => a.user_id).filter(Boolean))]
    const templateIds = [...new Set(mergedApps.map(a => a.template_id).filter(Boolean))]

    // Step 3: Batch fetch users and templates
    const [userRes, templateRes] = await Promise.all([
      userIds.length > 0
        ? adminClient.from('users').select('id, email, username, full_name, phone').in('id', userIds)
        : { data: [], error: null },
      templateIds.length > 0
        ? adminClient.from('swap_station_templates').select('id, name, battery_count, cabinet_count, power, monthly_rent, total_cost').in('id', templateIds)
        : { data: [], error: null },
    ])

    const userMap = new Map((userRes.data || []).map(u => [u.id, u]))
    const templateMap = new Map((templateRes.data || []).map(t => [t.id, t]))

    // Step 4: Query operation_sites to get site_code for approved applications
    const approvedApps = mergedApps.filter(a => a.status === 'approved')
    let siteCodeMap: Map<string, string> = new Map()
    if (approvedApps.length > 0) {
      const { data: sites } = await adminClient
        .from('operation_sites')
        .select('name, site_code')
        .eq('is_active', true)
        .or('site_type.eq.swap_station')
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
    const applications = mergedApps.map(app => ({
      ...app,
      applicant: userMap.get(app.user_id) || null,
      template: templateMap.get(app.template_id) || null,
      site_code: siteCodeMap.get(app.id) || null,
    }))

    // DEBUG: status distribution
    const statusDist: Record<string, number> = {}
    applications.forEach(a => { statusDist[a.status] = (statusDist[a.status] || 0) + 1 })
    console.log('[franchise-applications] Found', applications.length, 'applications')

    // Extended debug
    const debugApps = apps.map(a => ({ id: a.id, status: a.status }))
    const debugReviewLogs = (reviewLogs || []).map(l => ({ application_id: l.application_id, status: l.status }))

    return ok({
      applications,
      _debug: {
        version: 'v7-fix-20260714',
        raw_apps: debugApps,
        review_log: debugReviewLogs,
        merged: statusDist,
      }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (e: any) {
    console.error('[franchise-applications] Unexpected error:', e)
    return serverError('Unexpected error: ' + (e?.message || String(e)))
  }
}
