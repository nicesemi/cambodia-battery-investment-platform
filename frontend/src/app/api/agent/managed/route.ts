import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/managed?type=stores|franchisees
 * 省级代理：查看本省所有门店 / 本省市级加盟商（按城市分组）
 * 市级加盟商：查看本市所有门店 / 本市门店
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'stores'
    const search = url.searchParams.get('search') || ''

    // 查找当前用户的已审批代理身份
    const { data: agentApps, error: agentErr } = await supabase
      .from('agent_applications')
      .select('id, user_id, agent_type, region, city, agent_code')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (agentErr) return serverError(agentErr.message)
    if (!agentApps || agentApps.length === 0) {
      return forbidden('您不是已审批的代理商')
    }

    const agent = agentApps[0]

    if (type === 'stores') {
      return await getManagedStores(agent, search)
    } else if (type === 'franchisees') {
      return await getManagedFranchisees(agent, search)
    }

    return ok({ stores: [], franchisees: [] })
  } catch (e: any) {
    console.error('Agent managed error:', e)
    return serverError()
  }
}

/**
 * 基于 staff_registration → investor → battery_units 计算门店实际电池数
 */
async function enrichBatteryCounts(stores: any[]): Promise<Record<string, number>> {
  const adminClient = getSupabaseAdmin()
  const storeIds = stores.map(s => s.id)
  const countMap: Record<string, number> = {}
  if (storeIds.length === 0) return countMap

  const { data: orders } = await adminClient
    .from('investor_orders')
    .select('store_id, user_id')
    .eq('order_source', 'staff_registration')
    .in('store_id', storeIds)
    .eq('status', 'completed')

  const investorToStores: Record<string, string> = {}
  for (const o of (orders || [])) {
    investorToStores[o.user_id] = o.store_id
  }
  const investorIds = Object.keys(investorToStores)

  if (investorIds.length > 0) {
    const { data: units } = await adminClient
      .from('battery_units')
      .select('investor_id')
      .in('investor_id', investorIds)
      .eq('status', 'sold')
    for (const u of (units || [])) {
      const sid = investorToStores[u.investor_id]
      if (sid) countMap[sid] = (countMap[sid] || 0) + 1
    }
  }

  return countMap
}

/** 获取某代理管理的所有门店 */
async function getManagedStores(agent: any, search: string) {
  if (agent.agent_type === 'province_agent') {
    // 省代理：找本省所有市级加盟商 → 市级加盟商旗下的加盟申请 → 门店
    const { data: cityAgents } = await supabase
      .from('agent_applications')
      .select('id, user_id, city')
      .eq('parent_agent_id', agent.id)
      .eq('status', 'approved')

    if (!cityAgents || cityAgents.length === 0) {
      return ok({ agent_type: agent.agent_type, territory: agent.city || agent.region, stores: [] })
    }

    const cityAgentIds = cityAgents.map(a => a.id)

    // 查市级加盟商旗下的加盟申请(franchisee_applications)
    const { data: franchiseeApps } = await supabase
      .from('franchisee_applications')
      .select('user_id')
      .in('parent_agent_id', cityAgentIds)
      .eq('status', 'approved')

    const ownerIds = Array.from(new Set([
      ...cityAgents.map(a => a.user_id),
      ...(franchiseeApps || []).map(f => f.user_id),
    ]))

    const adminClient = getSupabaseAdmin()
    let query = adminClient
      .from('franchisee_stores')
      .select('id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id, photo_url')
      .in('owner_id', ownerIds)
      .order('city', { ascending: true })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`)
    }

    const { data: stores } = await query

    // 富化电池数
    const batteryCounts = await enrichBatteryCounts(stores || [])

    return ok({
      agent_type: agent.agent_type,
      territory: agent.city || agent.region,
      stores: (stores || []).map(s => ({
        ...s,
        total_batteries: batteryCounts[s.id] || s.total_batteries || 0,
      })),
    })
  } else {
    // 市代理：找本代理下属的所有门店 + 本市所有门店
    const ownerIds = await getOwnerIdsForAgent(agent.id, agent.user_id)

    const adminClient = getSupabaseAdmin()
    const selectFields = 'id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id, photo_url'

    // 并行查询：按 owner_id 查 + 按城市查，然后合并去重
    const [ownerResult, cityResult] = await Promise.all([
      ownerIds.length > 0
        ? adminClient.from('franchisee_stores').select(selectFields).in('owner_id', ownerIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
      agent.city
        ? adminClient.from('franchisee_stores').select(selectFields).eq('city', agent.city).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    if (ownerResult.error || cityResult.error) {
      return serverError((ownerResult.error || cityResult.error)?.message)
    }

    // 合并去重（按 id）
    const seen = new Set<string>()
    const allStores: any[] = []
    for (const s of [...(ownerResult.data || []), ...(cityResult.data || [])]) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        allStores.push(s)
      }
    }

    // 搜索过滤
    let filtered = allStores
    if (search) {
      const lower = search.toLowerCase()
      filtered = allStores.filter(s =>
        (s.name && s.name.toLowerCase().includes(lower)) ||
        (s.city && s.city.toLowerCase().includes(lower))
      )
    }

    // 富化电池数
    const batteryCounts = await enrichBatteryCounts(filtered)

    return ok({
      agent_type: agent.agent_type,
      territory: agent.city,
      stores: filtered.map(s => ({
        ...s,
        total_batteries: batteryCounts[s.id] || s.total_batteries || 0,
      })),
    })
  }
}

/** 获取代理的下属加盟商 */
async function getManagedFranchisees(agent: any, search: string) {
  if (agent.agent_type === 'province_agent') {
    // 省代理：本省市级加盟商（按城市分组）
    const { data: franchisees } = await supabase
      .from('agent_applications')
      .select('id, user_id, agent_type, city, agent_code, full_name, phone, status, created_at')
      .eq('parent_agent_id', agent.id)
      .eq('status', 'approved')
      .order('city', { ascending: true })

    // 查 user 信息
    const userIds = franchisees?.map(f => f.user_id) || []
    let userMap = new Map()
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, full_name, email, phone')
        .in('id', userIds)
      if (users) {
        for (const u of users) userMap.set(u.id, u)
      }
    }

    // 查门店数 — 复用 getOwnerIdsForAgent 逻辑：每个城市代理下属的 owner_id = [user_id, id] + franchisee_applications.user_id
    const fIds = franchisees?.map(f => f.id) || []
    const fUserIds = franchisees?.map(f => f.user_id) || []

    // 批量查所有城市代理的加盟申请
    const { data: subApps } = fIds.length > 0
      ? await supabase
          .from('franchisee_applications')
          .select('user_id, parent_agent_id')
          .in('parent_agent_id', fIds)
          .eq('status', 'approved')
      : { data: [] as any[] }

    // 构建每个城市代理 → 其 owner_id 列表的映射
    const agentOwnerMap = new Map<string, string[]>()
    for (const f of (franchisees || [])) {
      agentOwnerMap.set(f.id, [f.user_id, f.id])
    }
    for (const app of (subApps || [])) {
      const ids = agentOwnerMap.get(app.parent_agent_id)
      if (ids && !ids.includes(app.user_id)) ids.push(app.user_id)
    }

    // 收集所有 owner_id 后一次查询
    const allOwnerIds = new Set<string>()
    for (const ids of Array.from(agentOwnerMap.values())) {
      for (const oid of ids) allOwnerIds.add(oid)
    }

    const countMap = new Map<string, number>()
    if (allOwnerIds.size > 0) {
      const { data: storeCounts } = await supabase
        .from('franchisee_stores')
        .select('owner_id')
        .in('owner_id', Array.from(allOwnerIds))
      // 先按 owner_id 计数
      const ownerCountMap = new Map<string, number>()
      for (const s of (storeCounts || [])) {
        ownerCountMap.set(s.owner_id, (ownerCountMap.get(s.owner_id) || 0) + 1)
      }
      // 再按城市代理汇总
      for (const f of (franchisees || [])) {
        const oids = agentOwnerMap.get(f.id) || []
        let total = 0
        for (const oid of oids) {
          total += ownerCountMap.get(oid) || 0
        }
        countMap.set(f.id, total)
      }
    }

    const result = (franchisees || []).map(f => ({
      ...f,
      user: userMap.get(f.user_id) || null,
      store_count: countMap.get(f.id) || 0,
    }))

    // 按城市分组
    const groups: Record<string, any[]> = {}
    for (const f of result) {
      const city = f.city || '其他'
      if (!groups[city]) groups[city] = []
      groups[city].push(f)
    }

    return ok({
      agent_type: agent.agent_type,
      franchisee_groups: groups,
      franchisees: result,
    })
  } else {
    // 市代理：本市所有门店（区县加盟店=门店）
    const ownerIds = await getOwnerIdsForAgent(agent.id, agent.user_id)

    const adminClient = getSupabaseAdmin()
    const selectFields = 'id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id, photo_url'

    // 并行查询：按 owner_id 查 + 按城市模糊匹配，合并去重
    const [ownerResult, cityResult] = await Promise.all([
      ownerIds.length > 0
        ? adminClient.from('franchisee_stores').select(selectFields).in('owner_id', ownerIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
      agent.city
        ? adminClient.from('franchisee_stores').select(selectFields).ilike('city', `%${agent.city}%`).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    if (ownerResult.error || cityResult.error) {
      return serverError((ownerResult.error || cityResult.error)?.message)
    }

    // 合并去重（按 id）
    const seen = new Set<string>()
    const allStores: any[] = []
    for (const s of [...(ownerResult.data || []), ...(cityResult.data || [])]) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        allStores.push(s)
      }
    }

    return ok({
      agent_type: agent.agent_type,
      stores: allStores,
    })
  }
}

/** 获取某代理的所有下级 owner_id */
async function getOwnerIdsForAgent(agentId: string, userId: string): Promise<string[]> {
  const ids = [userId, agentId]

  // 查该代理审批通过的下属加盟店 owner
  const { data: subApps } = await supabase
    .from('franchisee_applications')
    .select('user_id')
    .eq('parent_agent_id', agentId)
    .eq('status', 'approved')

  if (subApps) {
    for (const a of subApps) {
      if (!ids.includes(a.user_id)) ids.push(a.user_id)
    }
  }

  return ids
}
