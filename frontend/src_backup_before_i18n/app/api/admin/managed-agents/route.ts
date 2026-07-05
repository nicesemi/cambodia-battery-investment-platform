import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/managed-agents — 获取已审批的代理列表
 * 支持 ?type=province_agent|city_franchisee 过滤
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const url = new URL(request.url)
    const type = url.searchParams.get('type')

    let query = supabase
      .from('agent_applications')
      .select('*, applicant:user_id(id, email, username, full_name, phone)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (type && ['province_agent', 'city_franchisee', 'store_owner'].includes(type)) {
      query = query.eq('agent_type', type)
    }

    const { data, error } = await query

    if (error) return serverError(error.message)

    // 为每个代理查询下属门店数，以及区县加盟商的上级市级加盟商信息
    const agentParentIds = (data || [])
      .filter((a: any) => a.agent_type === 'store_owner' && a.parent_agent_id)
      .map((a: any) => a.parent_agent_id)

    let parentAgentMap: Record<string, any> = {}
    if (agentParentIds.length > 0) {
      const { data: parentAgents } = await supabase
        .from('agent_applications')
        .select('id, region, city, full_name, user_id')
        .in('id', agentParentIds)
        .eq('agent_type', 'city_franchisee')
      if (parentAgents) {
        for (const pa of parentAgents) {
          parentAgentMap[pa.id] = pa
        }
      }
    }

    const enriched = await Promise.all((data || []).map(async (agent) => {
      const { count, error: countErr } = await supabase
        .from('franchisee_stores')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', agent.user_id)
      const parent = parentAgentMap[agent.parent_agent_id]
      return {
        ...agent,
        store_count: countErr ? 0 : (count || 0),
        parent_region: parent?.region || null,
        parent_city: parent?.city || null,
        parent_name: parent?.full_name || null,
      }
    }))

    return ok({ agents: enriched })
  } catch (e: any) {
    return serverError()
  }
}

/**
 * PUT /api/admin/managed-agents — 更新已审批代理信息
 * body: { id, commission, revenue_share, agent_region, ... }
 */
export async function PUT(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return badRequest('Agent ID required')

    // 只允许更新特定字段
    const allowed = ['commission', 'revenue_share', 'region', 'city', 'review_note']
    const payload: Record<string, any> = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) payload[key] = updates[key]
    }
    if (Object.keys(payload).length === 0) return badRequest('No valid fields to update')

    const { data, error } = await supabase
      .from('agent_applications')
      .update(payload)
      .eq('id', id)
      .eq('status', 'approved')
      .select().single()

    if (error) {
      // 如果报错缺少 commission 列，说明迁移未执行
      if (error.message && error.message.includes('commission')) {
        return serverError('数据库缺少 commission 列，请先执行迁移：supabase/migrations/20260625000007_add_agent_commission.sql')
      }
      return serverError(error.message)
    }
    if (!data) return notFound('Agent not found or not approved')

    return ok({ agent: data })
  } catch (e: any) {
    return serverError()
  }
}

/**
 * DELETE /api/admin/managed-agents — 撤销已审批代理
 * query: ?id=xxx
 */
export async function DELETE(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return badRequest('Agent ID required')

    // 软删除：将状态改为 revoked
    const { data, error } = await supabase
      .from('agent_applications')
      .update({ status: 'revoked', reviewed_by: user.id, review_note: '管理员撤销' })
      .eq('id', id)
      .eq('status', 'approved')
      .select().single()

    if (error) return serverError(error.message)
    if (!data) return notFound('Agent not found or not approved')

    return ok({ agent: data })
  } catch (e: any) {
    return serverError()
  }
}
