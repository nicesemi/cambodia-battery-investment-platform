import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    let query = supabase.from('dividend_records')
      .select('*, battery_assets!inner(name, asset_code)')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })

    if (period) query = query.eq('period', period)

    const { data: dividends, error } = await query
    if (error) return serverError(error.message)

    const formatted = dividends?.map((d: any) => ({
      ...d, asset_name: d.battery_assets?.name, asset_code: d.battery_assets?.asset_code, battery_assets: undefined
    }))

    // Summary
    const { data: summary } = await supabase.from('dividend_records')
      .select('dividend_amount.sum(), period.count()')
      .eq('user_id', user.id)

    const totalDividends = summary?.[0]?.sum || 0
    const count = summary?.[0]?.count || 0
    const { count: periodCount } = await supabase.from('dividend_records').select('period', { count: 'exact', head: true }).eq('user_id', user.id)

    return ok({ dividends: formatted, summary: { total_dividends: totalDividends, dividend_count: count, periods: 0 } })
  } catch (e: any) {
    return serverError()
  }
}
