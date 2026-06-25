import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data: userAssets, error } = await supabase.from('user_assets')
      .select('id, units, average_cost, total_dividends_received, asset_id, battery_assets!inner(id, asset_code, name, unit_price, expected_roi, location, battery_type, total_units, available_units, stock)')
      .eq('user_id', user.id)
    if (error) return serverError(error.message)

    // Fetch battery units for this user
    const adminClient = getSupabaseAdmin()
    const { data: myUnits } = await adminClient.from('investor_battery_units')
      .select('battery_asset_id, battery_unit_id, purchase_price, purchased_at, battery_units!inner(id, unit_code, site_id, site_name, status, sensor_battery_level, sensor_temperature, sensor_cycle_count, sensor_last_online, sensor_health_status)')
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
          purchase_price: ibu.purchase_price,
          purchased_at: ibu.purchased_at
        })
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
      unit_price: ua.battery_assets?.unit_price,
      expected_roi: ua.battery_assets?.expected_roi,
      location: ua.battery_assets?.location,
      battery_type: ua.battery_assets?.battery_type,
      total_units: ua.battery_assets?.total_units,
      available_units: ua.battery_assets?.available_units,
      stock: ua.battery_assets?.stock,
      battery_units: unitsByAsset[ua.asset_id] || []
    }))
    return ok({ userAssets: formatted })
  } catch (e: any) {
    return serverError()
  }
}
