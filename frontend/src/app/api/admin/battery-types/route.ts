import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: types, error } = await supabase.from('battery_types')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) return serverError(error.message)
    return ok({ battery_types: types })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { name, voltage, capacity, chemistry, description, is_active, sort_order } = body
    if (!name) return badRequest('电池类型名称不能为空')

    const { image_url, scenario, dimensions, net_weight, power_kwh, unit_price, monthly_rent, annualized_return } = body

    const { data: type, error } = await supabase.from('battery_types').insert({
      name: name.trim(),
      voltage: voltage || null,
      capacity: capacity || null,
      chemistry: chemistry || null,
      description: description || null,
      image_url: image_url || null,
      scenario: scenario || null,
      dimensions: dimensions || null,
      net_weight: net_weight || null,
      power_kwh: power_kwh || null,
      unit_price: unit_price || null,
      monthly_rent: monthly_rent != null ? parseFloat(monthly_rent) : null,
      annualized_return: annualized_return != null ? parseFloat(annualized_return) : null,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0
    }).select('*').single()

    if (error) {
      if (error.code === '23505') return badRequest('电池类型名称已存在')
      return serverError(error.message)
    }

    return ok({ message: '电池类型已创建', battery_type: type }, 201)
  } catch (e: any) {
    return serverError()
  }
}
