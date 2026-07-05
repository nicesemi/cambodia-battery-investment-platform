import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || user.role !== 'admin') return unauthorized('Admin only')

    const { userId } = await params
    const body = await request.json()
    const { status, rejection_reason } = body

    if (!status || !['kyc_approved', 'kyc_rejected'].includes(status)) {
      return badRequest('status must be kyc_approved or kyc_rejected')
    }

    if (status === 'kyc_rejected' && !rejection_reason) {
      return badRequest('驳回时必须填写驳回意见')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check user exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, certification_status')
      .eq('id', userId)
      .single()

    if (checkError || !existing) return notFound('User not found')

    const updateData: Record<string, any> = {
      certification_status: status,
      rejection_reason: status === 'kyc_rejected' ? rejection_reason : null,
      ...(status === 'kyc_approved' ? { kyc_status: 'approved' } : {}),
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, username, full_name, phone, role, certification_status, rejection_reason, id_card_front_url, id_card_back_url, business_license_url, created_at')
      .single()

    if (error || !updated) return serverError(error?.message || 'Failed to update KYC status')

    return ok({ message: `KYC status updated to ${status}`, user: updated })
  } catch (e: any) {
    return serverError()
  }
}
