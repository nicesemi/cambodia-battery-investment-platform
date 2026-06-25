import { supabase } from '@/lib/supabase'
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
      .select('id, agent_type, region, city, agent_code')
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
      return await getManagedFranchisees(agent)
    }

    return ok({ stores: [], franchisees: [] })
  } catch (e: any) {
    console.error('Agent managed error:', e)
    return serverError()
  }
}

/** 获取某代理管理的所有门店 */
async function getManagedStores(agent: any, search: string) {
  if (agent.agent_type === 'province_agent') {
    // 省代理：找本省所有市级加盟商，汇总其门店
    const { data: cityAgents } = await supabase
      .from('agent_applications')
      .select('id, user_id, city')
      .eq('parent_agent_id', agent.id)
      .eq('status', 'approved')

    if (!cityAgents || cityAgents.length === 0) {
      return ok({ agent_type: agent.agent_type, territory: agent.city || agent.region, stores: [] })
    }

    const ownerIds = cityAgents.map(a => a.user_id)
    // 也包含市级加盟商的 agent id（如果有门店直接用 agent id 作为 owner）
    const agentIds = cityAgents.map(a => a.id)
    const allIds = Array.from(new Set([...ownerIds, ...agentIds]))

    let query = supabase
      .from('franchisee_stores')
      .select('id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id')
      .in('owner_id', allIds)
      .order('city', { ascending: true })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`)
    }

    const { data: stores } = await query

    return ok({
      agent_type: agent.agent_type,
      territory: agent.city || agent.region,
      stores: stores || [],
    })
  } else {
    // 市代理：找本代理下属的所有门店
    const ownerIds = await getOwnerIdsForAgent(agent.id, agent.user_id)

    let query = supabase
      .from('franchisee_stores')
      .select('id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id')
      .in('owner_id', ownerIds)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`)
    }

    const { data: stores } = await query

    return ok({
      agent_type: agent.agent_type,
      territory: agent.city,
      stores: stores || [],
    })
  }
}

/** 获取代理的下属加盟商 */
async function getManagedFranchisees(agent: any) {
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

    // 查门店数
    const fIds = franchisees?.map(f => f.id) || []
    let countMap = new Map()
    if (fIds.length > 0) {
      const { data: storeCounts } = await supabase
        .from('franchisee_stores')
        .select('owner_id')
        .in('owner_id', fIds)
      if (storeCounts) {
        for (const s of storeCounts) {
          countMap.set(s.owner_id, (countMap.get(s.owner_id) || 0) + 1)
        }
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
    // 市代理：本市所有门店（区县加盟商=门店）
    const ownerIds = await getOwnerIdsForAgent(agent.id, agent.user_id)

    const { data: stores } = await supabase
      .from('franchisee_stores')
      .select('id, name, city, address, phone, status, total_batteries, revenue_share, store_code, owner_id')
      .in('owner_id', ownerIds)
      .order('created_at', { ascending: false })

    return ok({
      agent_type: agent.agent_type,
      stores: stores || [],
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
