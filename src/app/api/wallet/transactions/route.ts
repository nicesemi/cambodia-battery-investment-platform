import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet/transactions?limit=20
 * 返回当前用户的钱包资金明细（充值/回购/分红/提现/手续费）
 * 按时间倒序排列
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    const { data, error } = await supabase
      .from('transactions')
      .select('tx_no, type, amount, currency, status, remark, created_at, completed_at')
      .eq('user_id', user.id)
      .in('type', ['deposit', 'withdraw', 'dividend', 'trade', 'fee'])
      .order('created_at', { ascending: false })
      .limit(limit)

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

    return ok({ transactions })
  } catch (e: any) {
    console.error('Wallet transactions error:', e)
    return serverError()
  }
}

function getTypeLabel(type: string): string {
  return type
}
