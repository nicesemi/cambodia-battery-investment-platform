import { supabase } from '@/lib/supabase'
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

    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError)
      return serverError('钱包信息获取失败')
    }

    const newBalance = Number(wallet.balance) + rechargeAmount

    // Update balance
    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('Recharge error:', updateError)
      return serverError('充值失败，请重试')
    }

    return ok({
      message: '充值成功',
      balance: newBalance,
      amount: rechargeAmount,
    })
  } catch (e: any) {
    console.error('Recharge error:', e)
    return serverError()
  }
}
