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

    const { data: store, error } = await supabase
      .from('franchisee_stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error || !store) return notFound('Store not found')

    if (user.role === 'franchisee' && store.owner_id !== user.id) {
      return unauthorized('Access denied')
    }

    // 查询绑定到该门店的投资者
    const { data: orders } = await supabase
      .from('investor_orders')
      .select(`
        user_id,
        created_at,
        users:user_id (id, email, username, full_name, phone, investor_code)
      `)
      .eq('store_id', storeId)
      .eq('order_source', 'staff_registration')

    const seen = new Set()
    const boundInvestors: any[] = []
    for (const o of (orders || [])) {
      const inv = (o as any).users
      if (inv && inv.id && !seen.has(inv.id)) {
        seen.add(inv.id)
        boundInvestors.push({
          ...inv,
          bound_at: (o as any).created_at,
        })
      }
    }

    return ok({
      ...store,
      bound_investors: boundInvestors,
      bound_investor_count: boundInvestors.length
    })
  } catch (e: any) {
    return serverError()
  }
}
