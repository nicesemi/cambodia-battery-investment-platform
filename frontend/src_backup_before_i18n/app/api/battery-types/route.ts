import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

function parseUnitPrice(val: any): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// GET /api/battery-types — 公开接口，首页动态获取电池类型数据
export async function GET(_request: Request) {
  try {
    const { data: types, error } = await supabase
      .from('battery_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return serverError(error.message)

    const typesWithReturn = (types || []).map((t: any) => {
      const unitPriceNum = parseUnitPrice(t.unit_price)
      const annualized_return = (t.monthly_rent != null && unitPriceNum != null && unitPriceNum !== 0)
        ? parseFloat(((parseFloat(String(t.monthly_rent)) * 12 * 0.7) / unitPriceNum * 100).toFixed(2))
        : null
      return { ...t, annualized_return }
    })

    return ok({ battery_types: typesWithReturn })
  } catch (e: any) {
    return serverError()
  }
}
