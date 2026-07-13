import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { siteId } = await params
    const id = parseInt(siteId, 10)
    if (isNaN(id)) return badRequest('无效的站点ID')
    const formData = await request.formData()

    const name = formData.get('name') as string
    const country = formData.get('country') as string
    const city = formData.get('city') as string
    const address = formData.get('address') as string
    const longitude = formData.get('longitude') as string
    const latitude = formData.get('latitude') as string
    const battery_count = formData.get('battery_count') as string
    const status = formData.get('status') as string
    const site_type = formData.get('site_type') as string
    const site_code = formData.get('site_code') as string
    const contact = formData.get('contact') as string
    const description = formData.get('description') as string
    const battery_type = formData.get('battery_type') as string
    const cabinet_slots = formData.get('cabinet_slots') as string
    const template_id = formData.get('template_id') as string
    const keep_image_url = formData.get('keep_image_url') as string
    const name_i18n = formData.get('name_i18n') as string
    const country_i18n = formData.get('country_i18n') as string
    const city_i18n = formData.get('city_i18n') as string

    /** 安全解析 JSON 字符串，失败返回 null */
    const safeJsonParse = (v: string | null) => {
      if (!v) return null
      try { return JSON.parse(v) } catch { return null }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (country !== undefined) updates.country = country
    if (city !== undefined) updates.city = city
    if (address !== undefined) updates.address = address || null
    if (longitude !== undefined) updates.longitude = longitude ? parseFloat(longitude) : null
    if (latitude !== undefined) updates.latitude = latitude ? parseFloat(latitude) : null
    if (battery_count !== undefined) updates.battery_count = parseInt(battery_count)
    if (status !== undefined) updates.status = status
    if (site_type !== undefined) updates.site_type = site_type
    if (site_code !== undefined) updates.site_code = site_code || null
    if (contact !== undefined) updates.contact = contact || null
    if (description !== undefined) updates.description = description || null
    if (battery_type !== undefined) updates.battery_type = battery_type || null
    if (cabinet_slots !== undefined) updates.cabinet_slots = cabinet_slots && cabinet_slots !== '' ? parseInt(cabinet_slots) : null
    if (template_id !== undefined) updates.template_id = template_id || null
    if (name_i18n !== undefined) updates.name_i18n = safeJsonParse(name_i18n)
    if (country_i18n !== undefined) updates.country_i18n = safeJsonParse(country_i18n)
    if (city_i18n !== undefined) updates.city_i18n = safeJsonParse(city_i18n)

    // 处理文件上传
    const image = formData.get('image') as File | null
    if (image && image.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'sites')
      await mkdir(uploadsDir, { recursive: true })
      const ext = path.extname(image.name) || '.jpg'
      const filename = `${randomUUID()}${ext}`
      const filePath = path.join(uploadsDir, filename)
      const buffer = Buffer.from(await image.arrayBuffer())
      await writeFile(filePath, buffer)
      updates.image_url = `/uploads/sites/${filename}`
    } else if (keep_image_url) {
      updates.image_url = keep_image_url
    }

    if (Object.keys(updates).length === 0) return badRequest('No fields to update')

    const adminClient = getSupabaseAdmin()
    const { data: site, error } = await adminClient
      .from('operation_sites')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!site) return notFound('站点不存在')

    return ok({ message: '站点已更新', site })
  } catch (e: any) {
    return serverError()
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { siteId } = await params
    const id = parseInt(siteId, 10)
    if (isNaN(id)) return badRequest('无效的站点ID')
    const adminClient = getSupabaseAdmin()
    const { data: site, error } = await adminClient
      .from('operation_sites')
      .delete()
      .eq('id', id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!site) return notFound('站点不存在')

    return ok({ message: '站点已删除', site })
  } catch (e: any) {
    return serverError()
  }
}
