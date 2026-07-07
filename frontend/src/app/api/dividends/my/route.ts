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
      .select('*, battery_assets!inner(name, name_i18n, asset_code)')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })

    if (period) query = query.eq('period', period)

    const { data: dividends, error } = await query
    if (error) return serverError(error.message)

    // 过滤掉已回购的电池：检查 investor_battery_units 中是否仍持有
    const eligibleDividends: any[] = []
    for (const d of (dividends || [])) {
      const { data: holding } = await supabase.from('investor_battery_units')
        .select('id').eq('investor_id', user.id).eq('battery_asset_id', d.asset_id).limit(1)
      if (holding && holding.length > 0) {
        eligibleDividends.push(d)
      }
    }

    const formatted = eligibleDividends.map((d: any) => ({
      ...d, asset_name: d.battery_assets?.name, asset_name_i18n: d.battery_assets?.name_i18n, asset_code: d.battery_assets?.asset_code, battery_assets: undefined
    }))

    // Summary
    const { data: summary } = await supabase.from('dividend_records')
      .select('dividend_amount.sum(), period.count()')
      .eq('user_id', user.id)

    const totalDividends = summary?.[0]?.sum || 0
    const count = summary?.[0]?.count || 0
    const { count: periodCount } = await supabase.from('dividend_records').select('period', { count: 'exact', head: true }).eq('user_id', user.id)

    // Battery details: held batteries with current month dividend calculation
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const { data: holdings } = await supabase
      .from('investor_battery_units')
      .select(`
        purchased_at,
        purchase_price,
        battery_units!inner(
          unit_code,
          status,
          battery_assets!inner(name, name_i18n, asset_code, unit_price, expected_roi, battery_type_id)
        )
      `)
      .eq('investor_id', user.id)
      .eq('battery_units.status', 'sold')

    // 获取 battery_types 月租金映射
    const batteryTypeIds = Array.from(new Set((holdings || [])
      .map((h: any) => h.battery_units?.battery_assets?.battery_type_id)
      .filter(Boolean)))
    const batteryTypeRentMap = new Map<string, number>()
    if (batteryTypeIds.length > 0) {
      const { data: batteryTypes } = await supabase
        .from('battery_types')
        .select('id, monthly_rent')
        .in('id', batteryTypeIds)
      for (const bt of (batteryTypes || [])) {
        batteryTypeRentMap.set(bt.id, Number(bt.monthly_rent || 0))
      }
    }

    // 累计分红：按资产汇总
    const { data: cumDividends } = await supabase
      .from('dividend_records')
      .select('asset_id, dividend_amount.sum()')
      .eq('user_id', user.id)

    const cumulativeMap: Record<string, number> = {}
    if (cumDividends) {
      for (const c of cumDividends) {
        cumulativeMap[c.asset_id] = Number(c.sum) || 0
      }
    }

    const battery_details = (holdings || []).map((h: any) => {
      const bu = h.battery_units
      const asset = bu?.battery_assets
      const asset_id = asset?.id
      const unit_price = asset?.unit_price || 0
      const expected_roi = asset?.expected_roi || 0
      const monthly_rent = batteryTypeRentMap.get(asset?.battery_type_id) || 0
      const purchased_at = h.purchased_at ? new Date(h.purchased_at) : null
      const cumulative = cumulativeMap[asset_id] || 0

      let this_month_dividend = 0
      let rent_start: Date | null = null

      if (purchased_at) {
        rent_start = new Date(purchased_at.getTime() + 10 * 24 * 60 * 60 * 1000)

        if (rent_start > today) {
          this_month_dividend = 0
        } else {
          const rsMonth = rent_start.getMonth()
          const rsYear = rent_start.getFullYear()

          if (rsYear === currentYear && rsMonth === currentMonth) {
            const remainingDays = daysInMonth - rent_start.getDate() + 1
            this_month_dividend = (remainingDays / daysInMonth) * monthly_rent * 0.70
          } else if (rsYear < currentYear || (rsYear === currentYear && rsMonth < currentMonth)) {
            this_month_dividend = monthly_rent * 0.70
          }
        }
      }

      return {
        unit_code: bu?.unit_code,
        asset_name: asset?.name,
        name_i18n: asset?.name_i18n,
        asset_code: asset?.asset_code,
        monthly_rent: Math.round(monthly_rent * 100) / 100,
        this_month_dividend: Math.round(this_month_dividend * 100) / 100,
        cumulative_dividend: Math.round(cumulative * 100) / 100,
        purchased_at: h.purchased_at,
        rent_start: rent_start?.toISOString() || null,
        unit_price,
        expected_roi,
      }
    })

    return ok({
      dividends: formatted,
      summary: { total_dividends: totalDividends, dividend_count: count, periods: 0 },
      battery_details,
    })
  } catch (e: any) {
    return serverError()
  }
}
