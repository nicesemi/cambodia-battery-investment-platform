import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/battery-units?asset_id=xxx 或 ?asset_ids=xxx,yyy&status=available
 * 查询某个或某些电池资产下的电池单元
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin' && user.role !== 'operator') return unauthorized('Admin only')

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('asset_id')
    const assetIdsParam = searchParams.get('asset_ids')
    const statusFilter = searchParams.get('status')

    if (!assetId && !assetIdsParam) return badRequest('缺少 asset_id 或 asset_ids')

    let query = supabase
      .from('battery_units')
      .select('id, unit_code, status, battery_asset_id')

    if (assetIdsParam) {
      const ids = assetIdsParam.split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length === 0) return badRequest('asset_ids 无效')
      query = query.in('battery_asset_id', ids)
    } else {
      query = query.eq('battery_asset_id', assetId!)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query.order('unit_code', { ascending: true })

    const { data, error } = await query

    if (error) return serverError(error.message)

    return ok({ units: data || [], total: (data || []).length })
  } catch (e: any) {
    return serverError(e.message)
  }
}
