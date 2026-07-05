import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: trades, count, error } = await supabase.from('trade_records')
      .select('*, buyer:buyer_id(username), seller:seller_id(username), battery_assets!inner(name)', { count: 'exact' })
      .order('trade_time', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    if (error) return serverError(error.message)

    const formatted = (trades || []).map((t: any) => ({
      ...t, buyer_name: t.buyer?.username, seller_name: t.seller?.username,
      asset_name: t.battery_assets?.name, battery_assets: undefined, buyer: undefined, seller: undefined
    }))

    return ok({ trades: formatted, total: count || 0, page, limit })
  } catch (e: any) {
    return serverError()
  }
}
