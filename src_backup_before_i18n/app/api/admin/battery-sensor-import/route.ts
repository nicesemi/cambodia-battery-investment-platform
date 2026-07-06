import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/battery-sensor-import
 * 批量更新电池单元的传感器数据
 * Body: { asset_id, units: [{ unit_code, sensor_battery_level, sensor_temperature, sensor_cycle_count, sensor_last_online, sensor_health_status }] }
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin' && user.role !== 'operator') return unauthorized('Admin only')

    const body = await request.json()
    const { asset_id, units } = body

    if (!asset_id) return badRequest('缺少 asset_id')
    if (!Array.isArray(units) || units.length === 0) return badRequest('units 必须为非空数组')

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const unit of units) {
      if (!unit.unit_code) {
        failCount++
        errors.push('缺少 unit_code')
        continue
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (unit.sensor_battery_level !== undefined) updates.sensor_battery_level = parseFloat(unit.sensor_battery_level)
      if (unit.sensor_temperature !== undefined) updates.sensor_temperature = parseFloat(unit.sensor_temperature)
      if (unit.sensor_cycle_count !== undefined) updates.sensor_cycle_count = parseInt(unit.sensor_cycle_count)
      if (unit.sensor_last_online !== undefined) updates.sensor_last_online = unit.sensor_last_online
      if (unit.sensor_health_status !== undefined) {
        const status = unit.sensor_health_status
        if (['normal', 'warning', 'critical'].includes(status)) {
          updates.sensor_health_status = status
        }
      }
      if (unit.sensor_longitude !== undefined) updates.sensor_longitude = parseFloat(unit.sensor_longitude)
      if (unit.sensor_latitude !== undefined) updates.sensor_latitude = parseFloat(unit.sensor_latitude)

      const { error } = await supabase
        .from('battery_units')
        .update(updates)
        .eq('unit_code', unit.unit_code)
        .eq('battery_asset_id', asset_id)

      if (error) {
        failCount++
        errors.push(`${unit.unit_code}: ${error.message}`)
      } else {
        successCount++
      }
    }

    return ok({
      message: `传感器数据导入完成：成功 ${successCount}，失败 ${failCount}`,
      success_count: successCount,
      fail_count: failCount,
      errors: errors.slice(0, 10),
    })
  } catch (e: any) {
    return serverError(e.message)
  }
}
