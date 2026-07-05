import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { data, error } = await supabase
      .from('agent_applications')
      .select('id, full_name, agent_type, region, city')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)
    return ok({ agents: data || [] })
  } catch (e: any) {
    return serverError()
  }
}
