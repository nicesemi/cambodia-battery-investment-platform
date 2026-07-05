import bcrypt from 'bcrypt'
import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * POST /api/franchisee/staff-register-investor
 * 店员帮投资者注册账号并绑定到门店
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    // 仅加盟商(franchisee)可操作
    if (user.role !== 'franchisee') {
      return forbidden('仅加盟商可执行此操作')
    }

    const body = await request.json()
    const { username, email, password, phone, store_id } = body

    if (!username || !email || !password) {
      return badRequest('缺少必填字段: username, email, password')
    }
    if (!store_id) {
      return badRequest('缺少必填字段: store_id')
    }

    // 校验门店属于当前加盟商
    const { data: store, error: storeErr } = await supabase
      .from('franchisee_stores')
      .select('id, owner_id, name, store_code')
      .eq('id', store_id)
      .single()

    if (storeErr || !store) return badRequest('门店不存在')
    if (store.owner_id !== user.id) return forbidden('该门店不属于您')

    // 检查用户名/邮箱是否已存在
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return badRequest('用户名或邮箱已存在')
    }

    // 创建投资者用户
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const { data: investor, error: createErr } = await supabase
      .from('users')
      .insert({
        email,
        username,
        password_hash: passwordHash,
        full_name: '',
        phone: phone || '',
        role: 'investor',
        is_verified: true,
        is_active: true,
      })
      .select('id, email, username, full_name, investor_code, role, created_at')
      .single()

    if (createErr) return serverError(createErr.message)

    // 创建钱包
    await supabase.from('user_wallets').insert({ user_id: investor.id })

    // 绑定投资者到门店（通过 investor_orders 记录建立关联）
    // 使用一个最小的假订单记录来建立 store_id 绑定
    const { error: bindErr } = await supabase.from('investor_orders').insert({
      user_id: investor.id,
      store_id,
      units: 0,
      unit_price: 0,
      total_amount: 0,
      status: 'completed',
      order_source: 'staff_registration',
    })

    if (bindErr) {
      console.error('Store binding failed:', bindErr.message)
      // 不阻塞流程 — 用户已创建成功
    }

    return ok({
      message: '投资者注册成功',
      investor: {
        id: investor.id,
        email: investor.email,
        username: investor.username,
        investor_code: investor.investor_code,
        role: investor.role,
      },
      store_id,
      store_code: store.store_code,
      store_name: store.name,
    }, 201)
  } catch (e: any) {
    console.error('staff-register-investor error:', e)
    return serverError()
  }
}
