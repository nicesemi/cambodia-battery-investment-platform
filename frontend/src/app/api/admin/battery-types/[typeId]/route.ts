import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: { typeId: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { name, voltage, capacity, chemistry, description, is_active, sort_order, image_url, scenario, dimensions, net_weight, power_kwh, unit_price } = body
    if (!name) return badRequest('电池类型名称不能为空')

    const { data: type, error } = await supabase.from('battery_types')
      .update({
        name: name.trim(),
        voltage: voltage || null,
        capacity: capacity || null,
        chemistry: chemistry || null,
        description: description || null,
        image_url: image_url !== undefined ? image_url : undefined,
        scenario: scenario !== undefined ? scenario : undefined,
        dimensions: dimensions !== undefined ? dimensions : undefined,
        net_weight: net_weight !== undefined ? net_weight : undefined,
        power_kwh: power_kwh !== undefined ? power_kwh : undefined,
        unit_price: unit_price !== undefined ? unit_price : undefined,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0
      })
      .eq('id', params.typeId)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return badRequest('电池类型名称已存在')
      return serverError(error.message)
    }
    if (!type) return notFound('电池类型不存在')

    return ok({ message: '电池类型已更新', battery_type: type })
  } catch (e: any) {
    return serverError()
  }
}

export async function DELETE(request: Request, { params }: { params: { typeId: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: type, error } = await supabase.from('battery_types')
      .delete()
      .eq('id', params.typeId)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!type) return notFound('电池类型不存在')

    return ok({ message: '电池类型已删除', battery_type: type })
  } catch (e: any) {
    return serverError()
  }
}
