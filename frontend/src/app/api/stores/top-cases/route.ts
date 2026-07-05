import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 获取运营中的加盟门店，按电池数量排序
    const { data: stores } = await supabase
      .from('franchisee_stores')
      .select('id, name, city, address, phone, status, total_batteries, revenue_share, store_code, photo_url')
      .eq('status', 'active')
      .order('total_batteries', { ascending: false })
      .limit(6)

    if (!stores || stores.length === 0) return ok({ stores: [] })

    // 统计每个门店的实际运营电池数
    const storeIds = stores.map(s => s.id)
    const adminClient = getSupabaseAdmin()

    const { data: orders } = await adminClient
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

    const storeBatteryCount: Record<string, number> = {}
    if (investorIds.length > 0) {
      const { data: units } = await adminClient
        .from('battery_units')
        .select('investor_id')
        .in('investor_id', investorIds)
        .eq('status', 'sold')
      for (const u of (units || [])) {
        const sid = investorToStores[u.investor_id]
        if (sid) storeBatteryCount[sid] = (storeBatteryCount[sid] || 0) + 1
      }
    }

    const result = stores.map((s, i) => ({
      ...s,
      rank: i + 1,
      battery_count: storeBatteryCount[s.id] || s.total_batteries || 0,
    }))

    return ok({ stores: result })
  } catch (e: any) {
    return serverError()
  }
}
