import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    // User stats
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    let totalInvestment = 0, totalDividendsDistributed = 0
    try {
      const { data: invData } = await supabase.from('users').select('total_investment.sum()')
      totalInvestment = invData?.[0]?.sum || 0
      const { data: divData } = await supabase.from('users').select('total_dividends.sum()')
      totalDividendsDistributed = divData?.[0]?.sum || 0
    } catch (_) {}

    // Asset stats
    let totalUnits = 0, availableUnits = 0
    try {
      const { data: unitsData } = await supabase.from('battery_assets').select('total_units.sum()')
      totalUnits = unitsData?.[0]?.sum || 0
      const { data: availData } = await supabase.from('battery_assets').select('available_units.sum()')
      availableUnits = availData?.[0]?.sum || 0
    } catch (_) {}

    // Trade stats
    const { count: totalTrades } = await supabase.from('trade_records').select('*', { count: 'exact', head: true })
    let totalTradeVolume = 0, totalFeesCollected = 0
    try {
      const { data: tradeVol } = await supabase.from('trade_records').select('total_amount.sum()')
      totalTradeVolume = tradeVol?.[0]?.sum || 0
      const { data: feeVol } = await supabase.from('trade_records').select('fee.sum()')
      totalFeesCollected = feeVol?.[0]?.sum || 0
    } catch (_) {}

    // Dividend stats
    const { count: totalDividends } = await supabase.from('dividend_records').select('*', { count: 'exact', head: true })
    let totalDividendAmount = 0
    try {
      const { data: divSum } = await supabase.from('dividend_records').select('dividend_amount.sum()')
      totalDividendAmount = divSum?.[0]?.sum || 0
    } catch (_) {}

    // Recent trades
    const { data: recentTrades } = await supabase.from('trade_records')
      .select('*, buyer:buyer_id(username), seller:seller_id(username), battery_assets!inner(name)')
      .order('trade_time', { ascending: false }).limit(10)

    // Recent users
    const { data: recentUsers } = await supabase.from('users')
      .select('id, email, username, full_name, role, agent_type, total_investment, total_dividends, created_at')
      .order('created_at', { ascending: false }).limit(10)

    // Profit history
    const { data: profitHistory } = await supabase.from('platform_profits')
      .select('*').order('period', { ascending: false }).limit(12)

    return ok({
      users: {
        total_users: totalUsers || 0, new_users_30d: 0, verified_users: 0,
        total_investment: totalInvestment || 0, total_dividends_distributed: totalDividendsDistributed || 0
      },
      assets: {
        total_assets: 0, total_units: totalUnits || 0,
        available_units: availableUnits || 0, sold_units: (totalUnits || 0) - (availableUnits || 0)
      },
      trades: {
        total_trades: totalTrades || 0, trades_24h: 0,
        total_trade_volume: totalTradeVolume, total_fees_collected: totalFeesCollected
      },
      dividends: {
        total_dividends: totalDividends || 0,
        total_dividend_amount: totalDividendAmount, dividend_periods: 0
      },
      recentTrades: (recentTrades || []).map((t: any) => ({
        ...t, buyer_name: t.buyer?.username, seller_name: t.seller?.username,
        asset_name: t.battery_assets?.name, battery_assets: undefined, buyer: undefined, seller: undefined
      })),
      recentUsers: recentUsers || [],
      monthlyData: [],
      profitHistory: profitHistory || [],
    })
  } catch (e: any) {
    console.error('Dashboard error:', e)
    return serverError()
  }
}
