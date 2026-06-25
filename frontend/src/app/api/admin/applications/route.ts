import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const { data, error } = await supabase
      .from('franchisee_applications')
      .select('*, applicant:user_id(id, email, username, full_name, phone)')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    return ok({ applications: data || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return badRequest('Application ID required')

    const body = await request.json()
    const { status, review_note } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return badRequest('Status must be approved or rejected')
    }

    const { data, error } = await supabase
      .from('franchisee_applications')
      .update({ status, reviewed_by: user.id, review_note: review_note || '' })
      .eq('id', id)
      .select().single()

    if (error) return serverError(error.message)

    // 审批通过后创建门店记录
    if (status === 'approved' && data) {
      const { error: storeError } = await supabase
        .from('franchisee_stores')
        .insert({
          owner_id: data.user_id,
          name: data.store_name,
          city: data.city,
          address: data.address || '',
          phone: data.phone || '',
          status: 'active',
        })
      // 门店创建失败不阻断审批，仅记录错误
      if (storeError) console.error('Failed to create store:', storeError.message)
    }

    return ok({ application: data })
  } catch (e: any) {
    return serverError()
  }
}
