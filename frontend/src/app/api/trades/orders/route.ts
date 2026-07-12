import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

function generateOrderNo(): string {
  return `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { assetId, orderType, price, units } = body
    if (!assetId || !orderType || !price || !units) return badRequest('assetId, orderType, price, units required')
    if (!['buy','sell'].includes(orderType)) return badRequest('orderType must be buy or sell')
    if (price <= 0 || units < 1) return badRequest('Invalid price or units')

    const orderNo = generateOrderNo()

    if (orderType === 'sell') {
      const { data: ua } = await supabase.from('user_assets')
        .select('units').eq('user_id', user.id).eq('asset_id', assetId).single()
      if (!ua || ua.units < units) return badRequest('Insufficient assets to sell')
      await supabase.from('user_assets').update({ units: ua.units - units }).eq('user_id', user.id).eq('asset_id', assetId)
    } else {
      const totalCost = price * units
      const { data: w } = await getSupabaseAdmin().from('user_wallets').select('balance').eq('user_id', user.id).single()
      if (!w || Number(w.balance) < totalCost) return badRequest('余额不足，请先去我的钱包充值！')
      await getSupabaseAdmin().from('user_wallets').update({ balance: Number(w.balance) - totalCost, frozen_balance: Number(w.balance) - totalCost }).eq('user_id', user.id)
    }

    const { data: order, error } = await supabase.from('trade_orders').insert({
      order_no: orderNo, user_id: user.id, asset_id: assetId, order_type: orderType, price, units
    }).select('*').single()
    if (error) return serverError(error.message)

    // Async match attempt
    setTimeout(() => matchOrders(assetId), 100)

    return ok({ message: 'Order created successfully', order }, 201)
  } catch (e: any) {
    console.error('Create order error:', e)
    return serverError()
  }
}

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase.from('trade_orders')
      .select('*, battery_assets!inner(name, name_i18n, asset_code)')
      .eq('user_id', user.id)
      .order('order_time', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: orders, error } = await query
    if (error) return serverError(error.message)

    const formatted = orders?.map((o: any) => ({ ...o, asset_name: o.battery_assets?.name, asset_name_i18n: o.battery_assets?.name_i18n, asset_code: o.battery_assets?.asset_code, battery_assets: undefined }))
    return ok({ orders: formatted })
  } catch (e: any) {
    return serverError()
  }
}

// Internal match engine (simplified for serverless)
async function matchOrders(assetId: string) {
  try {
    const { data: buyOrders } = await supabase.from('trade_orders')
      .select('*').eq('asset_id', assetId).eq('order_type', 'buy').in('status', ['pending','partial'])
      .order('price', { ascending: false }).order('order_time', { ascending: true })
    const { data: sellOrders } = await supabase.from('trade_orders')
      .select('*').eq('asset_id', assetId).eq('order_type', 'sell').in('status', ['pending','partial'])
      .order('price', { ascending: true }).order('order_time', { ascending: true })

    if (!buyOrders?.length || !sellOrders?.length) return

    for (const buy of buyOrders) {
      for (const sell of sellOrders) {
        if (buy.price >= sell.price && buy.status !== 'filled' && sell.status !== 'filled') {
          const matchPrice = sell.price
          const buyRem = buy.units - buy.filled_units
          const sellRem = sell.units - sell.filled_units
          const matched = Math.min(buyRem, sellRem)
          if (matched <= 0) continue

          const totalAmount = matchPrice * matched
          const fee = totalAmount * 0.005
          const tradeNo = `TRD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

          await supabase.from('trade_records').insert({
            trade_no: tradeNo, buy_order_id: buy.id, sell_order_id: sell.id,
            asset_id: assetId, buyer_id: buy.user_id, seller_id: sell.user_id,
            price: matchPrice, units: matched, total_amount: totalAmount, fee
          })

          // Update buy order
          const newBuyFilled = buy.filled_units + matched
          const buyStatus = newBuyFilled >= buy.units ? 'filled' : 'partial'
          await supabase.from('trade_orders').update({ filled_units: newBuyFilled, status: buyStatus, filled_time: new Date().toISOString() }).eq('id', buy.id)

          // Update sell order
          const newSellFilled = sell.filled_units + matched
          const sellStatus = newSellFilled >= sell.units ? 'filled' : 'partial'
          await supabase.from('trade_orders').update({ filled_units: newSellFilled, status: sellStatus, filled_time: new Date().toISOString() }).eq('id', sell.id)

          // Unfreeze buyer funds
          const { data: bw } = await getSupabaseAdmin().from('user_wallets').select('frozen_balance').eq('user_id', buy.user_id).single()
          if (bw) await getSupabaseAdmin().from('user_wallets').update({ frozen_balance: Math.max(0, Number(bw.frozen_balance) - totalAmount) }).eq('user_id', buy.user_id)

          // Add asset to buyer
          const { data: baCur } = await supabase.from('user_assets').select('id, units').eq('user_id', buy.user_id).eq('asset_id', assetId).single()
          if (baCur) {
            await supabase.from('user_assets').update({ units: baCur.units + matched }).eq('id', baCur.id)
          } else {
            await supabase.from('user_assets').insert({ user_id: buy.user_id, asset_id: assetId, units: matched, average_cost: matchPrice })
          }

          // Create battery_units + investor_battery_units records for the matched units
          // so the buyer sees individual battery details in "我的资产"
          try {
            const { data: assetInfo } = await getSupabaseAdmin().from('battery_assets')
              .select('asset_code').eq('id', assetId).single()
            const assetCode = assetInfo?.asset_code || `BT${assetId.slice(0, 6)}`
            const purchasedAt = new Date().toISOString()
            for (let i = 0; i < matched; i++) {
              const unitCode = `${assetCode}-${Date.now().toString(36)}-${i}`
              const { data: newUnit } = await getSupabaseAdmin().from('battery_units')
                .insert({ unit_code: unitCode, status: 'active' }).select('id').single()
              if (newUnit) {
                await getSupabaseAdmin().from('investor_battery_units').insert({
                  investor_id: buy.user_id,
                  battery_asset_id: assetId,
                  battery_unit_id: newUnit.id,
                  purchase_price: matchPrice,
                  purchased_at: purchasedAt,
                })
              }
            }
          } catch { /* battery detail creation is best-effort; trade itself is already committed */ }

          // Pay seller
          const sellerReceive = totalAmount - fee
          const { data: sw } = await getSupabaseAdmin().from('user_wallets').select('balance').eq('user_id', sell.user_id).single()
          if (sw) await getSupabaseAdmin().from('user_wallets').update({ balance: Number(sw.balance) + sellerReceive }).eq('user_id', sell.user_id)

          buy.filled_units = newBuyFilled; buy.status = buyStatus
          sell.filled_units = newSellFilled; sell.status = sellStatus
        }
      }
    }
  } catch (e) {
    console.error('Match orders error:', e)
  }
}
