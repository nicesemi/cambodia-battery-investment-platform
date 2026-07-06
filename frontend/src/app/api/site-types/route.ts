import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: siteTypes, error } = await supabase.from('site_types')
      .select('*')
      .order('id', { ascending: true })
    if (error) return serverError(error.message)

    return ok({ site_types: siteTypes || [] })
  } catch (e: any) {
    return serverError()
  }
}
