import { supabase } from '@/lib/supabase'
import { authenticateToken, requireVerified } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // Check certification status
    const certError = requireVerified(user)
    if (certError) return certError

    const body = await request.json()
    const { assetId, units } = body
    if (!assetId || !units || units < 1) return badRequest('assetId and units (min 1) required')

    // Get asset
    const { data: asset, error: assetErr } = await supabase.from('battery_assets')
      .select('*').eq('id', assetId).eq('status', 'active').single()
    if (assetErr || !asset) return notFound('Asset not found or not active')
    if (asset.available_units < units) return badRequest('Insufficient available units')

    const totalCost = Number(asset.unit_price) * units

    // Check wallet
    const { data: wallet } = await supabase.from('user_wallets').select('balance').eq('user_id', user.id).single()
    if (!wallet || Number(wallet.balance) < totalCost) return badRequest('余额不足，请先去我的钱包充值！')

    // Execute: deduct balance
    const { error: deductErr } = await getSupabaseAdmin().from('user_wallets').update({ balance: Number(wallet.balance) - totalCost }).eq('user_id', user.id)
    if (deductErr) return serverError(deductErr.message)

    // Update asset available
    await supabase.from('battery_assets').update({ available_units: asset.available_units - units }).eq('id', assetId)

    // Upsert user_assets
    const { data: existing } = await supabase.from('user_assets').select('id, units, average_cost').eq('user_id', user.id).eq('asset_id', assetId).single()
    
    if (existing) {
      const newUnits = existing.units + units
      const newAvgCost = (existing.units * Number(existing.average_cost) + totalCost) / newUnits
      await supabase.from('user_assets').update({ units: newUnits, average_cost: newAvgCost }).eq('id', existing.id)
    } else {
      await supabase.from('user_assets').insert({ user_id: user.id, asset_id: assetId, units, average_cost: asset.unit_price })
    }

    // Update user total_investment
    const { data: curUser } = await supabase.from('users').select('total_investment').eq('id', user.id).single()
    const newTotal = Number(curUser?.total_investment || 0) + totalCost
    await supabase.from('users').update({ total_investment: newTotal }).eq('id', user.id)

    // Record transaction
    const { error: txError } = await supabase.from('transactions').insert({ tx_no: `TX${Date.now()}`, user_id: user.id, type: 'trade', amount: totalCost, status: 'completed' })
    if (txError) console.error('Purchase transaction insert error:', txError)

    return ok({ message: 'Asset purchased successfully', purchased: { assetId, units, unitPrice: asset.unit_price, totalCost } })
  } catch (e: any) {
    console.error('Purchase error:', e)
    return serverError()
  }
}
