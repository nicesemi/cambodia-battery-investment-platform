import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, forbidden } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/review
 * 省级代理：查看本省市级加盟商申请 + 本省开店申请
 * 市级加盟商：查看本市开店申请
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // 查找当前用户的已审批代理身份
    const { data: agentApps, error: agentErr } = await supabase
      .from('agent_applications')
      .select('id, agent_type, region, city')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (agentErr) return serverError(agentErr.message)
    if (!agentApps || agentApps.length === 0) {
      return forbidden('您不是已审批的代理商')
    }

    // 取第一个已审批的代理身份
    const agent = agentApps[0]

    let agentApplications: any[] = []
    let storeApplications: any[] = []

    if (agent.agent_type === 'province_agent') {
      // 省级代理：查看本省内市级加盟商申请（通过 parent_agent_id 精确匹配）
      const { data: cityApps } = await supabase
        .from('agent_applications')
        .select('*, applicant:user_id(id, email, username, full_name, phone)')
        .eq('agent_type', 'city_franchisee')
        .eq('parent_agent_id', agent.id)
        .order('created_at', { ascending: false })
      agentApplications = cityApps || []

      // 省级代理：查看本省内的开店申请（parent_agent_id = 该省级代理ID）
      const { data: storeApps } = await supabase
        .from('franchisee_applications')
        .select('*, applicant:user_id(id, email, username, full_name, phone)')
        .eq('parent_agent_id', agent.id)
        .order('created_at', { ascending: false })
      storeApplications = storeApps || []
    } else if (agent.agent_type === 'city_franchisee') {
      // 市级加盟商：查看本市开店申请（parent_agent_id = 该市级加盟商ID）
      const { data: storeApps } = await supabase
        .from('franchisee_applications')
        .select('*, applicant:user_id(id, email, username, full_name, phone)')
        .eq('parent_agent_id', agent.id)
        .order('created_at', { ascending: false })
      storeApplications = storeApps || []
    }

    return ok({
      agent_type: agent.agent_type,
      region: agent.city || agent.region,
      agent_id: agent.id,
      agent_applications: agentApplications,
      store_applications: storeApplications,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (e: any) {
    return serverError()
  }
}

/**
 * PATCH /api/agent/review?id=XXX
 * 审批 agent_applications 或 franchisee_applications（根据传参区分）
 * body: { type: 'agent'|'store', status: 'approved'|'rejected', review_note?: string }
 */
export async function PATCH(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return badRequest('Application ID required')

    const body = await request.json()
    const { type, status, review_note } = body

    if (!type || !['agent', 'store'].includes(type)) {
      return badRequest('type must be agent or store')
    }
    if (!status || !['approved', 'rejected'].includes(status)) {
      return badRequest('Status must be approved or rejected')
    }

    // 查找当前用户的已审批代理身份
    const { data: agentApps, error: agentErr } = await supabase
      .from('agent_applications')
      .select('id, agent_type, region, city')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (agentErr) return serverError(agentErr.message)
    if (!agentApps || agentApps.length === 0) {
      return forbidden('您不是已审批的代理商')
    }

    const agent = agentApps[0]

    if (type === 'agent') {
      // 审批代理申请（仅省级代理可审批市级加盟商申请）
      if (agent.agent_type !== 'province_agent') {
        return forbidden('仅省级代理可审批市级加盟商申请')
      }

      // 验证该申请属于本省
      const { data: app, error: appErr } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('id', id)
        .single()

      if (appErr || !app) return serverError(appErr?.message || 'Application not found')
      if (app.agent_type !== 'city_franchisee') {
        return forbidden('只能审批市级加盟商申请')
      }
      if (app.parent_agent_id !== agent.id) {
        return forbidden('只能审批属于您的申请')
      }

      const { data, error } = await supabase
        .from('agent_applications')
        .update({ status, reviewed_by: user.id, review_note: review_note || '' })
        .eq('id', id)
        .select().single()

      if (error) return serverError(error.message)
      return ok({ application: data })
    } else {
      // 审批开店申请（省级或市级代理）
      const { data: app, error: appErr } = await supabase
        .from('franchisee_applications')
        .select('*')
        .eq('id', id)
        .single()

      if (appErr || !app) return serverError(appErr?.message || 'Application not found')

      // 验证该开店申请属于当前代理
      if (app.parent_agent_id !== agent.id) {
        return forbidden('只能审批属于您的开店申请')
      }

      const { data, error } = await supabase
        .from('franchisee_applications')
        .update({ status, reviewed_by: user.id, review_note: review_note || '' })
        .eq('id', id)
        .select().single()

      if (error) return serverError(error.message)

      // 审批通过后创建门店记录
      if (status === 'approved' && data) {
        const { error: storeError } = await supabase
          .from('franchisee_stores')
          .insert({
            owner_id: data.user_id,
            name: data.store_name,
            city: data.city,
            address: data.address || '',
            phone: data.phone || '',
            status: 'active',
          })
        if (storeError) console.error('Failed to create store:', storeError.message)
      }

      return ok({ application: data })
    }
  } catch (e: any) {
    return serverError()
  }
}
