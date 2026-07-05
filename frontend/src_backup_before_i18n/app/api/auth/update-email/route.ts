import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // 只有在未认证（unverified）状态下才允许修改邮箱
    const certStatus = user.certification_status || 'unverified'
    if (certStatus !== 'unverified') {
      return forbidden('邮箱认证后不可修改')
    }

    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return badRequest('请提供新邮箱地址')
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return badRequest('邮箱格式不正确')
    }

    const newEmail = email.trim().toLowerCase()

    // 如果邮箱没变，直接返回成功
    if (newEmail === user.email.toLowerCase()) {
      return ok({ message: '邮箱未变更', email: user.email })
    }

    const adminClient = getSupabaseAdmin()

    // 检查邮箱是否已被占用
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      return badRequest('该邮箱已被注册')
    }

    // 更新数据库 users 表的 email
    const { error: dbError } = await adminClient
      .from('users')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (dbError) {
      console.error('Update email DB error:', dbError)
      return serverError(dbError.message)
    }

    // 同时更新 Supabase Auth 中的 email
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { email: newEmail }
    )

    if (authError) {
      console.error('Update Supabase Auth email error:', authError)
      // DB 已更新成功，Auth 更新失败——记录但不阻塞，前端可提示
      return ok({
        message: '邮箱已更新，请留意认证系统的同步状态',
        email: newEmail,
        authSyncWarning: true,
      })
    }

    return ok({
      message: '邮箱修改成功',
      email: newEmail,
    })
  } catch (e: any) {
    console.error('Update email error:', e)
    return serverError()
  }
}
