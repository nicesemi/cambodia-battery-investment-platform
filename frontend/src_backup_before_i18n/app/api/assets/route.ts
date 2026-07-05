import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    const [{ data: assets, error }, { data: types }] = await Promise.all([
      supabase.from('battery_assets')
        .select('id, asset_code, name, description, battery_type, battery_type_id, total_units, available_units, unit_price, unit_price_rmb, expected_roi, monthly_rent, thumbnail_url, location, status, created_at')
        .order('created_at', { ascending: false }),
      admin.from('battery_types').select('id, image_url, monthly_rent').eq('is_active', true)
    ])
    if (error) return serverError(error.message)

    // 构建 battery_type_id → image_url / monthly_rent 映射
    const imageMap: Record<string, string> = {}   // battery_types.image_url
    const rentMap: Record<string, number> = {}
    for (const t of (types || [])) {
      if (t.id && t.image_url) imageMap[t.id] = t.image_url
      if (t.id && t.monthly_rent != null) rentMap[t.id] = t.monthly_rent
    }

    const formatted = (assets || []).map((a: any) => ({
      ...a,
      // 图片：battery_types.image_url > battery_assets.thumbnail_url
      thumbnail_url: imageMap[a.battery_type_id] || a.thumbnail_url || null,
      // 月租：battery_types.monthly_rent > battery_assets.monthly_rent
      monthly_rent: rentMap[a.battery_type_id] ?? a.monthly_rent ?? null,
      annualized_return: a.expected_roi ?? null
    }))
    return ok({ assets: formatted })
  } catch (e: any) {
    return serverError()
  }
}
