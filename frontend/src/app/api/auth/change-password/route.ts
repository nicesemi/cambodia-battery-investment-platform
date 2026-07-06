import bcrypt from 'bcryptjs'
import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, badRequest, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { oldPassword, newPassword } = body

    if (!oldPassword || !newPassword) {
      return badRequest('请提供旧密码和新密码')
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return badRequest('新密码长度至少6位')
    }

    // 获取当前密码哈希
    const { data: dbUser, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single()

    if (fetchError || !dbUser) {
      return serverError('获取用户信息失败')
    }

    // 验证旧密码
    const valid = await bcrypt.compare(oldPassword, dbUser.password_hash)
    if (!valid) {
      return badRequest('旧密码不正确')
    }

    // 新旧密码不能相同
    const sameAsOld = await bcrypt.compare(newPassword, dbUser.password_hash)
    if (sameAsOld) {
      return badRequest('新密码不能与旧密码相同')
    }

    // 更新密码
    const saltRounds = 10
    const newHash = await bcrypt.hash(newPassword, saltRounds)

    const { error: updateError } = await getSupabaseAdmin()
      .from('users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Change password update error:', updateError)
      return serverError('密码更新失败')
    }

    return ok({ message: '密码修改成功' })
  } catch (e: any) {
    console.error('Change password error:', e.message)
    return serverError()
  }
}
