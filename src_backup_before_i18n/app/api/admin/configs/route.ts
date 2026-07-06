import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { data: configs, error } = await supabase.from('system_configs').select('*').order('config_key')
    if (error) return serverError(error.message)
    return ok({ configs })
  } catch (e: any) {
    return serverError()
  }
}
