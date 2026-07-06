import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

const SUPPORTED_LOCALES = ['zh-CN', 'zh-TW', 'en', 'bn', 'km'] as const
const DEFAULT_LOCALE = 'zh-CN'

function parseLocale(request: Request): string {
  const url = new URL(request.url)
  const queryLocale = url.searchParams.get('locale')
  if (queryLocale && (SUPPORTED_LOCALES as readonly string[]).includes(queryLocale)) {
    return queryLocale
  }
  const acceptLanguage = request.headers.get('Accept-Language')
  if (acceptLanguage) {
    for (const lang of acceptLanguage.split(',')) {
      const code = lang.split(';')[0].trim()
      if ((SUPPORTED_LOCALES as readonly string[]).includes(code)) return code
      if (code === 'zh' || code === 'zh-CN') return 'zh-CN'
      if (code === 'zh-TW' || code === 'zh-Hant') return 'zh-TW'
      if (code === 'en') return 'en'
      if (code === 'bn') return 'bn'
      if (code === 'km') return 'km'
    }
  }
  return DEFAULT_LOCALE
}

function resolveI18n(i18n: any, locale: string, fallback: string): string {
  if (!i18n) return fallback
  if (typeof i18n === 'string') {
    try { i18n = JSON.parse(i18n) } catch { return fallback }
  }
  return (i18n && i18n[locale]) || (i18n && i18n[DEFAULT_LOCALE]) || (i18n && Object.values(i18n)[0]) || fallback
}

export async function GET(request: Request) {
  try {
    const locale = parseLocale(request)
    const admin = getSupabaseAdmin()
    const [{ data: assets, error }, { data: types }] = await Promise.all([
      supabase.from('battery_assets')
        .select('id, asset_code, name, description, name_i18n, description_i18n, battery_type, battery_type_id, total_units, available_units, unit_price, unit_price_rmb, expected_roi, monthly_rent, thumbnail_url, location, status, created_at')
        .order('created_at', { ascending: false }),
      admin.from('battery_types').select('id, name, name_i18n, image_url, monthly_rent').eq('is_active', true)
    ])
    if (error) return serverError(error.message)

    // 构建 battery_type_id → 各字段映射
    const imageMap: Record<string, string> = {}
    const rentMap: Record<string, number> = {}
    const typeNameMap: Record<string, { name: string; name_i18n: any }> = {}
    for (const t of (types || [])) {
      if (t.id) {
        if (t.image_url) imageMap[t.id] = t.image_url
        if (t.monthly_rent != null) rentMap[t.id] = t.monthly_rent
        typeNameMap[t.id] = { name: t.name, name_i18n: t.name_i18n }
      }
    }

    const formatted = (assets || []).map((a: any) => {
      const btTypeName = typeNameMap[a.battery_type_id]
      return {
        ...a,
        // 图片：battery_types.image_url > battery_assets.thumbnail_url
        thumbnail_url: imageMap[a.battery_type_id] || a.thumbnail_url || null,
        // 月租：battery_types.monthly_rent > battery_assets.monthly_rent
        monthly_rent: rentMap[a.battery_type_id] ?? a.monthly_rent ?? null,
        annualized_return: a.expected_roi ?? null,
        // 多语言解析
        resolved_name: resolveI18n(a.name_i18n, locale, a.name || ''),
        resolved_description: resolveI18n(a.description_i18n, locale, a.description || ''),
        resolved_battery_type: btTypeName
          ? resolveI18n(btTypeName.name_i18n, locale, btTypeName.name || a.battery_type || '')
          : (a.battery_type || ''),
      }
    })
    return ok({ assets: formatted })
  } catch (e: any) {
    return serverError()
  }
}
