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
        .select('id, asset_code, name, description, battery_type, battery_type_id, total_units, available_units, unit_price, unit_price_rmb, expected_roi, monthly_rent, location, station_id, status, created_at, updated_at, image_url, thumbnail_url')
        .order('created_at', { ascending: false }),
      admin.from('battery_types').select('id, image_url, monthly_rent').eq('is_active', true)
    ])
    if (error) return serverError(error.message)

    const imageMap: Record<string, string> = {}
    const rentMap: Record<string, number> = {}
    for (const t of (types || [])) {
      if (t.id && t.image_url) imageMap[t.id] = t.image_url
      if (t.id && t.monthly_rent != null) rentMap[t.id] = t.monthly_rent
    }

    const formatted = (assets || []).map((a: any) => ({
      ...a,
      thumbnail_url: a.thumbnail_url || imageMap[a.battery_type_id] || null,
      monthly_rent: a.monthly_rent ?? rentMap[a.battery_type_id] ?? null,
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
    const { asset_code, name, description, battery_type, battery_type_id, total_units, unit_price, unit_price_rmb, monthly_rent, location, station_id } = body

    // 必填项：unit_price_rmb（RMB单价）或 unit_price（USD单价），二选一
    const rmbPrice = unit_price_rmb !== undefined && unit_price_rmb !== '' ? parseFloat(unit_price_rmb) : null
    const usdPrice = unit_price !== undefined && unit_price !== '' ? parseFloat(unit_price) : null
    const monthlyRentVal = monthly_rent !== undefined && monthly_rent !== '' ? parseInt(monthly_rent) : null

    if (!asset_code || !name || !total_units || (!rmbPrice && !usdPrice)) {
      return badRequest('Missing required fields: asset_code, name, total_units, unit_price_rmb/unit_price')
    }

    // 计算 USD 单价
    let finalUnitPrice: number
    let finalRmbPrice: number | null = null

    if (rmbPrice) {
      // 从系统配置获取汇率
      const { data: rateConfig } = await supabase.from('system_configs')
        .select('config_value').eq('config_key', 'exchange_rate_usd_cny').single()
      const rate = rateConfig ? parseFloat(rateConfig.config_value) : 7.25
      finalUnitPrice = parseFloat((rmbPrice / rate).toFixed(2))
      finalRmbPrice = rmbPrice
    } else {
      finalUnitPrice = usdPrice!
    }

    // 自动计算年化：(月租×70%×12)/出厂单价×100%，保留2位小数
    let calcRoi: number | null = null
    if (monthlyRentVal && finalRmbPrice && finalRmbPrice > 0) {
      calcRoi = parseFloat(((monthlyRentVal * 0.7 * 12) / finalRmbPrice * 100).toFixed(2))
    }

    const insertData: any = {
      asset_code, name, description, battery_type: battery_type || '72V50Ah',
      total_units, available_units: total_units,
      unit_price: finalUnitPrice,
      unit_price_rmb: finalRmbPrice,
      expected_roi: calcRoi,
      location, station_id, status: 'active'
    }
    if (battery_type_id) insertData.battery_type_id = battery_type_id
    if (monthly_rent !== undefined && monthly_rent !== '') insertData.monthly_rent = parseInt(monthly_rent)

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
