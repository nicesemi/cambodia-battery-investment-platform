import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { assetId } = await params
    if (!assetId || assetId === 'undefined') return badRequest('Invalid asset ID')

    const body = await request.json()
    const { name, description, battery_type, total_units, unit_price, unit_price_rmb, location, station_id, warehouse_id, status } = body

    const admin = getSupabaseAdmin()

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (battery_type !== undefined) updates.battery_type = battery_type

    // RMB 单价优先：若传了 unit_price_rmb，根据汇率换算 USD
    if (unit_price_rmb !== undefined && unit_price_rmb !== '') {
      const rmbPrice = parseFloat(unit_price_rmb)
      const { data: rateConfig, error: rateError } = await admin.from('system_configs')
        .select('config_value').eq('config_key', 'exchange_rate_usd_cny').single()
      const rate = (rateConfig && !rateError) ? parseFloat(rateConfig.config_value) : 7.25
      updates.unit_price = parseFloat((rmbPrice / rate).toFixed(2))
      updates.unit_price_rmb = rmbPrice
    } else if (unit_price !== undefined && unit_price !== '') {
      updates.unit_price = parseFloat(unit_price)
      updates.unit_price_rmb = null
    }

    if (location !== undefined) updates.location = location
    if (station_id !== undefined) updates.station_id = station_id
    if (warehouse_id !== undefined) updates.warehouse_id = warehouse_id || null
    if (status !== undefined) updates.status = status

    if (total_units !== undefined) {
      const { data: cur, error: curError } = await admin.from('battery_assets').select('total_units, available_units').eq('id', assetId).single()
      if (curError || !cur) return notFound(`Asset ${assetId} not found`)
      const diff = total_units - cur.total_units
      updates.total_units = total_units
      updates.available_units = Math.max(0, cur.available_units + diff)
    }

    if (Object.keys(updates).length === 0) return badRequest('No fields to update')

    const { data: asset, error } = await admin.from('battery_assets').update(updates).eq('id', assetId).select('*').single()
    if (error || !asset) return notFound(error ? `Asset update failed: ${error.message}` : `Asset ${assetId} not found`)

    return ok({ message: 'Asset updated', asset })
  } catch (e: any) {
    return serverError()
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { assetId } = await params
    const { data: asset, error } = await supabase.from('battery_assets')
      .update({ status: 'closed' }).eq('id', assetId).neq('status', 'closed').select('*').single()
    if (error || !asset) return notFound('Asset not found or already closed')

    return ok({ message: 'Asset closed (soft-deleted)', asset })
  } catch (e: any) {
    return serverError()
  }
}
