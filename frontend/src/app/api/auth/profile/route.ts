import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, badRequest, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data: profile } = await supabase.from('users')
      .select('id, email, username, full_name, phone, country, language, role, agent_type, kyc_status, total_investment, total_dividends, created_at, email_verified, certification_status, rejection_reason, id_card_front_url, id_card_back_url, business_license_url')
      .eq('id', user.id).single()

    const { data: wallet } = await getSupabaseAdmin().from('user_wallets')
      .select('balance, frozen_balance, currency').eq('user_id', user.id).single()

    console.log('[Profile] user_id:', user.id, 'wallet.balance:', wallet?.balance)

    return ok({ 
      user: profile ? { ...profile, agentType: profile.agent_type || null } : null,
      wallet,
      _serverTime: new Date().toISOString(),
      _version: 'fix-cache-v2'
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    })
  } catch (e: any) {
    console.error('Profile error:', e)
    return serverError()
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { full_name, phone, country, language, username } = body

    // Build update object with only allowed fields
    const updateData: Record<string, any> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (country !== undefined) updateData.country = country
    if (language !== undefined) updateData.language = language
    if (username !== undefined) updateData.username = username

    if (Object.keys(updateData).length === 0) {
      return badRequest('没有可更新的字段')
    }

    // Check username uniqueness if being changed
    if (username) {
      const { data: existing } = await getSupabaseAdmin()
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        return badRequest('用户名已被占用')
      }
    }

    const { data: updated, error } = await getSupabaseAdmin()
      .from('users')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, email, username, full_name, phone, country, language, role, agent_type, email_verified, certification_status')
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return serverError(error.message)
    }

    return ok({
      message: '个人资料更新成功',
      user: { ...updated, agentType: updated.agent_type || null },
    })
  } catch (e: any) {
    console.error('Profile PUT error:', e)
    return serverError()
  }
}
