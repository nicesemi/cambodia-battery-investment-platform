import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet/transactions?page=1&limit=10
 * 返回当前用户的钱包资金明细（充值/回购/分红/提现/手续费）
 * 按时间倒序排列，分页返回
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
    const offset = (page - 1) * limit

    // 先查总数
    const { count, error: countError } = await getSupabaseAdmin()
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('type', ['deposit', 'withdraw', 'dividend', 'trade', 'fee'])

    if (countError) {
      console.error('Wallet transactions count error:', countError)
      return serverError('获取交易记录失败')
    }

    // 诊断：按类型统计
    const { data: typeStats } = await getSupabaseAdmin()
      .from('transactions')
      .select('type')
      .eq('user_id', user.id)
    const typeCount: Record<string, number> = {}
    for (const t of (typeStats || [])) { typeCount[t.type] = (typeCount[t.type] || 0) + 1 }
    console.log('[Transactions] type stats for user', user.id, ':', JSON.stringify(typeCount), 'total:', typeStats?.length)

    // 诊断：列出所有 trade 类型记录
    const { data: tradeTxs } = await getSupabaseAdmin()
      .from('transactions')
      .select('tx_no, amount, created_at')
      .eq('user_id', user.id)
      .eq('type', 'trade')
      .order('created_at', { ascending: false })
    console.log('[Transactions] trade records for user', user.id, ':', tradeTxs?.length || 0, tradeTxs?.map(t => `${t.tx_no}=${t.amount}(c:${t.created_at})`).join(', '))

    const { data, error } = await getSupabaseAdmin()
      .from('transactions')
      .select('tx_no, type, amount, currency, status, remark, created_at, completed_at')
      .eq('user_id', user.id)
      .in('type', ['deposit', 'withdraw', 'dividend', 'trade', 'fee'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Wallet transactions fetch error:', error)
      return serverError('获取交易记录失败')
    }

    // 格式化返回
    const transactions = (data || []).map((tx: any) => ({
      txNo: tx.tx_no,
      type: tx.type,
      typeLabel: getTypeLabel(tx.type),
      amount: Number(tx.amount),
      currency: tx.currency || 'USD',
      status: tx.status,
      remark: tx.remark || '',
      createdAt: tx.created_at,
      completedAt: tx.completed_at,
    }))

    return ok({
      transactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (e: any) {
    console.error('Wallet transactions error:', e)
    return serverError()
  }
}

function getTypeLabel(type: string): string {
  return type
}
