import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/withdrawals/[id]
 * 审批提现申请：approve（通过后扣减余额）/ reject（驳回）
 * body: { action: 'approve' | 'reject', reason?: string }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized()

    const { id } = await params
    const adminClient = getSupabaseAdmin()
    const body = await request.json()
    const { action, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return badRequest('action must be "approve" or "reject"')
    }

    // 查询提现申请
    const { data: withdrawal, error: findErr } = await adminClient
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findErr || !withdrawal) return notFound('Withdrawal not found')
    if (withdrawal.status !== 'pending') return badRequest('Only pending withdrawals can be processed')

    const now = new Date().toISOString()
    const updateData: Record<string, any> = {
      updated_at: now,
    }

    if (action === 'approve') {
      updateData.status = 'approved'
      updateData.approved_at = now
      updateData.approved_by = user.id
    } else {
      updateData.status = 'rejected'
      updateData.rejected_at = now
      updateData.rejected_by = user.id
      if (reason) updateData.reject_reason = reason
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('withdrawal_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) return serverError(updateErr.message)

    return ok({ withdrawal: updated })
  } catch (e: any) {
    return serverError(e.message)
  }
}
