import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError, notFound } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/workers — 获取工人列表
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const { searchParams } = new URL(request.url)
    const fields = searchParams.get('fields')
    const compact = fields === 'dispatch'

    const adminClient = getSupabaseAdmin()
    const selectColumns = compact ? 'id, name, phone' : '*'

    const { data, error } = await adminClient
      .from('workers')
      .select(selectColumns)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    return ok(data || [])
  } catch (e: any) {
    return serverError()
  }
}

/**
 * POST /api/admin/workers — 创建工人
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { name, id_number, phone, photo_url, age } = body

    if (!name || !id_number || !phone) {
      return badRequest('姓名、证件号、手机号为必填项')
    }

    const adminClient = getSupabaseAdmin()

    // 自动生成 worker_code: 查询现有最大 worker_code，提取数字部分+1
    let workerCode = ''
    try {
      const { data: existing, error: queryError } = await adminClient
        .from('workers')
        .select('worker_code')
        .not('worker_code', 'is', null)
        .order('worker_code', { ascending: false })
        .limit(1)

      if (!queryError && existing && existing.length > 0) {
        const maxCode = existing[0].worker_code
        const match = maxCode.match(/^WRK-(\d+)$/)
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1
          workerCode = `WRK-${String(nextNum).padStart(3, '0')}`
        }
      }
    } catch (_) { /* fallback below */ }

    if (!workerCode) {
      workerCode = `WRK-${String(Date.now() % 10000).padStart(4, '0')}`
    }

    const { data, error } = await adminClient
      .from('workers')
      .insert({
        name,
        id_number,
        phone,
        photo_url: photo_url || null,
        age: age != null ? parseInt(String(age), 10) : null,
        worker_code: workerCode,
      })
      .select()
      .single()

    if (error) return serverError(error.message)

    return ok(data)
  } catch (e: any) {
    return serverError()
  }
}

/**
 * PUT /api/admin/workers — 更新工人信息
 */
export async function PUT(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { id, name, id_number, phone, photo_url, age } = body

    if (!id) return badRequest('缺少工人ID')

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('workers')
      .update({
        name,
        id_number,
        phone,
        photo_url: photo_url || null,
        age: age != null ? parseInt(String(age), 10) : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return serverError(error.message)
    if (!data) return notFound('工人不存在')

    return ok(data)
  } catch (e: any) {
    return serverError()
  }
}

/**
 * DELETE /api/admin/workers — 删除工人
 */
export async function DELETE(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('缺少工人ID')

    const adminClient = getSupabaseAdmin()
    const { error } = await adminClient
      .from('workers')
      .delete()
      .eq('id', id)

    if (error) return serverError(error.message)

    return ok({ success: true })
  } catch (e: any) {
    return serverError()
  }
}
