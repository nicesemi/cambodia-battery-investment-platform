import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { orderId } = await params

    const { data: order, error } = await supabase.from('trade_orders')
      .select('*').eq('id', orderId).eq('user_id', user.id).single()
    if (error || !order) return notFound('Order not found')
    if (order.status === 'filled' || order.status === 'cancelled') return badRequest('Order cannot be cancelled')

    const remaining = order.units - order.filled_units

    if (order.order_type === 'buy') {
      const refund = order.price * remaining
      const { data: w } = await supabase.from('user_wallets').select('balance, frozen_balance').eq('user_id', user.id).single()
      if (w) await getSupabaseAdmin().from('user_wallets').update({
        balance: Number(w.balance) + refund,
        frozen_balance: Math.max(0, Number(w.frozen_balance) - refund)
      }).eq('user_id', user.id)
    } else {
      const { data: ua } = await supabase.from('user_assets').select('units').eq('user_id', user.id).eq('asset_id', order.asset_id).single()
      if (ua) await supabase.from('user_assets').update({ units: ua.units + remaining }).eq('user_id', user.id).eq('asset_id', order.asset_id)
    }

    await supabase.from('trade_orders').update({ status: 'cancelled', cancelled_time: new Date().toISOString() }).eq('id', orderId)

    return ok({ message: 'Order cancelled successfully' })
  } catch (e: any) {
    return serverError()
  }
}
