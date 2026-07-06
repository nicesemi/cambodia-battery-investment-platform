import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const admin = getSupabaseAdmin()
    const [{ data: assets, error }, { data: types }] = await Promise.all([
      supabase.from('battery_assets')
        .select('id, asset_code, name, name_i18n, description, description_i18n, battery_type, total_units, available_units, unit_price, unit_price_rmb, expected_roi, location, station_id, warehouse_id, status, created_at, updated_at')
        .order('created_at', { ascending: false }),
      admin.from('battery_types').select('id, name, image_url, monthly_rent, unit_price').eq('is_active', true)
    ])
    if (error) return serverError(error.message)

    // 获取仓库名称，用于仓库地址列展示
    const warehouseIds = Array.from(new Set((assets || []).map(a => a.warehouse_id).filter(Boolean) as string[]))
    let warehouseNameMap: Record<string, string> = {}
    if (warehouseIds.length > 0) {
      const { data: warehouses } = await admin.from('warehouses')
        .select('id, name')
        .in('id', warehouseIds)
      for (const w of (warehouses || [])) {
        if (w.id && w.name) warehouseNameMap[w.id] = w.name
      }
    }

    const imageMap: Record<string, string> = {}
    const rentMap: Record<string, number> = {}
    const priceMap: Record<string, number> = {}
    const roiMap: Record<string, number> = {}
    for (const t of (types || [])) {
      if (t.name && t.image_url) imageMap[t.name] = t.image_url
      if (t.name && t.monthly_rent != null) rentMap[t.name] = t.monthly_rent
      if (t.name && t.unit_price != null) priceMap[t.name] = t.unit_price
      if (t.name && t.monthly_rent != null && t.unit_price != null && t.unit_price !== 0) {
        roiMap[t.name] = parseFloat(((t.monthly_rent * 12 * 0.7) / t.unit_price * 100).toFixed(2))
      }
    }

    const formatted = (assets || []).map((a: any) => ({
      ...a,
      warehouse_name: a.warehouse_id ? (warehouseNameMap[a.warehouse_id] || null) : null,
      thumbnail_url: a.thumbnail_url || imageMap[a.battery_type] || null,
      monthly_rent: a.monthly_rent ?? rentMap[a.battery_type] ?? null,
      battery_type_unit_price: priceMap[a.battery_type] ?? null,
      battery_type_monthly_rent: rentMap[a.battery_type] ?? null,
      battery_type_annualized_return: roiMap[a.battery_type] ?? null,
      sold_units: a.total_units - a.available_units
    }))
    return ok({ assets: formatted })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { asset_code, name, name_i18n, description, description_i18n, battery_type, total_units, unit_price, unit_price_rmb, monthly_rent, location, station_id, warehouse_id } = body

    // 必填项：unit_price_rmb（RMB单价）或 unit_price（USD单价），二选一
    const rmbPrice = unit_price_rmb !== undefined && unit_price_rmb !== '' ? parseFloat(unit_price_rmb) : null
    const usdPrice = unit_price !== undefined && unit_price !== '' ? parseFloat(unit_price) : null

    // 单价：传入 > 默认
    const effectiveUsdPrice = usdPrice

    if (!asset_code || !name || !total_units || (!rmbPrice && !effectiveUsdPrice)) {
      return badRequest('Missing required fields: asset_code, name, total_units, unit_price_rmb/unit_price')
    }

    // 计算 USD 单价
    let finalUnitPrice: number
    let finalRmbPrice: number | null = null

    if (rmbPrice) {
      const { data: rateConfig } = await supabase.from('system_configs')
        .select('config_value').eq('config_key', 'exchange_rate_usd_cny').single()
      const rate = rateConfig ? parseFloat(rateConfig.config_value) : 7.25
      finalUnitPrice = parseFloat((rmbPrice / rate).toFixed(2))
      finalRmbPrice = rmbPrice
    } else {
      finalUnitPrice = effectiveUsdPrice!
    }

    const insertData: any = {
      asset_code, name, name_i18n, description, description_i18n, battery_type: battery_type || '72V50Ah',
      total_units, available_units: total_units,
      unit_price: finalUnitPrice,
      unit_price_rmb: finalRmbPrice,
      expected_roi: 0,
      location, station_id, warehouse_id: warehouse_id || null, status: 'active'
    }

    const { data: asset, error } = await supabase.from('battery_assets').insert(insertData).select('*').single()

    if (error) {
      if (error.code === '23505') return badRequest('Asset code already exists')
      return serverError(error.message)
    }

    return ok({ message: 'Asset created', asset }, 201)
  } catch (e: any) {
    return serverError()
  }
}
