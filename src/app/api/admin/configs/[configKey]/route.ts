import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ configKey: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { configKey } = await params
    const body = await request.json()
    const { configValue } = body
    if (configValue === undefined) return badRequest('configValue required')

    const { data: config, error } = await supabase.from('system_configs')
      .update({ config_value: String(configValue), updated_at: new Date().toISOString() })
      .eq('config_key', configKey).select('*').single()
    if (error || !config) return notFound('Config not found')

    return ok({ message: 'Config updated successfully', config })
  } catch (e: any) {
    return serverError()
  }
}
