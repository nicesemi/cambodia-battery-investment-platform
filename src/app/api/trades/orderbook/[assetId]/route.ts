import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params

    const { data: buyOrders } = await supabase.from('trade_orders')
      .select('price, units, filled_units')
      .eq('asset_id', assetId).eq('order_type', 'buy').in('status', ['pending','partial'])
      .order('price', { ascending: false }).limit(20)
    
    const { data: sellOrders } = await supabase.from('trade_orders')
      .select('price, units, filled_units')
      .eq('asset_id', assetId).eq('order_type', 'sell').in('status', ['pending','partial'])
      .order('price', { ascending: true }).limit(20)

    return ok({ buyOrders: buyOrders || [], sellOrders: sellOrders || [] })
  } catch (e: any) {
    return serverError()
  }
}
