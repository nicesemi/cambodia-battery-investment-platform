import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/warehouses — 获取仓库列表（含负责人姓名）
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    // 关联获取负责人姓名
    const managerIds = Array.from(new Set((data || []).map(w => w.manager_id).filter(Boolean) as string[]))
    let workerMap: Record<string, string> = {}
    if (managerIds.length > 0) {
      const { data: workers } = await adminClient
        .from('workers')
        .select('id, name')
        .in('id', managerIds)
      for (const w of (workers || [])) {
        if (w.id && w.name) workerMap[w.id] = w.name
      }
    }

    const formatted = (data || []).map((w: any) => ({
      ...w,
      manager_name: w.manager_id ? (workerMap[w.manager_id] || null) : null,
    }))

    return ok(formatted)
  } catch (e: any) {
    return serverError()
  }
}

/**
 * POST /api/admin/warehouses — 创建仓库（仓库编码自动生成）
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { name, address, manager_id } = body

    if (!name) {
      return badRequest('仓库名称为必填项')
    }

    const adminClient = getSupabaseAdmin()

    // 自动生成 warehouse_code: WH-YYYYMMDD-NNN
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `WH-${dateStr}-`

    // 查询当天已有仓库的最大序号
    const { data: existing } = await adminClient
      .from('warehouses')
      .select('warehouse_code')
      .like('warehouse_code', `${prefix}%`)
      .order('warehouse_code', { ascending: false })
      .limit(1)

    let seq = 1
    if (existing && existing.length > 0) {
      const lastCode = existing[0].warehouse_code
      const lastSeq = parseInt(lastCode.split('-').pop() || '0', 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    const warehouse_code = `${prefix}${String(seq).padStart(3, '0')}`

    const insertData: Record<string, any> = {
      warehouse_code,
      name,
      address: address || null,
    }
    // manager_id 有效时才加入 insert，避免空串/null 触发 FK 约束
    const cleanManagerId = manager_id && String(manager_id).trim() ? manager_id : null
    if (cleanManagerId) {
      insertData.manager_id = cleanManagerId
    }
    console.error('[POST /admin/warehouses] insertData:', JSON.stringify(insertData), 'raw manager_id:', JSON.stringify(manager_id))

    const { data, error } = await adminClient
      .from('warehouses')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return badRequest('仓库编码已存在')
      return serverError(error.message)
    }

    return ok(data, 201)
  } catch (e: any) {
    return serverError()
  }
}
