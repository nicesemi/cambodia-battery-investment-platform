import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || user.role !== 'admin') return unauthorized('Admin only')

    const { userId } = await params
    const body = await request.json()
    const { is_active, role, kyc_status } = body

    const updates: any = {}
    if (is_active !== undefined) updates.is_active = is_active
    if (role !== undefined) updates.role = role
    if (kyc_status !== undefined) updates.kyc_status = kyc_status

    if (Object.keys(updates).length === 0) {
      const { data } = await supabase.from('users').select('id, email, username, role, is_active, kyc_status').eq('id', userId).single()
      return data ? ok({ message: 'No changes', user: data }) : notFound()
    }

    const { data: updated, error } = await supabase.from('users').update(updates).eq('id', userId)
      .select('id, email, username, role, is_active, kyc_status').single()
    if (error || !updated) return notFound('User not found')

    return ok({ message: 'User updated successfully', user: updated })
  } catch (e: any) {
    return serverError()
  }
}
