import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const { data, error } = await supabase
      .from('franchisee_stores')
      .select('*, owner:owner_id(id, email, username, full_name)')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    return ok({ stores: data || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const body = await request.json()
    const { name, city, address, phone, owner_id, revenue_share } = body

    if (!name) return badRequest('Store name is required')

    const insertData: Record<string, unknown> = {
      name, city, address, phone, owner_id,
      status: 'active'
    }
    if (revenue_share !== undefined) insertData.revenue_share = parseFloat(revenue_share)

    const { data, error } = await supabase.from('franchisee_stores').insert(insertData).select().single()

    if (error) return serverError(error.message)
    return ok({ store: data }, 201)
  } catch (e: any) {
    return serverError()
  }
}
