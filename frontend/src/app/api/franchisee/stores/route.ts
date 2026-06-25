import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin' && user.role !== 'operator') {
      return unauthorized('Franchisee only')
    }

    // Admin/operator sees all, franchisee sees own
    let query = supabase.from('franchisee_stores').select('*').order('created_at', { ascending: false })
    if (user.role === 'franchisee') {
      query = query.eq('owner_id', user.id)
    }

    const { data, error } = await query
    if (error) return serverError(error.message)
    return ok({ stores: data || [] })
  } catch (e: any) {
    return serverError()
  }
}
