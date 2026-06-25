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

    // 将 owner full_name 拍平为 owner_name
    const stores = (data || []).map((s: any) => ({
      ...s,
      owner_name: s.owner?.full_name || null,
    }))

    return ok({ stores })
  } catch (e: any) {
    return serverError()
  }
}
