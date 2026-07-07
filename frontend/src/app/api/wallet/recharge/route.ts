import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, badRequest, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { amount } = await request.json()
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return badRequest('请输入有效的充值金额')
    }

    const rechargeAmount = Number(amount)

    // 诊断: 检查 SERVICE_ROLE_KEY 是否存在
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('[Recharge] SUPABASE_SERVICE_ROLE_KEY present:', hasServiceKey)

    // Get current wallet (use admin to bypass RLS)
    const adminClient = getSupabaseAdmin()
    const { data: wallet, error: walletError } = await adminClient
      .from('user_wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError)
      return serverError('钱包信息获取失败')
    }

    console.log('[Recharge] wallet before:', { id: wallet.id, balance: wallet.balance })

    const newBalance = Number(wallet.balance) + rechargeAmount

    // Update balance
    const { error: updateError } = await adminClient
      .from('user_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('[Recharge] wallet update error:', JSON.stringify(updateError))
      return serverError('充值失败，请重试')
    }

    // 验证写入: 用 admin client 回读确认
    const { data: verifyWallet } = await adminClient
      .from('user_wallets')
      .select('balance')
      .eq('id', wallet.id)
      .single()
    console.log('[Recharge] wallet after update:', verifyWallet?.balance)

    // 记录充值交易（使用 admin client 绕过 RLS）
    const txNo = `DEP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const now = new Date().toISOString()
    const { error: txError } = await adminClient.from('transactions').insert({
      tx_no: txNo,
      user_id: user.id,
      type: 'deposit',
      amount: rechargeAmount,
      currency: 'USD',
      status: 'completed',
      remark: '钱包充值',
      created_at: now,
      completed_at: now,
    })

    if (txError) {
      console.error('[Recharge] transaction insert error:', JSON.stringify(txError))
      return ok({
        message: '充值成功（交易记录写入失败）',
        balance: newBalance,
        amount: rechargeAmount,
        tx_no: txNo,
        txError: JSON.stringify(txError),
      })
    }

    return ok({
      message: '充值成功',
      balance: newBalance,
      amount: rechargeAmount,
      tx_no: txNo,
      _api_version: 'v2',
    })
  } catch (e: any) {
    console.error('Recharge error:', e)
    return serverError()
  }
}
