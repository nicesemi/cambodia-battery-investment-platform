import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sold-batteries — 已售电池监控面板
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 并行拉取所有数据
    const [
      { count: totalSold },
      { data: todayOrders },
      { data: investorIds },
      { data: allRevenue },
      { data: batteries, count: batteryCount, error: batteryError },
      { data: recentOrders },
    ] = await Promise.all([
      supabase.from('battery_units').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('investor_orders').select('id, total_amount')
        .gte('created_at', new Date().toISOString().slice(0, 10)).eq('status', 'completed'),
      supabase.from('battery_units').select('investor_id').eq('status', 'sold'),
      supabase.from('investor_orders').select('total_amount').eq('status', 'completed'),
      // 已售电池列表（分页）
      supabase.from('battery_units').select(`
        id, unit_code, site_name, status, investor_id, sensor_battery_level, sensor_temperature,
        sensor_cycle_count, sensor_health_status, created_at, updated_at,
        battery_assets!inner(id, name, battery_type, unit_price_rmb),
        users:investor_id(id, username, email, full_name)
      `, { count: 'exact' })
        .eq('status', 'sold')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1),
      // 最近订单
      supabase.from('investor_orders').select(`
        id, user_id, units, unit_price, total_amount, order_source, store_id, created_at,
        users:user_id(username, email),
        battery_assets:asset_id(name)
      `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (batteryError) return serverError(batteryError.message)

    // 统计
    const uniqueInvestors = Array.from(new Set((investorIds || []).map(r => r.investor_id).filter(Boolean)))
    const totalRevenue = (allRevenue || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
    const todayRevenue = (todayOrders || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0)

    const stats = {
      total_sold: totalSold || 0,
      today_sold: (todayOrders || []).length,
      today_revenue: todayRevenue,
      total_revenue: totalRevenue,
      active_investors: uniqueInvestors.length,
    }

    return ok({
      stats,
      batteries: (batteries || []).map((b: any) => ({
        ...b,
        investor_name: b.users?.username || '-',
        asset_name: b.battery_assets?.name || '-',
        users: undefined,
      })),
      recent_orders: (recentOrders || []).map((o: any) => ({
        ...o,
        investor_name: o.users?.username || '-',
        asset_name: o.battery_assets?.name || '-',
        users: undefined,
        battery_assets: undefined,
      })),
      total: batteryCount || 0,
      page,
      limit,
    })
  } catch (e: any) {
    return serverError()
  }
}
