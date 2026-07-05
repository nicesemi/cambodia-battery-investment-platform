import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { assetId } = await params
    const body = await request.json()
    const { status } = body

    const valid = ['active', 'paused', 'closed', 'maintenance']
    if (!valid.includes(status)) return badRequest(`Invalid status. Must be: ${valid.join(', ')}`)

    const { data: asset, error } = await supabase.from('battery_assets').update({ status }).eq('id', assetId).select('*').single()
    if (error || !asset) return notFound('Asset not found')

    return ok({ message: `Asset status updated to ${status}`, asset })
  } catch (e: any) {
    return serverError()
  }
}
