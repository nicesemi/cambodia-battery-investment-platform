import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

function parseUnitPrice(val: any): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export async function PUT(request: Request, { params }: { params: { typeId: string } }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { name, voltage, capacity, chemistry, description, is_active, sort_order, image_url, scenario, dimensions, net_weight, power_kwh, unit_price, monthly_rent } = body

    // 多语言字段：优先使用 i18n JSON，向后兼容旧字段
    const nameI18n = body.name_i18n !== undefined ? body.name_i18n : undefined
    const descriptionI18n = body.description_i18n !== undefined ? body.description_i18n : undefined
    const scenarioI18n = body.scenario_i18n !== undefined ? body.scenario_i18n : undefined

    // 构建 update payload
    const updatePayload: any = {
      voltage: voltage || null,
      capacity: capacity || null,
      chemistry: chemistry || null,
      image_url: image_url !== undefined ? image_url : undefined,
      dimensions: dimensions !== undefined ? dimensions : undefined,
      net_weight: net_weight !== undefined ? net_weight : undefined,
      power_kwh: power_kwh !== undefined ? power_kwh : undefined,
      unit_price: unit_price !== undefined ? unit_price : undefined,
      monthly_rent: monthly_rent !== undefined ? (monthly_rent !== '' ? parseFloat(monthly_rent) : null) : undefined,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0
    }

    // 处理 name: 优先 i18n
    if (nameI18n !== undefined) {
      updatePayload.name_i18n = nameI18n
      updatePayload.name = nameI18n['zh-CN'] || name || ''
    } else if (name !== undefined) {
      updatePayload.name = name.trim()
      if (!updatePayload.name) return badRequest('电池类型名称不能为空')
    }

    // 处理 description
    if (descriptionI18n !== undefined) {
      updatePayload.description_i18n = descriptionI18n
      updatePayload.description = descriptionI18n['zh-CN'] || description || null
    } else if (description !== undefined) {
      updatePayload.description = description || null
    }

    // 处理 scenario
    if (scenarioI18n !== undefined) {
      updatePayload.scenario_i18n = scenarioI18n
      updatePayload.scenario = scenarioI18n['zh-CN'] || scenario || null
    } else if (scenario !== undefined) {
      updatePayload.scenario = scenario || null
    }

    const { data: type, error } = await supabase.from('battery_types')
      .update(updatePayload)
      .eq('id', params.typeId)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return badRequest('电池类型名称已存在')
      return serverError(error.message)
    }
    if (!type) return notFound('电池类型不存在')

    // 级联更新：当电池类型的单价/月租金变动时，同步更新所有引用该类型的电池资产
    const priceChanged = unit_price !== undefined || monthly_rent !== undefined
    if (priceChanged) {
      const assetUpdates: any = {}
      if (unit_price !== undefined) assetUpdates.unit_price_rmb = parseFloat(String(unit_price)) * 7.25
      if (monthly_rent !== undefined) assetUpdates.monthly_rent = monthly_rent !== '' ? parseFloat(monthly_rent) : null

      // 计算年化收益率：月租金 × 12 × 70% / 单价 × 100
      const effectivePrice = unit_price !== undefined ? parseFloat(String(unit_price)) : parseFloat(String(type.unit_price || 0))
      const effectiveRent = monthly_rent !== undefined && monthly_rent !== '' ? parseFloat(monthly_rent) : (type.monthly_rent || 0)
      if (effectivePrice > 0 && effectiveRent > 0) {
        assetUpdates.expected_roi = parseFloat(((effectiveRent * 12 * 0.7) / effectivePrice * 100).toFixed(2))
      }

      const { error: cascadeError } = await supabase
        .from('battery_assets')
        .update(assetUpdates)
        .eq('battery_type_id', params.typeId)

      if (cascadeError) {
        console.error('级联更新电池资产价格失败:', cascadeError.message)
      }
    }

    const unitPriceNum = parseUnitPrice(type.unit_price)
    const annualized_return = (type.monthly_rent != null && unitPriceNum != null && unitPriceNum !== 0)
      ? parseFloat(((parseFloat(String(type.monthly_rent)) * 12 * 0.7) / unitPriceNum * 100).toFixed(2))
      : null

    return ok({ message: '电池类型已更新', battery_type: { ...type, annualized_return } })
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
