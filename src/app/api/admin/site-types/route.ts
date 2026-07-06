import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: siteTypes, error } = await supabase.from('site_types')
      .select('*')
      .order('id', { ascending: true })
    if (error) return serverError(error.message)

    return ok({ site_types: siteTypes || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const body = await request.json()
    const { name, name_i18n } = body

    if (!name || !name.trim()) return badRequest('站点类型标识不能为空')

    const i18nObj = name_i18n || (typeof name === 'string' && name.trim() ? { 'zh-CN': name.trim() } : null)

    const { data: siteType, error } = await supabase.from('site_types').insert({
      name: name.trim(),
      name_i18n: i18nObj,
    }).select('*').single()

    if (error) {
      if (error.code === '23505') return badRequest('站点类型标识已存在')
      return serverError(error.message)
    }

    return ok({ message: '站点类型已创建', site_type: siteType }, 201)
  } catch (e: any) {
    return serverError()
  }
}
