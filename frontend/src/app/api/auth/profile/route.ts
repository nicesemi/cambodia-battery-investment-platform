import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data: profile } = await supabase.from('users')
      .select('id, email, username, full_name, phone, country, language, role, agent_type, kyc_status, total_investment, total_dividends, created_at')
      .eq('id', user.id).single()

    const { data: wallet } = await supabase.from('user_wallets')
      .select('balance, frozen_balance, currency').eq('user_id', user.id).single()

    return ok({ user: profile, wallet })
  } catch (e: any) {
    console.error('Profile error:', e)
    return serverError()
  }
}
