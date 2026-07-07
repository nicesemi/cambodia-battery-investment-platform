import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * CRON: 分红自动结算
 * 触发时间：每月1日 00:00 UTC (vercel.json cron)
 * 规则：所有上月分红在次月1日0点到账，到账后可提现
 * 适用：投资者、加盟商
 */
export async function GET(request: Request) {
  try {
    // CRON_SECRET 鉴权
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return unauthorized('Invalid CRON_SECRET')
    }

    const now = new Date()
    // 上个月：YYYY-MM
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const period = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

    // 查找上月所有 pending 状态的分红记录
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('dividend_records')
      .select('*')
      .eq('period', period)
      .eq('status', 'pending')

    if (fetchError) {
      console.error('Fetch pending dividends error:', fetchError)
      return serverError('获取待结算分红失败')
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return ok({ message: `No pending dividends for period ${period}`, period, settledCount: 0 })
    }

    let settledCount = 0
    let totalSettled = 0

    for (const record of pendingRecords) {
      const dividendAmount = Number(record.dividend_amount || 0)
      if (dividendAmount <= 0) continue

      // 更新分红记录状态
      const { error: updateError } = await supabase
        .from('dividend_records')
        .update({ status: 'completed', settled_at: now.toISOString() })
        .eq('id', record.id)

      if (updateError) {
        console.error(`Failed to settle dividend record ${record.id}:`, updateError)
        continue
      }

      // 更新钱包余额
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', record.user_id)
        .single()

      const newBalance = Number(wallet?.balance || 0) + dividendAmount
      await getSupabaseAdmin()
        .from('user_wallets')
        .update({ balance: Math.round(newBalance * 100) / 100, updated_at: now.toISOString() })
        .eq('user_id', record.user_id)

      // 写入交易记录
      const txNo = `DIV${period.replace('-', '')}${String(record.user_id).substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const { error: txError } = await supabase.from('transactions').insert({
        tx_no: txNo,
        user_id: record.user_id,
        type: 'dividend',
        amount: dividendAmount,
        currency: 'USD',
        status: 'completed',
        remark: `${period} 分红到账 (${record.units_held || 0} units)`,
        completed_at: now.toISOString(),
      })
      if (txError) console.error('Dividend settlement transaction insert error:', txError)

      // 更新用户累计分红
      const { data: userData } = await supabase
        .from('users')
        .select('total_dividends')
        .eq('id', record.user_id)
        .single()
      await supabase
        .from('users')
        .update({ total_dividends: Number(userData?.total_dividends || 0) + dividendAmount })
        .eq('id', record.user_id)

      settledCount++
      totalSettled += dividendAmount
    }

    return ok({
      message: `Dividend settlement completed for ${period}`,
      period,
      settledCount,
      totalSettled: Math.round(totalSettled * 100) / 100,
      timestamp: now.toISOString(),
    })
  } catch (e: any) {
    console.error('Dividend settlement cron error:', e)
    return serverError()
  }
}
