import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/franchisee/stores/[storeId]/performance
 * 返回门店本月业绩：月营收 + 销售佣金 + 月租金分红
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { storeId } = await params
    const adminClient = getSupabaseAdmin()

    // 验证门店存在且有权限
    const { data: store, error: storeError } = await adminClient
      .from('franchisee_stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) return notFound('Store not found')

    // 权限检查：owner / admin / operator 直接放行
    if (store.owner_id !== user.id && user.role !== 'admin' && user.role !== 'operator') {
      // 检查是否为有权查看该门店的代理（市级加盟商或省级代理）
      const { data: agentApps } = await adminClient
        .from('agent_applications')
        .select('id, agent_type')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (!agentApps || agentApps.length === 0) {
        return unauthorized('Access denied')
      }

      const agent = agentApps[0]

      // 查询门店owner的 franchisee_applications，确认parent_agent_id是否匹配
      const { data: storeOwnerApp } = await adminClient
        .from('franchisee_applications')
        .select('parent_agent_id')
        .eq('user_id', store.owner_id)
        .eq('status', 'approved')
        .maybeSingle()

      let hasAccess = false
      if (storeOwnerApp) {
        if (agent.agent_type === 'city_franchisee') {
          // 市级代理：门店owner的parent_agent_id等于自己的agent id
          hasAccess = storeOwnerApp.parent_agent_id === agent.id
        } else if (agent.agent_type === 'province_agent') {
          // 省代理：门店owner的parent_agent_id属于省代理下辖的市级代理
          const { data: cityAgents } = await adminClient
            .from('agent_applications')
            .select('id')
            .eq('parent_agent_id', agent.id)
            .eq('status', 'approved')
          const cityAgentIds = (cityAgents || []).map(a => a.id)
          hasAccess = cityAgentIds.includes(storeOwnerApp.parent_agent_id)
        }
      }

      if (!hasAccess) {
        return unauthorized('Access denied')
      }
    }

    // 本月时间范围
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 通过 staff_registration 找到本门店引导的投资者
    const { data: regOrders } = await adminClient
      .from('investor_orders')
      .select('user_id')
      .eq('store_id', storeId)
      .eq('order_source', 'staff_registration')
      .in('status', ['completed', 'pending'])

    const investorIds = Array.from(new Set((regOrders || []).map((o: any) => o.user_id).filter(Boolean)))

    // 1. 统计该门店绑定的投资者订单（全量，不限 store_id，因线上购买订单 store_id 为 NULL）
    const { data: orders, error: ordersError } = investorIds.length > 0
      ? await adminClient
          .from('investor_orders')
          .select('total_amount, units, created_at, user_id')
          .in('user_id', investorIds)
          .eq('order_source', 'online')
          .eq('status', 'completed')
      : { data: [] }

    const totalOrders = orders?.length || 0
    const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0 as number)
    const totalUnits = (orders || []).reduce((sum: number, o: any) => sum + Number(o.units || 0), 0 as number)

    // 本月业绩仅统计绑定投资者（通过 staff_registration 注册）的购买金额
    const monthOrders = (orders || []).filter((o: any) =>
      o.created_at >= monthStart && investorIds.includes(o.user_id)
    )
    const monthlyRevenue = monthOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)

    // 2. 计算本月佣金和租金分成
    let monthlyCommission = 0
    let monthlyRentShare = 0

    if (investorIds.length > 0) {
      const STORE_COMMISSION = 0.05

      // 2a. 本月购买佣金：仅限本月新购买的 online 订单（佣金一次性）
      const { data: monthPurchaseOrders } = await adminClient
        .from('investor_orders')
        .select('total_amount, units, unit_price')
        .in('user_id', investorIds)
        .eq('order_source', 'online')
        .eq('status', 'completed')
        .gte('created_at', monthStart)

      if (monthPurchaseOrders && monthPurchaseOrders.length > 0) {
        for (const o of monthPurchaseOrders) {
          const purchase = o.total_amount || (o.units || 0) * (o.unit_price || 0)
          monthlyCommission += purchase * STORE_COMMISSION
        }
      }

      // 2b. 本月租金分成：所有 active 电池当月租金（不受购买月份限制）
      const { data: activeUnits } = await adminClient
        .from('battery_units')
        .select('investor_id, battery_asset_id, activated_at')
        .in('investor_id', investorIds)
        .eq('status', 'active')

      if (activeUnits && activeUnits.length > 0) {
        // 批量获取关联 battery_assets 的 monthly_rent
        const assetIds = Array.from(new Set(activeUnits.map((u: any) => u.battery_asset_id).filter(Boolean)))
        const { data: assets } = assetIds.length > 0
          ? await adminClient.from('battery_assets').select('id, monthly_rent').in('id', assetIds)
          : { data: [] }
        const rentMap = new Map((assets || []).map((a: any) => [a.id, Number(a.monthly_rent || 0)]))

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

        for (const u of (activeUnits || [])) {
          const monthlyRent = rentMap.get(u.battery_asset_id) || 0
          if (monthlyRent <= 0) continue

          // 计算当月有效天数（10天等待期 + 首月按天折算）
          const activatedAt = u.activated_at ? new Date(u.activated_at) : null
          let effectiveDays = daysInMonth

          if (activatedAt) {
            const actYear = activatedAt.getFullYear()
            const actMonth = activatedAt.getMonth()
            const curYear = now.getFullYear()
            const curMonth = now.getMonth()

            if (actYear === curYear && actMonth === curMonth) {
              // 本月激活：前10天等待期不计租金
              // 有效天数 = totalDays - (activatedDay - 1) - 10，至少0
              const actDay = activatedAt.getDate()
              effectiveDays = Math.max(0, daysInMonth - actDay + 1 - 10)
            }
            // 上月及之前激活：全月有效
          }

          const proratedRent = monthlyRent * (effectiveDays / daysInMonth)
          monthlyRentShare += proratedRent * STORE_COMMISSION
        }
      }
    }

    return ok({
      store_id: storeId,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      monthly_revenue: monthlyRevenue,
      monthly_orders: monthOrders.length,
      monthly_commission: +monthlyCommission.toFixed(2),
      monthly_rent_share: +monthlyRentShare.toFixed(2),
      monthly_total: +monthlyRevenue.toFixed(2),
    })
  } catch (e: any) {
    return serverError()
  }
}
