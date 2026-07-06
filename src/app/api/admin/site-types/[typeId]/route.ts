import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: { typeId: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { name, name_i18n } = body

    const updatePayload: any = {}
    if (name !== undefined) {
      updatePayload.name = name.trim()
      if (!updatePayload.name) return badRequest('站点类型标识不能为空')
    }
    if (name_i18n !== undefined) {
      updatePayload.name_i18n = name_i18n
    }

    const { data: siteType, error } = await supabase.from('site_types')
      .update(updatePayload)
      .eq('id', params.typeId)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return badRequest('站点类型标识已存在')
      return serverError(error.message)
    }
    if (!siteType) return notFound('站点类型不存在')

    return ok({ message: '站点类型已更新', site_type: siteType })
  } catch (e: any) {
    return serverError()
  }
}

export async function DELETE(request: Request, { params }: { params: { typeId: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: siteType, error } = await supabase.from('site_types')
      .delete()
      .eq('id', params.typeId)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!siteType) return notFound('站点类型不存在')

    return ok({ message: '站点类型已删除', site_type: siteType })
  } catch (e: any) {
    return serverError()
  }
}
