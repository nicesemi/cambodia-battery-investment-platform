import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin' && user.role !== 'operator') return unauthorized('Admin only')

    const body = await request.json()
    const { period } = body
    if (!period) return badRequest('Period required (YYYY-MM)')

    // Calculate platform profit (simplified)
    const { data: existingProfit } = await supabase.from('platform_profits').select('*').eq('period', period).single()

    let investorShare: number
    if (existingProfit) {
      investorShare = Number(existingProfit.investor_share)
    } else {
      // Simulate
      const totalRevenue = 5000 * 2 // 5000 swaps * $2
      const electricityCost = 5000 * 0.3
      const maintenanceCost = 10 * 200
      const staffCost = 10 * 300
      const totalCost = electricityCost + maintenanceCost + staffCost
      const grossProfit = totalRevenue - totalCost
      const operatingCost = grossProfit * 0.1
      const netProfit = grossProfit - operatingCost
      const profitShareRatio = 0.70
      investorShare = netProfit * profitShareRatio
      const platformShare = netProfit * (1 - profitShareRatio)

      await supabase.from('platform_profits').insert({
        period, total_revenue: totalRevenue, total_cost: totalCost, gross_profit: grossProfit,
        operating_cost: operatingCost, net_profit: netProfit, investor_share: investorShare,
        platform_share: platformShare, exchange_stations: 10, battery_count: 500, swap_count: 5000
      })
    }

    // Get all user assets and cross-check with investor_battery_units
    // to exclude batteries that have been sold back to platform (no active holding)
    const { data: userAssets } = await supabase.from('user_assets').select('user_id, asset_id, units, users(email, username)').gt('units', 0)
    if (!userAssets?.length) return ok({ message: 'No users to distribute', period, totalDividendPool: 0 })

    // Cross-check: filter out assets where user has no active investor_battery_units
    const activeHolderIds = new Set<number>()
    for (const ua of userAssets) {
      const { data: holdings } = await supabase.from('investor_battery_units')
        .select('id').eq('investor_id', ua.user_id).eq('battery_id', ua.asset_id).limit(1)
      if (holdings && holdings.length > 0) activeHolderIds.add(ua.user_id)
    }
    const eligibleAssets = userAssets.filter(ua => activeHolderIds.has(ua.user_id))

    const totalUnits = eligibleAssets.reduce((s: number, ua: any) => s + ua.units, 0)
    const dividendPerUnit = investorShare / totalUnits

    for (const ua of eligibleAssets) {
      const dividend = ua.units * dividendPerUnit
      const dividendNo = `DIV${period}${String(ua.user_id).substring(0, 8).toUpperCase()}`

      await supabase.from('dividend_records').insert({
        dividend_no: dividendNo, user_id: ua.user_id, asset_id: ua.asset_id,
        period, units_held: ua.units, profit_amount: investorShare, dividend_amount: dividend,
        platform_fee: 0, status: 'completed'
      })

      const { data: w } = await supabase.from('user_wallets').select('balance').eq('user_id', ua.user_id).single()
      await supabase.from('user_wallets').update({ balance: Number(w?.balance || 0) + dividend }).eq('user_id', ua.user_id)

      const { data: cu } = await supabase.from('users').select('total_dividends').eq('id', ua.user_id).single()
      await supabase.from('users').update({ total_dividends: Number(cu?.total_dividends || 0) + dividend }).eq('id', ua.user_id)

      await supabase.from('user_assets').update({ total_dividends_received: 0 }).eq('user_id', ua.user_id).eq('asset_id', ua.asset_id)

      await supabase.from('transactions').insert({
        tx_no: `TX${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
        user_id: ua.user_id, type: 'dividend', amount: dividend, status: 'completed',
        remark: `${period} dividend for ${ua.units} units`
      })
    }

    return ok({ message: 'Dividend calculation completed', period, totalDividendPool: investorShare, totalUnits, dividendPerUnit, userCount: eligibleAssets.length })
  } catch (e: any) {
    console.error('Dividend calc error:', e)
    return serverError()
  }
}
