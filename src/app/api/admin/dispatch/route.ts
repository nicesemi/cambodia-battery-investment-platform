import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'
import { sendWecomMessage, buildDispatchMessage } from '@/lib/wecom'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispatch — 获取工单列表（Webhook模式：无持久化工单，返回空）
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    return ok([])
  } catch (e: any) {
    return serverError()
  }
}

/**
 * POST /api/admin/dispatch — 派发工单（更新站点信息到 battery_units + Webhook通知）
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    const body = await request.json()
    const { battery_ids, worker_id, site_id } = body

    if (!battery_ids || !Array.isArray(battery_ids) || battery_ids.length === 0) {
      return badRequest('请选择至少一个电池')
    }
    if (!worker_id) {
      return badRequest('请选择工人')
    }

    const adminClient = getSupabaseAdmin()

    // 查询选中的已售电池信息
    const { data: batteries, error: batteryError } = await adminClient
      .from('battery_units')
      .select('id, unit_code, site_name, sensor_longitude, sensor_latitude, battery_assets!inner(id, name, name_i18n)')
      .in('id', battery_ids)

    if (batteryError) return serverError(batteryError.message)
    if (!batteries || batteries.length === 0) return badRequest('未找到有效的已售电池')

    // 查询工人信息（含 worker_code）
    const { data: worker, error: workerError } = await adminClient
      .from('workers')
      .select('id, name, phone, worker_code')
      .eq('id', worker_id)
      .single()

    if (workerError || !worker) return badRequest('工人不存在')

    // 站点信息：如传入 site_id，查找站点并更新 battery_units.site_name
    let siteName = ''
    if (site_id) {
      const { data: site, error: siteError } = await adminClient
        .from('operation_sites')
        .select('name, name_i18n, site_code')
        .eq('id', site_id)
        .single()

      if (!siteError && site) {
        // resolve display name from name_i18n (zh-CN first), fallback to name
        const i18n = (site as any).name_i18n
        const displayName = (i18n && typeof i18n === 'object' && i18n['zh-CN']) || site.name || ''
        siteName = displayName
        // 将站点名称和 site_id 写入已售电池记录
        // 同时更新 site_id 确保 downstream（live GPS、投资者购买等）能直接关联
        const { error: updateError } = await adminClient
          .from('battery_units')
          .update({ site_name: displayName, site_id: site_id })
          .in('id', battery_ids)
        if (updateError) {
          console.error('[Dispatch] Failed to update battery site_name:', updateError.message)
        } else {
          // 重新计算该站点下已派工的电池总数，同步更新 operation_sites.battery_count
          // 确保首页电池网络实时分布的 battery_count 与实际派工数量一致
          const { count: siteBatteryCount, error: countError } = await adminClient
            .from('battery_units')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', site_id)
          if (!countError && siteBatteryCount != null) {
            const { error: bcError } = await adminClient
              .from('operation_sites')
              .update({ battery_count: siteBatteryCount })
              .eq('id', site_id)
            if (bcError) {
              console.error('[Dispatch] Failed to sync operation_sites.battery_count:', bcError.message)
            }
          }
        }
      } else if (siteError) {
        console.error('[Dispatch] Failed to query operation_sites:', siteError.message)
      }
    }

    // 发送企业微信通知
    const dispatchMsg = buildDispatchMessage({
      workerName: worker.name,
      workerPhone: worker.phone,
      workerCode: worker.worker_code || '',
      batteryList: batteries.map((b: any) => ({
        unit_code: b.unit_code || '',
        site_name: b.site_name || '',
        asset_name: b.battery_assets?.name || '',
        longitude: b.sensor_longitude ?? null,
        latitude: b.sensor_latitude ?? null,
      })),
    })

    const webhookSent = await sendWecomMessage(dispatchMsg)
    if (!webhookSent) {
      console.log('[Dispatch] WeCom webhook not configured or failed, but dispatch acknowledged')
    }

    return ok({
      success: true,
      dispatched_count: batteries.length,
      worker_name: worker.name,
      worker_phone: worker.phone,
      site_name: siteName,
      webhook_sent: webhookSent,
      batteries: batteries.map((b: any) => ({
        unit_code: b.unit_code || '',
        site_name: b.site_name || '',
        asset_name: b.battery_assets?.name || '',
        longitude: b.sensor_longitude ?? null,
        latitude: b.sensor_latitude ?? null,
      })),
    })
  } catch (e: any) {
    return serverError()
  }
}

/**
 * PUT /api/admin/dispatch — 更新工单状态（Webhook模式：无持久化，直接返回成功）
 */
export async function PUT(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator'))
      return unauthorized('Admin or operator only')

    return ok({ success: true })
  } catch (e: any) {
    return serverError()
  }
}
