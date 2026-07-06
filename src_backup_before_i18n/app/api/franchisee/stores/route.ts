import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken, requireVerified } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      return unauthorized('Franchisee only')
    }

    const adminClient = getSupabaseAdmin()

    // 收集所有 owner_id：自营门店 + 如果是市级/省级代理则包含下辖门店
    let ownerIds = [user.id]

    if (user.role === 'franchisee') {
      // 查找代理身份并收集下辖门店
      const { data: agentApps } = await adminClient
        .from('agent_applications')
        .select('id, agent_type')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (agentApps && agentApps.length > 0) {
        const agentId = agentApps[0].id
        const agentType = agentApps[0].agent_type

        if (agentType === 'city_franchisee') {
          // 市级加盟商：直接查下辖 franchisee_applications
          const { data: subApps } = await adminClient
            .from('franchisee_applications')
            .select('user_id')
            .eq('parent_agent_id', agentId)
            .eq('status', 'approved')
          for (const a of (subApps || [])) {
            if (!ownerIds.includes(a.user_id)) ownerIds.push(a.user_id)
          }
        } else if (agentType === 'province_agent') {
          // 省代理：先查市级加盟商 → 再查市级下的 franchisee_applications
          const { data: cityAgents } = await adminClient
            .from('agent_applications')
            .select('id')
            .eq('parent_agent_id', agentId)
            .eq('status', 'approved')
          const cityAgentIds = (cityAgents || []).map(a => a.id)
          if (cityAgentIds.length > 0) {
            const { data: subApps } = await adminClient
              .from('franchisee_applications')
              .select('user_id')
              .in('parent_agent_id', cityAgentIds)
              .eq('status', 'approved')
            for (const a of (subApps || [])) {
              if (!ownerIds.includes(a.user_id)) ownerIds.push(a.user_id)
            }
          }
          // 同时也查市级加盟商自己的门店（市级加盟商也是owner）
          const { data: cityAgentsUsers } = await adminClient
            .from('agent_applications')
            .select('user_id')
            .in('id', cityAgentIds)
          for (const a of (cityAgentsUsers || [])) {
            if (!ownerIds.includes(a.user_id)) ownerIds.push(a.user_id)
          }
        }
      } else {
        // fallback: 区县加盟商（franchisee_applications 表，agent_type 为 county_franchisee）
        const { data: franchiseeApps } = await adminClient
          .from('franchisee_applications')
          .select('id, agent_type')
          .eq('user_id', user.id)
          .eq('status', 'approved')
        if (franchiseeApps && franchiseeApps.length > 0) {
          const agentId = franchiseeApps[0].id
          // 区县加盟商也可能有下辖门店
          const { data: subApps } = await adminClient
            .from('franchisee_applications')
            .select('user_id')
            .eq('parent_agent_id', agentId)
            .eq('status', 'approved')
          for (const a of (subApps || [])) {
            if (!ownerIds.includes(a.user_id)) ownerIds.push(a.user_id)
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('franchisee_stores')
      .select('*')
      .in('owner_id', ownerIds)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    const stores = data || []
    if (stores.length === 0) return ok({ stores: [] })

    // 统计运营电池数 & 门店归属分类
    // 核心原则：门店归属由投资者关系决定，而非 owner_id
    // - 若门店的投资者是下辖加盟商 → 加盟门店 (is_managed = true)
    // - 若门店的投资者是代理自己 → 自营门店 (is_managed = false)
    const subordinateSet = new Set(ownerIds.filter(id => id !== user.id));

    const storeIds = stores.map((s: any) => s.id)
    const { data: orders } = await adminClient
      .from('investor_orders')
      .select('store_id, user_id')
      .eq('order_source', 'staff_registration')
      .in('store_id', storeIds)
      .eq('status', 'completed')

    // store_id → 投资者 user_id 映射（一店可以有多个投资者）
    const storeToInvestors: Record<string, string[]> = {}
    for (const o of (orders || [])) {
      if (!storeToInvestors[o.store_id]) storeToInvestors[o.store_id] = []
      if (!storeToInvestors[o.store_id].includes(o.user_id)) {
        storeToInvestors[o.store_id].push(o.user_id)
      }
    }

    // 判定 is_managed：门店投资者中是否有下辖加盟商
    const storeIsManaged: Record<string, boolean> = {}
    for (const s of stores) {
      const investors = storeToInvestors[s.id] || []
      if (investors.length > 0) {
        // 有投资者：投资者中任一属于下辖加盟商 → 加盟门店
        storeIsManaged[s.id] = investors.some(invId => subordinateSet.has(invId))
      } else {
        // 无投资者：回退到 owner_id 判断
        storeIsManaged[s.id] = subordinateSet.has(s.owner_id)
      }
    }

    const investorToStores: Record<string, string> = {}
    for (const o of (orders || [])) {
      investorToStores[o.user_id] = o.store_id
    }
    const investorIds = Object.keys(investorToStores)

    const storeBatteryCount: Record<string, number> = {}
    const storeInvestorCount: Record<string, number> = {}
    for (const o of (orders || [])) {
      const sid = o.store_id
      storeInvestorCount[sid] = (storeInvestorCount[sid] || 0) + 1
    }

    if (investorIds.length > 0) {
      const { data: units } = await adminClient
        .from('battery_units')
        .select('investor_id')
        .in('investor_id', investorIds)
        .eq('status', 'sold')
      for (const u of (units || [])) {
        const sid = investorToStores[u.investor_id]
        if (sid) {
          storeBatteryCount[sid] = (storeBatteryCount[sid] || 0) + 1
        }
      }
    }

    // 查询 store_performance 累计数据 + 本月 online 订单（按绑定投资者汇总到门店）
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const perfMap: Record<string, any> = {}
    const monthlySalesMap: Record<string, number> = {}
    const allStoreInvestors = Array.from(new Set((orders || []).map((o: any) => o.user_id)))
    if (storeIds.length > 0) {
      const [perfRows, monthlyRows] = await Promise.all([
        adminClient.from('store_performance').select('*').in('store_id', storeIds),
        allStoreInvestors.length > 0
          ? adminClient
              .from('investor_orders')
              .select('user_id, total_amount')
              .in('user_id', allStoreInvestors)
              .eq('order_source', 'online')
              .eq('status', 'completed')
              .gte('created_at', monthStart)
          : Promise.resolve({ data: [] }),
      ])
      for (const p of (perfRows.data || [])) {
        perfMap[p.store_id] = p
      }
      for (const m of (monthlyRows.data || [])) {
        for (const [sid, investors] of Object.entries(storeToInvestors)) {
          if (investors.includes(m.user_id)) {
            monthlySalesMap[sid] = (monthlySalesMap[sid] || 0) + (Number(m.total_amount) || 0)
          }
        }
      }
    }

    const enriched = stores.map((s: any) => {
      const perf = perfMap[s.id] || {}
      return {
        ...s,
        total_batteries: storeBatteryCount[s.id] || 0,
        battery_count: storeBatteryCount[s.id] || 0,
        bound_investor_count: storeInvestorCount[s.id] || 0,
        is_managed: storeIsManaged[s.id] || false,
        total_sales: perf.total_sales || 0,
        total_commission: perf.total_commission || 0,
        total_rental_income: perf.total_rental_income || 0,
        order_count: perf.order_count || 0,
        monthly_sales: monthlySalesMap[s.id] || 0,
      }
    })

    return ok({ stores: enriched })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // Check certification status
    const certError = requireVerified(user)
    if (certError) return certError

    const body = await request.json()
    const { name, city, address, phone } = body

    if (!name) return unauthorized('Store name is required')

    const { data, error } = await supabase
      .from('franchisee_stores')
      .insert({ name, city, address, phone, owner_id: user.id, status: 'pending' })
      .select()
      .single()

    if (error) return serverError(error.message)
    return ok({ store: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
