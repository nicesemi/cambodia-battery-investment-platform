import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken, requireVerified, requireKycNotRejected } from '@/lib/auth'
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
      .select('*, asset:asset_id(id, name, name_i18n, asset_code, battery_type, location, unit_price, expected_roi), store:store_id(id, name, city)', { count: 'exact' })
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
    const verifiedCheck = requireVerified(user)
    if (verifiedCheck) return verifiedCheck
    const kycCheck = requireKycNotRejected(user)
    if (kycCheck) return kycCheck

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
    if (!wallet || Number(wallet.balance) < total) return badRequest('余额不足，请先去我的钱包充值！')

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
    const { error: txError } = await adminClient.from('transactions').insert({
      tx_no: `TX${Date.now()}`, user_id: user.id, type: 'trade', amount: total, status: 'completed'
    })
    if (txError) console.error('Order transaction insert error:', txError)

    // Assign battery_units: 优先分配已部署到站点但未售的电池（运营中无主），再回退到仓库 available
    // Step 1: 查找已部署运营但 investor_id 为空的电池单元 (status='sold' + site_name IS NOT NULL + investor_id IS NULL)
    const { data: deployedOwnerless } = await adminClient.from('battery_units')
      .select('id, unit_code, site_name, status')
      .eq('battery_asset_id', asset_id)
      .eq('status', 'sold')
      .is('investor_id', null)
      .not('site_name', 'is', null)
      .order('unit_code', { ascending: true })
      .limit(units)

    // Step 2: 若已部署无主电池不足，从仓库 available 池补充
    let assignedUnits: any[] = []
    let remainingNeeded = units

    if (deployedOwnerless && deployedOwnerless.length > 0) {
      const takeCount = Math.min(deployedOwnerless.length, remainingNeeded)
      const taken = deployedOwnerless.slice(0, takeCount)
      assignedUnits.push(...taken)
      remainingNeeded -= takeCount

      // 更新这批已部署电池的 investor_id
      const takeIds = taken.map((u: any) => u.id)
      await adminClient.from('battery_units')
        .update({ investor_id: user.id })
        .in('id', takeIds)

      // 为这批电池创建 investor_battery_units 记录
      const ibuEntries = taken.map((u: any) => ({
        investor_id: user.id,
        battery_unit_id: u.id,
        battery_asset_id: asset_id,
        purchase_price: asset.unit_price,
      }))
      await adminClient.from('investor_battery_units').insert(ibuEntries)
    }

    // Step 3: 若仍需更多单元，从仓库 available 池中取
    if (remainingNeeded > 0) {
      const { data: availableUnits } = await adminClient.from('battery_units')
        .select('id, unit_code')
        .eq('battery_asset_id', asset_id)
        .eq('status', 'available')
        .order('unit_code', { ascending: true })
        .limit(remainingNeeded)

      if (availableUnits && availableUnits.length > 0) {
        assignedUnits.push(...availableUnits)
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
          purchase_price: asset.unit_price,
        }))
        await adminClient.from('investor_battery_units').insert(ibuEntries)
      }
    }

    // 验证：确保分配了足够数量的单元
    if (assignedUnits.length < units) {
      // 分配不足时回滚已做的 investor_id 更新（仅针对 deployedOwnerless 步骤）
      const alreadyAssignedIds = assignedUnits.map((u: any) => u.id)
      if (alreadyAssignedIds.length > 0) {
        await adminClient.from('battery_units')
          .update({ investor_id: null })
          .in('id', alreadyAssignedIds)
        await adminClient.from('investor_battery_units')
          .delete()
          .in('battery_unit_id', alreadyAssignedIds)
      }
      return badRequest(`库存不足：需要 ${units} 颗电池，当前仅有 ${assignedUnits.length} 颗可用`)
    }

    // Create order
    const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
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

    return ok({ order, order_id: orderId }, 201)
  } catch (e: any) {
    return serverError()
  }
}
