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
      .select('*, template:template_id(*)')
      .single()

    if (error) return serverError(error.message)
    if (!application) return notFound('Application not found')

    // When approved, create operation_site record
    if (status === 'approved') {
      const tmpl = (application as any).template
      const { error: siteErr } = await adminClient
        .from('operation_sites')
        .insert({
          name: `${application.location} 加盟换电站`,
          site_type: 'swap_station',
          template_id: application.template_id,
          cabinet_count: tmpl ? tmpl.cabinet_count : application.cabinet_count,
          battery_count: 0,
          longitude: tmpl?.gps_lng || 0,
          latitude: tmpl?.gps_lat || 0,
          status: '运营中',
          is_active: true,
          country: '柬埔寨',
          city: application.location,
          address: application.location,
          franchise_application_id: id,
        })

      if (siteErr) {
        console.error('Failed to create operation_site for franchise:', siteErr.message)
      }
    }

    return ok({ application })
  } catch (e: any) {
    return serverError()
  }
}
