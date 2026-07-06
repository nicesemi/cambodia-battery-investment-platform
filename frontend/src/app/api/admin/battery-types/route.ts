import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

function parseUnitPrice(val: any): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: types, error } = await supabase.from('battery_types')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) return serverError(error.message)

    const typesWithReturn = (types || []).map((t: any) => {
      const unitPriceNum = parseUnitPrice(t.unit_price)
      const annualized_return = (t.monthly_rent != null && unitPriceNum != null && unitPriceNum !== 0)
        ? parseFloat(((parseFloat(String(t.monthly_rent)) * 12 * 0.7) / unitPriceNum * 100).toFixed(2))
        : null
      return { ...t, annualized_return }
    })

    return ok({ battery_types: typesWithReturn })
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
    // 多语言字段：优先使用 i18n JSON，向后兼容旧 name/description/scenario 字段
    const nameI18n = body.name_i18n || (typeof name === 'string' && name.trim() ? { 'zh-CN': name.trim() } : null)
    const descriptionI18n = body.description_i18n || (typeof description === 'string' && description.trim() ? { 'zh-CN': description } : null)

    // 验证：至少需要 name 或 name_i18n
    if (!nameI18n && !name) return badRequest('电池类型名称不能为空')

    const { image_url, scenario, dimensions, net_weight, power_kwh, unit_price, monthly_rent } = body
    const scenarioI18n = body.scenario_i18n || (typeof scenario === 'string' && scenario.trim() ? { 'zh-CN': scenario } : null)

    const { data: type, error } = await supabase.from('battery_types').insert({
      name: nameI18n ? (nameI18n['zh-CN'] || name || '') : (name || '').trim(),
      name_i18n: nameI18n,
      voltage: voltage || null,
      capacity: capacity || null,
      chemistry: chemistry || null,
      description: descriptionI18n ? (descriptionI18n['zh-CN'] || description || '') : (description || null),
      description_i18n: descriptionI18n,
      image_url: image_url || null,
      scenario: scenarioI18n ? (scenarioI18n['zh-CN'] || scenario || '') : (scenario || null),
      scenario_i18n: scenarioI18n,
      dimensions: dimensions || null,
      net_weight: net_weight || null,
      power_kwh: power_kwh || null,
      unit_price: unit_price || null,
      monthly_rent: monthly_rent != null ? parseFloat(monthly_rent) : null,
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
