import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { store_id, reason } = body

    if (!store_id) return badRequest('门店ID不能为空')
    if (!reason || !reason.trim()) return badRequest('申诉理由不能为空')

    // 验证门店存在且状态为 closed
    const { data: store, error: storeErr } = await supabase
      .from('franchisee_stores')
      .select('id, name, status, owner_id')
      .eq('id', store_id)
      .single()

    if (storeErr || !store) return notFound('门店不存在')
    if (store.status !== 'closed') return badRequest('仅已停业门店可申诉')

    // 权限：仅门店店主或管理员可申诉
    if (user.role !== 'admin' && user.role !== 'operator' && store.owner_id !== user.id) {
      return unauthorized('仅门店店主或管理员可申诉')
    }

    // 更新门店状态为 pending；尝试写入申诉理由（列不存在时降级为仅更新状态）
    const updatePayload: Record<string, unknown> = {
      status: 'pending',
      appeal_reason: reason.trim(),
      appealed_at: new Date().toISOString(),
    }
    let { error: updateErr } = await supabase
      .from('franchisee_stores')
      .update(updatePayload)
      .eq('id', store_id)

    // 如果列不存在，降级为仅更新状态
    if (updateErr) {
      const { error: fallbackErr } = await supabase
        .from('franchisee_stores')
        .update({ status: 'pending' })
        .eq('id', store_id)
      if (fallbackErr) return serverError(fallbackErr.message)
    }

    return ok({ message: '申诉已提交，等待管理员审核', store_id, reason: reason.trim() })
  } catch (e: any) {
    return serverError()
  }
}
