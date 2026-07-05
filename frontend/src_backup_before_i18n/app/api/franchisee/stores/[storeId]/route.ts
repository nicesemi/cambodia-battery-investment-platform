import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { storeId } = await params
    const adminClient = getSupabaseAdmin()

    const { data: store, error } = await supabase
      .from('franchisee_stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error || !store) return notFound('Store not found')

    // 权限检查：自营门店 or 代理下辖门店
    let hasAccess = false
    if (store.owner_id === user.id) {
      hasAccess = true
    } else if (user.role === 'franchisee') {
      // 检查是否为代理身份，可查看下辖门店
      const { data: agentApps } = await adminClient
        .from('agent_applications')
        .select('id, agent_type')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (agentApps && agentApps.length > 0) {
        const agentId = agentApps[0].id
        const agentType = agentApps[0].agent_type

        if (agentType === 'city_franchisee') {
          const { data: subApps } = await adminClient
            .from('franchisee_applications')
            .select('user_id')
            .eq('parent_agent_id', agentId)
            .eq('status', 'approved')
          if (subApps && subApps.some(a => a.user_id === store.owner_id)) hasAccess = true
        } else if (agentType === 'province_agent') {
          const { data: cityAgents } = await adminClient
            .from('agent_applications')
            .select('id, user_id')
            .eq('parent_agent_id', agentId)
            .eq('status', 'approved')
          const cityAgentIds = (cityAgents || []).map(a => a.id)
          // 市级加盟商自己的门店
          if (cityAgents && cityAgents.some(a => a.user_id === store.owner_id)) {
            hasAccess = true
          }
          // 市级下辖的门店
          if (!hasAccess && cityAgentIds.length > 0) {
            const { data: subApps } = await adminClient
              .from('franchisee_applications')
              .select('user_id')
              .in('parent_agent_id', cityAgentIds)
              .eq('status', 'approved')
            if (subApps && subApps.some(a => a.user_id === store.owner_id)) hasAccess = true
          }
        }
      }
    }

    if (!hasAccess) {
      return unauthorized('Access denied')
    }

    // 查询绑定到该门店的投资者
    const { data: orders } = await supabase
      .from('investor_orders')
      .select(`
        user_id,
        created_at,
        users:user_id (id, email, username, full_name, phone, investor_code)
      `)
      .eq('store_id', storeId)
      .eq('order_source', 'staff_registration')
      .eq('status', 'completed')

    const seen = new Set()
    const boundInvestors: any[] = []
    const investorIds: string[] = []
    for (const o of (orders || [])) {
      const inv = (o as any).users
      if (inv && inv.id && !seen.has(inv.id)) {
        seen.add(inv.id)
        investorIds.push(inv.id)
        boundInvestors.push({
          ...inv,
          bound_at: (o as any).created_at,
        })
      }
    }

    // 统计每个投资者的电池数
    let totalBatteries = 0
    if (investorIds.length > 0) {
      const { data: units } = await adminClient
        .from('battery_units')
        .select('investor_id')
        .in('investor_id', investorIds)
        .eq('status', 'sold')

      const batteryCountByInvestor: Record<string, number> = {}
      for (const u of (units || [])) {
        batteryCountByInvestor[u.investor_id] = (batteryCountByInvestor[u.investor_id] || 0) + 1
      }

      for (const inv of boundInvestors) {
        inv.battery_count = batteryCountByInvestor[inv.id] || 0
      }
      totalBatteries = (units || []).length
    }

    return ok({
      ...store,
      total_batteries: totalBatteries,
      bound_investors: boundInvestors,
      bound_investor_count: boundInvestors.length,
      battery_count: totalBatteries,
    })
  } catch (e: any) {
    return serverError()
  }
}

// PUT /api/franchisee/stores/[storeId] — 编辑门店
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { storeId } = await params
    const body = await request.json()
    const { name, city, address, phone, photo_url, images } = body

    // 验证权限：门店 owner 或 admin/operator
    const { data: store } = await supabase
      .from('franchisee_stores')
      .select('owner_id')
      .eq('id', storeId)
      .single()

    if (!store) return notFound('门店不存在')
    if (user.role !== 'admin' && user.role !== 'operator' && store.owner_id !== user.id) {
      return unauthorized('无权编辑此门店')
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (city !== undefined) updateData.city = city
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (photo_url !== undefined) updateData.photo_url = photo_url
    if (images !== undefined) updateData.images = images

    const { data: updated, error } = await supabase
      .from('franchisee_stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single()

    if (error) return serverError(error.message)

    return ok({ store: updated })
  } catch (e: any) {
    return serverError()
  }
}
