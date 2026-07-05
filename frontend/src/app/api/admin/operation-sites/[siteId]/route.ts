import { supabase } from '@/lib/supabase'
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
    const keep_image_url = formData.get('keep_image_url') as string

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (country !== undefined) updates.country = country
    if (city !== undefined) updates.city = city
    if (address !== undefined) updates.address = address || null
    if (longitude !== undefined) updates.longitude = parseFloat(longitude)
    if (latitude !== undefined) updates.latitude = parseFloat(latitude)
    if (battery_count !== undefined) updates.battery_count = parseInt(battery_count)
    if (status !== undefined) updates.status = status
    if (site_type !== undefined) updates.site_type = site_type
    if (site_code !== undefined) updates.site_code = site_code || null
    if (contact !== undefined) updates.contact = contact || null
    if (description !== undefined) updates.description = description || null
    if (battery_type !== undefined) updates.battery_type = battery_type || null
    if (cabinet_slots !== undefined) updates.cabinet_slots = cabinet_slots && cabinet_slots !== '' ? parseInt(cabinet_slots) : null

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

    const { data: site, error } = await supabase
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
    const { data: site, error } = await supabase
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
