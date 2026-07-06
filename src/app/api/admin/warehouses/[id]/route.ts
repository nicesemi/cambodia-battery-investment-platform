import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/warehouses/[id] — 更新仓库
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const { id } = params
    const body = await request.json()
    const { warehouse_code, name, address, manager_id, name_i18n, address_i18n } = body

    if (!name) {
      return badRequest('仓库名称为必填项')
    }

    const updateData: Record<string, any> = {
      name,
      address: address || null,
      name_i18n: name_i18n || null,
      address_i18n: address_i18n || null,
    }
    // manager_id 有效时才加入 update，避免空串/null 触发 FK 约束
    const cleanManagerId = manager_id && String(manager_id).trim() ? manager_id : null
    if (cleanManagerId) {
      updateData.manager_id = cleanManagerId
    }
    if (warehouse_code !== undefined) {
      updateData.warehouse_code = warehouse_code
    }

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('warehouses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return badRequest('仓库编码已存在')
      return serverError(error.message)
    }
    if (!data) return notFound('仓库不存在')

    return ok(data)
  } catch (e: any) {
    return serverError()
  }
}

/**
 * DELETE /api/admin/warehouses/[id] — 删除仓库
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const { id } = params

    const adminClient = getSupabaseAdmin()
    const { error } = await adminClient
      .from('warehouses')
      .delete()
      .eq('id', id)

    if (error) return serverError(error.message)

    return ok({ success: true })
  } catch (e: any) {
    return serverError()
  }
}
