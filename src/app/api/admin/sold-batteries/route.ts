import { supabase, getSupabaseAdmin } from '@/lib/supabase'
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

    const sortKey = searchParams.get('sortKey') || ''
    const sortDirection = searchParams.get('sortDirection') || 'asc'
    const ascending = sortKey ? (sortDirection === 'asc') : false

    // sortKey → Supabase .order() 列名映射
    const sortColumnMap: Record<string, string> = {
      unit_code: 'unit_code',
      asset_name: 'battery_assets(name)',
      investor_name: 'users(username)',
      brand_model: 'battery_assets(battery_type)',
      site_name: 'site_name',
      battery_level: 'sensor_battery_level',
      gps: 'sensor_latitude',
      health_status: 'sensor_battery_level',
      sold_price: 'battery_assets(unit_price)',
      created_at: 'created_at',
    }
    const orderColumn = sortColumnMap[sortKey] || 'created_at'

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
        sensor_cycle_count, sensor_health_status, sensor_longitude, sensor_latitude, created_at, updated_at,
        battery_assets!inner(id, name, name_i18n, battery_type, unit_price, unit_price_rmb)
      `, { count: 'exact' })
        .eq('status', 'sold')
        .order(orderColumn, { ascending })
        .range((page - 1) * limit, page * limit - 1),
      // 最近订单
      supabase.from('investor_orders').select(`
        id, user_id, units, unit_price, total_amount, order_source, store_id, created_at, asset_id
      `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (batteryError) return serverError(batteryError.message)

    // Batch fetch: investor users for batteries, order users & assets for recent orders
    const adminClient = getSupabaseAdmin()
    const batInvestorIds = [...new Set((batteries || []).map((b: any) => b.investor_id).filter(Boolean))]
    const orderUserIds = [...new Set((recentOrders || []).map((o: any) => o.user_id).filter(Boolean))]
    const orderAssetIds = [...new Set((recentOrders || []).map((o: any) => o.asset_id).filter(Boolean))]
    const allOrderUserIds = [...new Set([...batInvestorIds, ...orderUserIds])]

    const [batUsersRes, orderUsersRes, orderAssetsRes] = await Promise.all([
      batInvestorIds.length > 0
        ? adminClient.from('users').select('id, username, email, full_name').in('id', batInvestorIds)
        : { data: [] },
      allOrderUserIds.length > 0
        ? adminClient.from('users').select('id, username, email, full_name').in('id', allOrderUserIds)
        : { data: [] },
      orderAssetIds.length > 0
        ? adminClient.from('battery_assets').select('id, name').in('id', orderAssetIds)
        : { data: [] },
    ])

    const batUserMap = new Map((batUsersRes.data || []).map((u: any) => [u.id, u]))
    const orderUserMap = new Map((orderUsersRes.data || []).map((u: any) => [u.id, u]))
    const orderAssetMap = new Map((orderAssetsRes.data || []).map((a: any) => [a.id, a]))

    for (const b of (batteries || [])) {
      (b as any).users = batUserMap.get(b.investor_id) || null
    }
    for (const o of (recentOrders || [])) {
      (o as any).users = orderUserMap.get(o.user_id) || null
      ;(o as any).battery_assets = orderAssetMap.get(o.asset_id) || null
    }

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
