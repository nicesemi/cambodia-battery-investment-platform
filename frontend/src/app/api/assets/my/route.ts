import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // 使用 adminClient 查询 user_assets，避免 RLS 策略导致的静默缺失
    const adminClient = getSupabaseAdmin()
    const { data: userAssets, error } = await adminClient.from('user_assets')
      .select('id, units, average_cost, total_dividends_received, asset_id, battery_assets!inner(id, asset_code, name, name_i18n, unit_price, expected_roi, location, battery_type, total_units, available_units, stock)')
      .eq('user_id', user.id)
    if (error) return serverError(error.message)

    // Fetch battery units for this user
    const { data: myUnits } = await adminClient.from('investor_battery_units')
      .select('battery_asset_id, battery_unit_id, purchase_price, purchased_at, battery_units!inner(id, unit_code, site_id, site_name, status, sensor_battery_level, sensor_temperature, sensor_cycle_count, sensor_last_online, sensor_health_status, sensor_longitude, sensor_latitude)')
      .eq('investor_id', user.id)

    // Group units by asset_id
    const unitsByAsset: Record<string, any[]> = {}
    if (myUnits) {
      for (const ibu of myUnits) {
        const aid = ibu.battery_asset_id
        if (!unitsByAsset[aid]) unitsByAsset[aid] = []
        const bu = (ibu.battery_units as any)?.[0] || ibu.battery_units
        unitsByAsset[aid].push({
          holding_id: ibu.battery_unit_id,
          unit_code: bu?.unit_code,
          site_id: bu?.site_id,
          site_name: bu?.site_name,
          status: bu?.status,
          sensor_battery_level: bu?.sensor_battery_level,
          sensor_temperature: bu?.sensor_temperature,
          sensor_cycle_count: bu?.sensor_cycle_count,
          sensor_last_online: bu?.sensor_last_online,
          sensor_health_status: bu?.sensor_health_status,
          sensor_longitude: bu?.sensor_longitude,
          sensor_latitude: bu?.sensor_latitude,
          purchase_price: ibu.purchase_price,
          purchased_at: ibu.purchased_at
        })
      }
    }

    // Fetch operation_sites name_i18n for battery_units
    const siteIds = [...new Set(
      (myUnits || []).map(ibu => (ibu.battery_units as any)?.[0]?.site_id || (ibu.battery_units as any)?.site_id).filter(Boolean)
    )]
    let siteI18nMap: Record<string, any> = {}
    let locationI18nMap: Record<string, any> = {}
    if (siteIds.length > 0) {
      const { data: sitesI18n } = await adminClient.from('operation_sites')
        .select('id, name_i18n, country, city, country_i18n, city_i18n')
        .in('id', siteIds)
      if (sitesI18n) {
        for (const s of sitesI18n) {
          siteI18nMap[s.id] = s.name_i18n
          // 构建 location_i18n
          const locKey = `${s.country}·${s.city}`
          if (!locationI18nMap[locKey] && s.country_i18n && s.city_i18n) {
            const locI18n: Record<string, string> = {}
            for (const lang of ['zh-CN', 'zh-TW', 'en', 'bn', 'km']) {
              const cn = (s.country_i18n as any)?.[lang] || (s.country_i18n as any)?.['zh-CN'] || ''
              const ci = (s.city_i18n as any)?.[lang] || (s.city_i18n as any)?.['zh-CN'] || ''
              if (cn || ci) locI18n[lang] = [cn, ci].filter(Boolean).join('·')
            }
            if (Object.keys(locI18n).length > 0) {
              locationI18nMap[locKey] = locI18n
              // 兼容 battery_assets.location 无分隔符的旧格式（如"柬埔寨金边"）
              locationI18nMap[`${s.country}${s.city}`] = locI18n
            }
          }
        }
      }
    }

    const formatted = userAssets.map((ua: any) => ({
      id: ua.id,
      units: ua.units,
      average_cost: ua.average_cost,
      total_invested: Number(ua.units || 0) * Number(ua.average_cost || ua.battery_assets?.unit_price || 0),
      total_dividends_received: ua.total_dividends_received || 0,
      asset_code: ua.battery_assets?.asset_code,
      name: ua.battery_assets?.name,
      name_i18n: ua.battery_assets?.name_i18n,
      unit_price: ua.battery_assets?.unit_price,
      expected_roi: ua.battery_assets?.expected_roi,
      location: ua.battery_assets?.location,
      location_i18n: locationI18nMap[ua.battery_assets?.location] || null,
      battery_type: ua.battery_assets?.battery_type,
      total_units: ua.battery_assets?.total_units,
      available_units: ua.battery_assets?.available_units,
      stock: ua.battery_assets?.stock,
      battery_units: (unitsByAsset[ua.asset_id] || []).map((bu: any) => ({
        ...bu,
        name_i18n: bu.site_id ? siteI18nMap[bu.site_id] || null : null
      }))
    }))
    return ok({ userAssets: formatted })
  } catch (e: any) {
    return serverError()
  }
}
