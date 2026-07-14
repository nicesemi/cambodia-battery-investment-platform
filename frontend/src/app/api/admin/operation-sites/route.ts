import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

// --- 站点编码自动生成 ---

/** 国家 → 国家码映射 */
function getCountryCode(country: string): string {
  const map: Record<string, string> = {
    '柬埔寨': 'KH', 'Cambodia': 'KH',
    '泰国': 'TH', 'Thailand': 'TH',
    '越南': 'VN', 'Vietnam': 'VN',
    '老挝': 'LA', 'Laos': 'LA',
    '缅甸': 'MM', 'Myanmar': 'MM',
    '马来西亚': 'MY', 'Malaysia': 'MY',
    '新加坡': 'SG', 'Singapore': 'SG',
    '印度尼西亚': 'ID', 'Indonesia': 'ID',
    '菲律宾': 'PH', 'Philippines': 'PH',
  };
  return map[country] || country.substring(0, 2).toUpperCase();
}

/** 城市 → 城市码（拼音首字母大写） */
function getCityCode(city: string): string {
  const map: Record<string, string> = {
    // 柬埔寨
    '金边': 'PNH', 'Phnom Penh': 'PNH',
    '西哈努克': 'XHN', 'Sihanoukville': 'XHN',
    '暹粒': 'XRL', 'Siem Reap': 'XRL',
    '马德望': 'MDW', 'Battambang': 'MDW',
    '贡布': 'GB', 'Kampot': 'GB',
    // 泰国
    '曼谷': 'BKK', 'Bangkok': 'BKK',
    '清迈': 'QMA', 'Chiang Mai': 'QMA',
    '芭提雅': 'BTY', 'Pattaya': 'BTY',
    '普吉': 'PJ', 'Phuket': 'PJ',
    // 越南
    '胡志明': 'HZM', '胡志明市': 'HZM', 'Ho Chi Minh': 'HZM',
    '河内': 'HN', 'Hanoi': 'HN',
    '岘港': 'XG', 'Da Nang': 'XG',
    '海防': 'HF', 'Hai Phong': 'HF',
    // 老挝
    '万象': 'WX', 'Vientiane': 'WX',
    '琅勃拉邦': 'LBL', 'Luang Prabang': 'LBL',
    // 缅甸
    '仰光': 'YG', 'Yangon': 'YG',
    '内比都': 'NBD', 'Naypyidaw': 'NBD',
    // 马来西亚
    '吉隆坡': 'JLP', 'Kuala Lumpur': 'JLP',
    // 新加坡
    '新加坡': 'XJP', 'Singapore': 'XJP',
    // 印尼
    '雅加达': 'YJD', 'Jakarta': 'YJD',
    // 菲律宾
    '马尼拉': 'MNL', 'Manila': 'MNL',
  };
  if (map[city]) return map[city];
  // 回退: 取前 3 个字符的大写
  const cleaned = city.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
  return cleaned.substring(0, 3).toUpperCase();
}

/**
 * 生成站点编码: SITE-{国家码}-{城市码}-{5位序号}
 * 自动查询数据库已有最大序号 +1；UNIQUE 冲突时递增重试
 */
async function generateSiteCode(country: string, city: string): Promise<string> {
  const countryCode = getCountryCode(country);
  const cityCode = getCityCode(city);
  const prefix = `SITE-${countryCode}-${cityCode}-`;

  const { data: existing } = await supabase
    .from('operation_sites')
    .select('site_code')
    .like('site_code', `${prefix}%`)
    .order('site_code', { ascending: false })
    .limit(1);

  let seq = 1;
  if (existing && existing.length > 0) {
    const lastCode: string = existing[0].site_code;
    const match = lastCode.match(/-(\d{5})$/);
    if (match) {
      seq = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(seq).padStart(5, '0')}`;
}

// --- /站点编码自动生成 ---

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { searchParams } = new URL(request.url)
    const fields = searchParams.get('fields')
    const compact = fields === 'dispatch'

    const adminClient = getSupabaseAdmin()

    if (compact) {
      // 派工模式：精简字段 + 后端计算剩余可派数量
      // 关键修复: remaining 只统计 battery_asset.battery_type 与站点 battery_type 匹配的已派工单元
      // 否则修改站点 battery_type 后，旧类型的已派工单元会错误拉低 remaining
      const [
        { data: sites, error: sitesErr },
        { data: dispatchedRows, error: dispErr },
      ] = await Promise.all([
        adminClient
          .from('operation_sites')
          .select('id, name, name_i18n, site_code, battery_type, city, battery_count')
          .order('created_at', { ascending: false }),
        adminClient
          .from('battery_units')
          .select('site_id, site_name, battery_assets!inner(battery_type)')
          .not('site_name', 'is', null),
      ])

      if (sitesErr) return serverError(sitesErr.message)
      if (dispErr) return serverError(dispErr.message)

      // 按 site_id → 该站点已派工的各类型电池数量
      // key: "site_id|battery_type" → count
      const dispatchedTypeMap: Record<string, number> = {}
      for (const row of (dispatchedRows || [])) {
        const sid = row.site_id as number
        const bt = (row.battery_assets as any)?.battery_type || ''
        if (!sid) continue
        const key = `${sid}|${bt}`
        dispatchedTypeMap[key] = (dispatchedTypeMap[key] || 0) + 1
      }

      const result = (sites || []).map((s: any) => {
        const siteBt = s.battery_type || ''
        const typeMatchKey = `${s.id}|${siteBt}`
        const dispatchedOfType = dispatchedTypeMap[typeMatchKey] || 0
        // resolve display_name from name_i18n (zh-CN first), fallback to name
        const i18n = s.name_i18n
        const displayName = (i18n && typeof i18n === 'object' && i18n['zh-CN']) || s.name || ''
        return {
          id: s.id,
          name: s.name,
          name_i18n: s.name_i18n,
          display_name: displayName,
          site_code: s.site_code,
          battery_type: s.battery_type,
          city: s.city,
          battery_count: s.battery_count,
          dispatched: dispatchedOfType,
          remaining: Math.max(0, (s.battery_count || 0) - dispatchedOfType),
        }
      })

      return ok(result)
    }

    const selectColumns = '*'

    const { data: sites, error } = await adminClient
      .from('operation_sites')
      .select(selectColumns)
      .order('created_at', { ascending: false })

    if (error) return serverError(error.message)

    return ok({ sites: sites || [] })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const formData = await request.formData()
    const name = formData.get('name') as string
    const country = formData.get('country') as string
    const city = formData.get('city') as string
    const address = formData.get('address') as string || null
    const longitude = formData.get('longitude') as string
    const latitude = formData.get('latitude') as string
    const battery_count = formData.get('battery_count') as string
    const status = formData.get('status') as string || 'active'
    const site_type = formData.get('site_type') as string || '标准站'
    const contact = formData.get('contact') as string || null
    const description = formData.get('description') as string || null
    const battery_type = formData.get('battery_type') as string || null
    const cabinet_slots = formData.get('cabinet_slots') as string || null
    const template_id = formData.get('template_id') as string || null
    const name_i18n_raw = formData.get('name_i18n') as string
    const country_i18n_raw = formData.get('country_i18n') as string
    const city_i18n_raw = formData.get('city_i18n') as string

    /** 安全解析 JSON 字符串，失败返回 null */
    const safeJsonParse = (v: string | null) => {
      if (!v) return null
      try { return JSON.parse(v) } catch { return null }
    }

    if (!name || !country || !city || !battery_count) {
      return badRequest('缺少必填字段: name, country, city, battery_count')
    }

    // 处理文件上传
    let image_url: string | null = null
    const image = formData.get('image') as File | null
    if (image && image.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'sites')
      await mkdir(uploadsDir, { recursive: true })
      const ext = path.extname(image.name) || '.jpg'
      const filename = `${randomUUID()}${ext}`
      const filePath = path.join(uploadsDir, filename)
      const buffer = Buffer.from(await image.arrayBuffer())
      await writeFile(filePath, buffer)
      image_url = `/uploads/sites/${filename}`
    }

    // 站点编码: 前端传了就用前端的，否则自动生成
    let site_code = (formData.get('site_code') as string) || null;
    if (!site_code) {
      site_code = await generateSiteCode(country, city);
    }

    const maxRetries = 10;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const insertData: any = {
        name, country, city,
        address: address || null,
        longitude: longitude ? parseFloat(longitude) : 0,
        latitude: latitude ? parseFloat(latitude) : 0,
        battery_count: parseInt(battery_count),
        status: status || 'active',
        site_code,
        site_type: site_type || null,
        contact: contact || null,
        description: description || null,
        battery_type: battery_type || null,
        cabinet_slots: cabinet_slots && cabinet_slots !== '' ? parseInt(cabinet_slots) : null,
        template_id: template_id || null,
        image_url: image_url || null,
        is_active: true,
        name_i18n: safeJsonParse(name_i18n_raw),
        country_i18n: safeJsonParse(country_i18n_raw),
        city_i18n: safeJsonParse(city_i18n_raw),
      }

      const adminClient = getSupabaseAdmin()
      const { data: site, error } = await adminClient
        .from('operation_sites')
        .insert(insertData)
        .select('*')
        .single()

      if (!error) {
        return ok({ message: '站点已创建', site }, 201)
      }

      // UNIQUE 冲突 (PostgreSQL code 23505) → 序号递增重试
      if (error.code === '23505' && site_code) {
        const parts = site_code.split('-');
        const lastPart = parts[parts.length - 1];
        const nextSeq = parseInt(lastPart, 10) + 1;
        parts[parts.length - 1] = String(nextSeq).padStart(5, '0');
        site_code = parts.join('-');
        continue;
      }

      return serverError(error.message);
    }

    return serverError('站点编码生成失败，请重试')
  } catch (e: any) {
    return serverError()
  }
}
