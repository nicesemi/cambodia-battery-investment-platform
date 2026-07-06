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
// 支持语言参数：从 Accept-Language header 或 URL query ?locale=zh-CN 获取
export async function GET(request: Request) {
  try {
    // 解析语言参数
    const { searchParams } = new URL(request.url)
    const queryLocale = searchParams.get('locale')
    const acceptLanguage = request.headers.get('Accept-Language') || ''
    const rawLocale = queryLocale || acceptLanguage.split(',')[0]?.trim() || 'zh-CN'

    // 将 Accept-Language 格式（如 zh, zh-CN;q=0.9, en;q=0.8）提取为有效 locale
    const normalizeLocale = (raw: string): string => {
      const supported = ['zh-CN', 'zh-TW', 'en', 'bn', 'km']
      // 尝试直接匹配
      if (supported.includes(raw)) return raw
      // 尝试匹配前缀（如 zh → zh-CN）
      const prefix = raw.split('-')[0]
      const match = supported.find(s => s.startsWith(prefix))
      return match || 'zh-CN'
    }
    const locale = normalizeLocale(rawLocale)

    const { data: types, error } = await supabase
      .from('battery_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return serverError(error.message)

    const resolveI18n = (i18nObj: any, field: string, rawField: string, t: any): string => {
      if (i18nObj && typeof i18nObj === 'object' && i18nObj[locale]) return i18nObj[locale]
      if (i18nObj && typeof i18nObj === 'object' && i18nObj['zh-CN']) return i18nObj['zh-CN']
      return t[rawField] || ''
    }

    const typesWithReturn = (types || []).map((t: any) => {
      const unitPriceNum = parseUnitPrice(t.unit_price)
      const annualized_return = (t.monthly_rent != null && unitPriceNum != null && unitPriceNum !== 0)
        ? parseFloat(((parseFloat(String(t.monthly_rent)) * 12 * 0.7) / unitPriceNum * 100).toFixed(2))
        : null

      // 按请求语言解析 name / description / scenario
      const resolvedName = resolveI18n(t.name_i18n, 'name', 'name', t)
      const resolvedDescription = resolveI18n(t.description_i18n, 'description', 'description', t)
      const resolvedScenario = resolveI18n(t.scenario_i18n, 'scenario', 'scenario', t)

      return {
        ...t,
        annualized_return,
        resolved_name: resolvedName,
        resolved_description: resolvedDescription,
        resolved_scenario: resolvedScenario
      }
    })

    return ok({ battery_types: typesWithReturn, locale })
  } catch (e: any) {
    return serverError()
  }
}
