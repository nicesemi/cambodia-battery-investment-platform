import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase.from('investor_orders')
      .select('*, asset:asset_id(id, name, asset_code, battery_type, location, unit_price, expected_roi), store:store_id(id, name, city)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (user.role !== 'admin' && user.role !== 'operator') {
      query = query.eq('user_id', user.id)
    }

    const { data: orders, count, error } = await query
    if (error) return serverError(error.message)

    return ok({ orders: orders || [], total: count || 0, page, limit })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'investor' && user.role !== 'admin') return unauthorized('Investor only')

    const body = await request.json()
    const { asset_id, units, store_id } = body

    if (!asset_id || !units) return badRequest('asset_id and units required')

    const adminClient = getSupabaseAdmin()

    // Get asset with stock info
    const { data: asset } = await adminClient.from('battery_assets')
      .select('unit_price, available_units, stock, name, asset_code').eq('id', asset_id).single()

    if (!asset) return badRequest('Asset not found')
    if (asset.available_units < units) return badRequest('Insufficient available units')

    const total = Number(asset.unit_price) * units

    // Check wallet balance
    const { data: wallet } = await adminClient.from('user_wallets').select('balance').eq('user_id', user.id).single()
    if (!wallet || Number(wallet.balance) < total) return badRequest('Insufficient balance')

    // Deduct balance
    const { error: deductErr } = await adminClient.from('user_wallets')
      .update({ balance: Number(wallet.balance) - total }).eq('user_id', user.id)
    if (deductErr) return serverError(deductErr.message)

    // Update asset available_units and stock
    await adminClient.from('battery_assets').update({
      available_units: asset.available_units - units,
      stock: (asset.stock ?? asset.available_units) - units
    }).eq('id', asset_id)

    // Upsert user_assets
    const { data: existing } = await adminClient.from('user_assets')
      .select('id, units, average_cost').eq('user_id', user.id).eq('asset_id', asset_id).single()
    if (existing) {
      const newUnits = existing.units + units
      const newAvgCost = (Number(existing.units) * Number(existing.average_cost) + total) / newUnits
      await adminClient.from('user_assets').update({ units: newUnits, average_cost: newAvgCost }).eq('id', existing.id)
    } else {
      await adminClient.from('user_assets').insert({
        user_id: user.id, asset_id, units, average_cost: asset.unit_price
      })
    }

    // Update user total_investment
    const { data: curUser } = await adminClient.from('users').select('total_investment').eq('id', user.id).single()
    const newTotal = Number(curUser?.total_investment || 0) + total
    await adminClient.from('users').update({ total_investment: newTotal }).eq('id', user.id)

    // Record transaction
    await adminClient.from('transactions').insert({
      tx_no: `TX${Date.now()}`, user_id: user.id, type: 'trade', amount: total, status: 'completed'
    })

    // Assign battery_units: find available units and assign to investor
    const { data: availableUnits } = await adminClient.from('battery_units')
      .select('id, unit_code').eq('battery_asset_id', asset_id).eq('status', 'available')
      .order('unit_code', { ascending: true }).limit(units)

    if (availableUnits && availableUnits.length > 0) {
      const unitIds = availableUnits.map((u: any) => u.id)
      // Mark units as sold
      await adminClient.from('battery_units')
        .update({ status: 'sold', investor_id: user.id })
        .in('id', unitIds)
      // Create investor_battery_units entries
      const ibuEntries = availableUnits.map((u: any) => ({
        investor_id: user.id,
        battery_unit_id: u.id,
        battery_asset_id: asset_id,
        purchase_price: asset.unit_price
      }))
      await adminClient.from('investor_battery_units').insert(ibuEntries)
    }

    // Create order
    const { data: order, error } = await adminClient.from('investor_orders').insert({
      user_id: user.id,
      asset_id,
      units,
      unit_price: asset.unit_price,
      total_amount: total,
      status: 'completed',
      store_id: store_id || null,
      order_source: store_id ? 'store' : 'online'
    }).select().single()

    if (error) return serverError(error.message)

    return ok({ order }, 201)
  } catch (e: any) {
    return serverError()
  }
}
