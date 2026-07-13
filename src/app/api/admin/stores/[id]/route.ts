import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

// PUT /api/admin/stores/[id] — 编辑门店信息
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { name, city, address, phone, owner_id, total_batteries, revenue_share } = body

    if (!name || !name.trim())
      return badRequest('Store name is required')

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      city: city || null,
      address: address || null,
      phone: phone || null,
    }
    if (owner_id !== undefined) updateData.owner_id = owner_id
    if (total_batteries !== undefined) updateData.total_batteries = parseInt(total_batteries)
    if (revenue_share !== undefined) updateData.revenue_share = parseFloat(revenue_share)

    const { data: store, error } = await supabase
      .from('franchisee_stores')
      .update(updateData)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!store) return notFound('门店不存在')

    // Fetch owner
    if ((store as any).owner_id) {
      const { data: owner } = await getSupabaseAdmin()
        .from('users')
        .select('id, email, username, full_name')
        .eq('id', (store as any).owner_id)
        .single()
      ;(store as any).owner = owner || null
    }

    return ok({ store })
  } catch (e: any) {
    return serverError()
  }
}

// DELETE /api/admin/stores/[id] — 停业（软删除：status = 'closed'）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateToken(request)
    if (!user || user.role !== 'admin')
      return unauthorized('Admin only')

    const { data: store, error } = await supabase
      .from('franchisee_stores')
      .update({ status: 'closed' })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!store) return notFound('门店不存在')

    // Fetch owner
    if ((store as any).owner_id) {
      const { data: owner } = await getSupabaseAdmin()
        .from('users')
        .select('id, email, username, full_name')
        .eq('id', (store as any).owner_id)
        .single()
      ;(store as any).owner = owner || null
    }

    return ok({ message: '门店已停业', store })
  } catch (e: any) {
    return serverError()
  }
}

// PATCH /api/admin/stores/[id] — 状态切换
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'suspended', 'closed'].includes(status))
      return badRequest('无效状态值，仅支持 active / suspended / closed')

    const { data: store, error } = await supabase
      .from('franchisee_stores')
      .update({ status })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!store) return notFound('门店不存在')

    // Fetch owner
    if ((store as any).owner_id) {
      const { data: owner } = await getSupabaseAdmin()
        .from('users')
        .select('id, email, username, full_name')
        .eq('id', (store as any).owner_id)
        .single()
      ;(store as any).owner = owner || null
    }

    return ok({ message: '门店状态已更新', store })
  } catch (e: any) {
    return serverError()
  }
}
