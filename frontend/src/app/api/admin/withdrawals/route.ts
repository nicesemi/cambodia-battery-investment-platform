import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/withdrawals — 返回所有提现申请列表（含用户信息）
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized()

    const adminClient = getSupabaseAdmin()

    // 查询所有提现申请
    const { data: withdrawals, error } = await adminClient
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return serverError(error.message)

    // 批量获取用户信息
    const userIds = Array.from(new Set((withdrawals || []).map((w: any) => w.user_id).filter(Boolean)))
    let userMap = new Map<string, any>()

    if (userIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, username, email, full_name, phone, role')
        .in('id', userIds)
      if (users) {
        for (const u of users) userMap.set(u.id, u)
      }
    }

    const enriched = (withdrawals || []).map((w: any) => ({
      ...w,
      user: userMap.get(w.user_id) || null,
    }))

    return ok({ withdrawals: enriched }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (e: any) {
    return serverError(e.message)
  }
}
