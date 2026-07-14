import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { id } = await params
    const body = await request.json()
    const { status, admin_remark } = body

    console.log('[DEBUG PUT] id:', id, 'body:', JSON.stringify(body))

    if (!status || !['approved', 'rejected'].includes(status)) {
      return badRequest('Status must be approved or rejected')
    }

    const adminClient = getSupabaseAdmin()

    // Update the application
    const { data: application, error } = await adminClient
      .from('franchise_applications')
      .update({
        status,
        admin_remark: admin_remark || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    console.log('[DEBUG PUT] update result - data:', JSON.stringify(application), 'error:', error)

    if (error) return serverError(error.message)
    if (!application) return notFound('Application not found')

    // DEBUG: verify the update actually persisted by re-fetching
    const { data: verifyApp } = await adminClient
      .from('franchise_applications')
      .select('id, status')
      .eq('id', id)
      .single()

    // Fetch template data separately
    let template = null
    if (application.template_id) {
      const { data: tmpl } = await adminClient
        .from('swap_station_templates')
        .select('*')
        .eq('id', application.template_id)
        .single()
      template = tmpl || null
    }

    // When approved, create operation_site record
    if (status === 'approved') {
      // Generate unique site_code: SW-YYYYMMDD-XXX
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const prefix = `SW-${dateStr}-`

      // Query existing site_codes with today's prefix to determine next sequence
      const { data: existingCodes } = await adminClient
        .from('operation_sites')
        .select('site_code')
        .like('site_code', `${prefix}%`)
        .order('site_code', { ascending: false })
        .limit(1)

      let nextSeq = 1
      if (existingCodes && existingCodes.length > 0) {
        const lastCode = existingCodes[0].site_code || ''
        const lastSeqMatch = lastCode.match(/-(\d{3})$/)
        if (lastSeqMatch) {
          nextSeq = parseInt(lastSeqMatch[1], 10) + 1
        }
      }
      const siteCode = `${prefix}${String(nextSeq).padStart(3, '0')}`

      // cabinet_slots = cabinet_count * 12（每仓12槽）
      const cabinetCount = template?.cabinet_count ?? application.cabinet_count ?? 1
      const cabinetSlots = cabinetCount * 12

      const siteData = {
        name: `${application.location} 加盟换电站`,
        site_type: 'swap_station',
        template_id: application.template_id,
        cabinet_slots: cabinetSlots,
        battery_count: 0,
        longitude: template?.gps_lng || 0,
        latitude: template?.gps_lat || 0,
        status: '运营中',
        is_active: true,
        country: '柬埔寨',
        city: application.location,
        address: application.location,
        site_code: siteCode,
      }

      console.log('[franchise-review] Creating operation_site with site_code:', siteCode, JSON.stringify(siteData, null, 2))

      const { data: newSite, error: siteErr } = await adminClient
        .from('operation_sites')
        .insert(siteData)
        .select('id, site_code')
        .single()

      if (siteErr) {
        console.error('Failed to create operation_site for franchise:', siteErr.message)
      } else if (newSite) {
        console.log('[franchise-review] Operation site created:', newSite.id, 'site_code:', newSite.site_code)
      }
    }

    return ok({
      application,
      _debug: {
        version: 'v3-20260713',
        requested_status: status,
        returned_status: application.status,
        db_verify_status: verifyApp?.status,
        db_verify_match: verifyApp?.status === application.status,
      }
    })
  } catch (e: any) {
    return serverError()
  }
}
