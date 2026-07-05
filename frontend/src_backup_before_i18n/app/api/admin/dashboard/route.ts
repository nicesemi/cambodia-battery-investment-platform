import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const adminClient = getSupabaseAdmin()

    let dashboardData: any
    try {
      const { data, error } = await adminClient.rpc('get_admin_dashboard')
      if (error || !data) throw error || new Error('RPC returned empty data')
      dashboardData = data
    } catch (rpcErr) {
      console.error('Dashboard RPC error:', rpcErr)
      return serverError()
    }

    // 用 store_performance 汇总所有门店的 total_sales 作为 total_investment
    let storePerformanceSum = 0
    try {
      const { data: perfData } = await adminClient
        .from('store_performance')
        .select('total_sales, franchisee_stores!inner(store_type)')
      storePerformanceSum = (perfData || []).reduce((sum: number, p: any) => sum + (Number(p.total_sales) || 0), 0)
    } catch (perfErr) {
      console.error('store_performance query error:', perfErr)
    }

    const d = dashboardData

    return ok({
      users: {
        total_users: d.total_users || 0,
        new_users_30d: 0,
        verified_users: 0,
        total_investment: storePerformanceSum || d.total_investment || 0,
        total_dividends_distributed: d.total_dividends_distributed || 0,
      },
      stores: {
        total_stores: d.total_stores || 0,
        active_stores: d.active_stores || 0,
        pending_stores: (d.total_stores || 0) - (d.active_stores || 0),
      },
      assets: {
        total_assets: d.total_assets || 0,
        total_units: d.total_units || 0,
        available_units: (d.total_units || 0) - (d.sold_units || 0),
        sold_units: d.sold_units || 0,
      },
      trades: {
        total_trades: d.total_trades || 0,
        trades_24h: 0,
        total_trade_volume: d.total_trade_volume || 0,
        total_fees_collected: 0,
      },
      dividends: {
        total_dividends: d.total_dividends || 0,
        total_dividend_amount: d.total_dividend_amount || 0,
        dividend_periods: 0,
      },
      finance: {
        total_battery_purchases: d.total_battery_purchases || 0,
        total_battery_purchase_amount: d.total_battery_purchase_amount || 0,
        total_recharge: d.total_recharge || 0,
        total_withdrawal_approved: d.total_withdrawal_approved || 0,
        total_withdrawal_pending: d.total_withdrawal_pending || 0,
        total_withdrawal: (d.total_withdrawal_approved || 0) + (d.total_withdrawal_pending || 0),
        total_agent_commission: d.total_agent_commission || 0,
        total_platform_dividend_share: d.total_platform_dividend_share || 0,
        total_platform_fees: d.total_platform_fees || 0,
        total_buyback_amount: d.total_buyback_amount || 0,
        total_buyback_count: d.total_buyback_count || 0,
        battery_type_sales: d.battery_type_sales || [],
      },
      recentTrades: (d.recent_orders || []).map((o: any) => ({
        id: o.id,
        buyer_name: o.user_id,
        seller_name: o.store_id,
        total_amount: o.total_amount,
        asset_name: '',
        trade_time: o.created_at,
      })),
      recentUsers: d.recent_users || [],
      monthlyData: [],
      profitHistory: d.profit_history || [],
    })
  } catch (e: any) {
    console.error('Dashboard error:', e)
    return serverError()
  }
}
