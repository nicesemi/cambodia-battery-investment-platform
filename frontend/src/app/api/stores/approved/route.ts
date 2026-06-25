import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)

    // 允许投资者、加盟商、管理员、运营人员访问在营业门店列表
    if (!user) return unauthorized()
    const allowedRoles = ['investor', 'franchisee', 'admin', 'operator']
    if (!allowedRoles.includes(user.role)) {
      return unauthorized('Access denied')
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('franchisee_stores')
      .select('*, owner:owner_id(id, email, username, full_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    // 统计每个门店的运营电池数：investor_orders → investor → battery_units(sold)
    const storeIds = (data || []).map((s: any) => s.id)
    const { data: orders } = await supabase
      .from('investor_orders')
      .select('store_id, user_id')
      .eq('order_source', 'staff_registration')
      .in('store_id', storeIds)
      .eq('status', 'completed')

    const investorToStores: Record<string, string> = {}
    for (const o of (orders || [])) {
      investorToStores[o.user_id] = o.store_id
    }
    const investorIds = Object.keys(investorToStores)

    // 统计每个 investor 的 battery_units
    const storeBatteryCount: Record<string, number> = {}
    if (investorIds.length > 0) {
      const { data: units } = await supabase
        .from('battery_units')
        .select('investor_id')
        .in('investor_id', investorIds)
        .eq('status', 'sold')
      for (const u of (units || [])) {
        const storeId = investorToStores[u.investor_id]
        if (storeId) {
          storeBatteryCount[storeId] = (storeBatteryCount[storeId] || 0) + 1
        }
      }
    }

    const stores = (data || []).map((s: any) => ({
      ...s,
      owner_name: s.owner?.full_name || null,
      battery_count: storeBatteryCount[s.id] || s.total_batteries || 0,
    }))

    return ok({ stores })
  } catch (e: any) {
    return serverError()
  }
}
