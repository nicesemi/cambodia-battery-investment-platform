import { supabase } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/keepalive
 * Vercel Cron 每 3 分钟调用一次，防止 Supabase 免费层休眠
 * 在 vercel.json 中配置 cron job
 */
export async function GET() {
  try {
    // 轻量查询唤醒 Supabase
    const { data, error } = await supabase
      .from('user_wallets')
      .select('id')
      .limit(1)

    if (error) {
      return serverError(error.message)
    }

    return ok({ alive: true, ts: Date.now() })
  } catch (e: any) {
    return serverError(e.message)
  }
}
