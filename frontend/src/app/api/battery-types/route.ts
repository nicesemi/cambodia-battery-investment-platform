import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

// GET /api/battery-types — 公开接口，首页动态获取电池类型数据
export async function GET(_request: Request) {
  try {
    const { data: types, error } = await supabase
      .from('battery_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return serverError(error.message)
    return ok({ battery_types: types })
  } catch (e: any) {
    return serverError()
  }
}
