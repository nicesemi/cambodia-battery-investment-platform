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
      const siteData = {
        name: `${application.location} 加盟换电站`,
        site_type: '换电站',
        template_id: application.template_id,
        cabinet_count: template ? template.cabinet_count : application.cabinet_count,
        battery_count: 0,
        longitude: template?.gps_lng || 0,
        latitude: template?.gps_lat || 0,
        status: '运营中',
        is_active: true,
        country: '柬埔寨',
        city: application.location,
        address: application.location,
        franchise_application_id: id,
      }

      console.log('[franchise-review] Creating operation_site:', JSON.stringify(siteData, null, 2))

      const { error: siteErr } = await adminClient
        .from('operation_sites')
        .insert(siteData)

      if (siteErr) {
        console.error('Failed to create operation_site for franchise:', siteErr.message)
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
