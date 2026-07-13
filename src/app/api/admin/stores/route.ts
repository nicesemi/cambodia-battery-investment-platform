import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const { data, error } = await supabase
      .from('franchisee_stores')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    // Batch fetch owners
    if (data && data.length > 0) {
      const ownerIds = [...new Set(data.map((s: any) => s.owner_id).filter(Boolean))]
      if (ownerIds.length > 0) {
        const { data: owners } = await getSupabaseAdmin()
          .from('users')
          .select('id, email, username, full_name')
          .in('id', ownerIds)
        const ownerMap = new Map((owners || []).map((u: any) => [u.id, u]))
        for (const s of data) {
          (s as any).owner = ownerMap.get(s.owner_id) || null
        }
      }
    }

    // 统计运营电池数：investor_orders(staff_registration) → investor → battery_units(sold)
    const storeIds = (data || []).map((s: any) => s.id)
    const adminClient = getSupabaseAdmin()

    // 并行查询：投资者订单 + store_performance + 本月 investor_orders
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [ordersRes, perfRes] = await Promise.all([
      adminClient
        .from('investor_orders')
        .select('store_id, user_id')
        .eq('order_source', 'staff_registration')
        .in('store_id', storeIds)
        .eq('status', 'completed'),
      storeIds.length > 0
        ? adminClient.from('store_performance').select('*').in('store_id', storeIds)
        : Promise.resolve({ data: [] }),
    ])

    const orders = ordersRes.data || []
    const investorToStores: Record<string, string> = {}
    for (const o of orders) {
      investorToStores[o.user_id] = o.store_id
    }
    const investorIds = Object.keys(investorToStores)

    const storeBatteryCount: Record<string, number> = {}
    if (investorIds.length > 0) {
      const { data: units } = await adminClient
        .from('battery_units')
        .select('investor_id')
        .in('investor_id', investorIds)
        .eq('status', 'sold')
      for (const u of (units || [])) {
        const storeId = investorToStores[u.investor_id]
        if (storeId) {
          storeBatteryCount[storeId] = (storeBatteryCount[storeId] || 0) + 1
        }
      }
    }

    // store_performance 索引
    const perfMap: Record<string, any> = {}
    for (const p of (perfRes.data || [])) {
      perfMap[p.store_id] = p
    }

    // 构建 store → investors 反向映射
    const storeToInvestors: Record<string, string[]> = {}
    for (const o of orders) {
      if (!storeToInvestors[o.store_id]) storeToInvestors[o.store_id] = []
      if (!storeToInvestors[o.store_id].includes(o.user_id)) {
        storeToInvestors[o.store_id].push(o.user_id)
      }
    }

    // 本月业绩：绑定投资者的本月 online 订单汇总
    const monthlySalesMap: Record<string, number> = {}
    if (investorIds.length > 0) {
      const { data: monthlyOrders } = await adminClient
        .from('investor_orders')
        .select('user_id, total_amount')
        .in('user_id', investorIds)
        .eq('order_source', 'online')
        .eq('status', 'completed')
        .gte('created_at', monthStart)
      for (const m of (monthlyOrders || [])) {
        for (const [sid, investors] of Object.entries(storeToInvestors)) {
          if (investors.includes(m.user_id)) {
            monthlySalesMap[sid] = (monthlySalesMap[sid] || 0) + (Number(m.total_amount) || 0)
          }
        }
      }
    }

    const stores = (data || []).map((s: any) => {
      const perf = perfMap[s.id] || {}
      return {
        ...s,
        battery_count: storeBatteryCount[s.id] || s.total_batteries || 0,
        performance: {
          total_sales: perf.total_sales || 0,
          total_commission: perf.total_commission || 0,
          monthly_sales: monthlySalesMap[s.id] || 0,
        },
      }
    })

    return ok({ stores })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const body = await request.json()
    const { name, city, address, phone, owner_id, revenue_share } = body

    if (!name) return badRequest('Store name is required')

    const insertData: Record<string, unknown> = {
      name, city, address, phone, owner_id,
      status: 'active'
    }
    if (revenue_share !== undefined) insertData.revenue_share = parseFloat(revenue_share)

    const { data, error } = await supabase.from('franchisee_stores').insert(insertData).select().single()

    if (error) return serverError(error.message)
    return ok({ store: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
