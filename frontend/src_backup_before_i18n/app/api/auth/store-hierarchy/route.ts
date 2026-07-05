import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/store-hierarchy
 * 返回当前投资者所属的门店-加盟商-省级总代理层级关系
 * 覆盖所有 investor_orders 中的门店绑定（不限 order_source，排除已取消）
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // 仅投资者可查询
    if (user.role !== 'investor') {
      return ok({ bindings: [] })
    }

    // 1. 查询投资者所有门店绑定（不限 order_source，排除已取消订单）
    const { data: orders } = await supabase
      .from('investor_orders')
      .select(`
        store_id,
        created_at,
        order_source,
        franchisee_stores!inner (
          id, name, city, address, store_code,
          owner_id
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (!orders || orders.length === 0) {
      return ok({ bindings: [] })
    }

    // 收集所有 owner_id 和 store 信息
    const storeMap = new Map<string, any>()
    const ownerIds = new Set<string>()

    for (const o of orders) {
      const store = (o as any).franchisee_stores
      if (!store) continue
      if (!storeMap.has(store.id)) {
        storeMap.set(store.id, {
          id: store.id,
          name: store.name,
          city: store.city,
          address: store.address,
          store_code: store.store_code,
        })
        ownerIds.add(store.owner_id)
      }
    }

    // 2. 查询加盟商用户信息
    const ownerIdList = Array.from(ownerIds)
    const { data: franchisees } = await supabase
      .from('users')
      .select('id, username, full_name, phone, email')
      .in('id', ownerIdList)

    const franchiseeMap = new Map<string, any>()
    if (franchisees) {
      for (const f of franchisees) {
        franchiseeMap.set(f.id, f)
      }
    }

    // 3. 查询加盟商的上级代理
    const { data: apps } = await supabase
      .from('franchisee_applications')
      .select('user_id, parent_agent_id')
      .in('user_id', ownerIdList)
      .eq('status', 'approved')

    // parent_agent_id → agent_applications 映射
    const parentAgentIds = new Set<string>()
    const franchiseeAgentMap = new Map<string, string>() // franchisee user_id → agent_application_id

    if (apps) {
      for (const a of apps) {
        if (a.parent_agent_id) {
          franchiseeAgentMap.set(a.user_id, a.parent_agent_id)
          parentAgentIds.add(a.parent_agent_id)
        }
      }
    }

    // 4. 查询上级代理（可能是市级或省级）
    const agentMap = new Map<string, any>()
    const provinceAgentIds = new Set<string>() // 如果上级是市级代理，需要再查省级
    const agentToParentMap = new Map<string, string>() // agent_id → parent_agent_id (省级)

    if (parentAgentIds.size > 0) {
      const agentIdList = Array.from(parentAgentIds)
      const { data: agentApps } = await supabase
        .from('agent_applications')
        .select('id, user_id, agent_type, region, city, agent_code, parent_agent_id, full_name')
        .in('id', agentIdList)
        .eq('status', 'approved')

      if (agentApps) {
        for (const aa of agentApps) {
          // 如果是市级代理，记录其省级上级
          if (aa.agent_type === 'city_franchisee' && aa.parent_agent_id) {
            provinceAgentIds.add(aa.parent_agent_id)
            agentToParentMap.set(aa.id, aa.parent_agent_id)
          }
        }

        const allAgentUserIds = agentApps.map(a => a.user_id)
        const { data: agentUsers } = await supabase
          .from('users')
          .select('id, username, full_name, phone, email')
          .in('id', allAgentUserIds)

        const agentUserMap = new Map<string, any>()
        if (agentUsers) {
          for (const au of agentUsers) {
            agentUserMap.set(au.id, au)
          }
        }

        for (const aa of agentApps) {
          agentMap.set(aa.id, {
            agent_type: aa.agent_type,
            region: aa.region,
            city: aa.city,
            agent_code: aa.agent_code,
            parent_agent_id: aa.parent_agent_id,
            full_name: aa.full_name || '',
            user: agentUserMap.get(aa.user_id) || null,
          })
        }
      }
    }

    // 5. 查询省级代理（市级代理的上级）
    const provinceAgentMap = new Map<string, any>()
    if (provinceAgentIds.size > 0) {
      const paIdList = Array.from(provinceAgentIds)
      const { data: provApps } = await supabase
        .from('agent_applications')
        .select('id, user_id, agent_type, region, city, agent_code, full_name')
        .in('id', paIdList)
        .eq('status', 'approved')

      if (provApps) {
        const provUserIds = provApps.map(a => a.user_id)
        const { data: provUsers } = await supabase
          .from('users')
          .select('id, username, full_name, phone, email')
          .in('id', provUserIds)

        const provUserMap = new Map<string, any>()
        if (provUsers) {
          for (const pu of provUsers) {
            provUserMap.set(pu.id, pu)
          }
        }

        for (const pa of provApps) {
          provinceAgentMap.set(pa.id, {
            agent_type: pa.agent_type,
            region: pa.region,
            city: pa.city,
            agent_code: pa.agent_code,
            full_name: pa.full_name || '',
            user: provUserMap.get(pa.user_id) || null,
          })
        }
      }
    }

    // 6. 组装层级关系
    const bindings: any[] = []

    storeMap.forEach((store, storeId) => {
      const order = orders.find(o => (o as any).franchisee_stores?.id === storeId)
      const storeData = (order as any)?.franchisee_stores
      const franchiseeId = storeData?.owner_id
      const franchisee = franchiseeId ? franchiseeMap.get(franchiseeId) : null
      const agentAppId = franchiseeId ? franchiseeAgentMap.get(franchiseeId) : null
      const agent = agentAppId ? agentMap.get(agentAppId) : null

      // 判断上级代理类型：如果是市级，还需查省级
      let cityAgent = null
      let provinceAgent = null
      if (agent) {
        if (agent.agent_type === 'city_franchisee') {
          cityAgent = agent
          const paId = agentToParentMap.get(agentAppId!)
          provinceAgent = paId ? provinceAgentMap.get(paId) : null
        } else {
          // 直接是省级代理
          provinceAgent = agent
        }
      }

      bindings.push({
        store: {
          id: store.id,
          name: store.name,
          city: store.city,
          address: store.address,
          store_code: store.store_code,
        },
        franchisee: franchisee ? {
          id: franchisee.id,
          username: franchisee.username,
          full_name: franchisee.full_name,
          phone: franchisee.phone,
          email: franchisee.email,
        } : null,
        city_agent: cityAgent ? {
          agent_type: cityAgent.agent_type,
          city: cityAgent.city,
          agent_code: cityAgent.agent_code,
          full_name: cityAgent.full_name || cityAgent.user?.full_name,
          username: cityAgent.user?.username,
        } : null,
        agent: provinceAgent ? {
          agent_type: provinceAgent.agent_type,
          region: provinceAgent.region,
          city: provinceAgent.city,
          agent_code: provinceAgent.agent_code,
          full_name: provinceAgent.full_name || provinceAgent.user?.full_name,
          username: provinceAgent.user?.username,
        } : null,
      })
    })

    return ok({ bindings })
  } catch (e: any) {
    console.error('Store hierarchy error:', e)
    return serverError()
  }
}
