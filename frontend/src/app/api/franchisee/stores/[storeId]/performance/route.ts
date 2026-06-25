import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { storeId } = await params

    // 验证门店存在且有权限
    const { data: store, error: storeError } = await supabase
      .from('franchisee_stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) return notFound('Store not found')
    if (user.role === 'franchisee' && store.owner_id !== user.id) {
      return unauthorized('Access denied')
    }

    // 统计该门店绑定的投资者订单
    const { data: orders, error: ordersError } = await supabase
      .from('investor_orders')
      .select('total_amount, units, created_at')
      .eq('store_id', storeId)

    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0
    const totalUnits = orders?.reduce((sum, o) => sum + Number(o.units || 0), 0) || 0

    // 本月订单
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthOrders = orders?.filter(o => o.created_at >= monthStart) || []
    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

    return ok({
      store_id: storeId,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      monthly_revenue: monthlyRevenue,
      monthly_orders: monthOrders.length
    })
  } catch (e: any) {
    return serverError()
  }
}
