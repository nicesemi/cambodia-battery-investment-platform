import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { id } = await params
    const formData = await request.formData()

    const name = formData.get('name') as string
    const cabinet_count = formData.get('cabinet_count') as string
    const price = formData.get('price') as string
    const monthly_rent = formData.get('monthly_rent') as string
    const annual_roi = formData.get('annual_roi') as string
    const gps_lat = formData.get('gps_lat') as string
    const gps_lng = formData.get('gps_lng') as string
    const keep_image_url = formData.get('keep_image_url') as string

    const updates: any = {}
    if (name !== undefined && name !== null) updates.name = name.trim()
    if (cabinet_count !== undefined && cabinet_count !== null) updates.cabinet_count = parseInt(cabinet_count)
    if (price !== undefined && price !== null) updates.price = parseFloat(price)
    if (monthly_rent !== undefined && monthly_rent !== null) updates.monthly_rent = parseFloat(monthly_rent)
    if (annual_roi !== undefined && annual_roi !== null) updates.annual_roi = parseFloat(annual_roi)
    if (gps_lat !== undefined && gps_lat !== null) updates.gps_lat = gps_lat !== '' ? parseFloat(gps_lat) : null
    if (gps_lng !== undefined && gps_lng !== null) updates.gps_lng = gps_lng !== '' ? parseFloat(gps_lng) : null

    const image = formData.get('image') as File | null
    if (image && image.size > 0) {
      const adminClient = getSupabaseAdmin()
      const ext = image.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filename = `${Date.now()}-${randomUUID()}.${ext}`
      const buffer = Buffer.from(await image.arrayBuffer())

      const { error: uploadErr } = await adminClient.storage
        .from('public-assets')
        .upload(`swap-stations/${filename}`, buffer, {
          contentType: image.type,
          upsert: false
        })

      if (uploadErr) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'swap-stations')
        await mkdir(uploadsDir, { recursive: true })
        const filePath = path.join(uploadsDir, filename)
        await writeFile(filePath, buffer)
        updates.image_url = `/uploads/swap-stations/${filename}`
      } else {
        const { data: urlData } = adminClient.storage
          .from('public-assets')
          .getPublicUrl(`swap-stations/${filename}`)
        updates.image_url = urlData.publicUrl
      }
    } else if (keep_image_url) {
      updates.image_url = keep_image_url
    }

    if (Object.keys(updates).length === 0) return badRequest('No fields to update')

    updates.updated_at = new Date().toISOString()

    const adminClient = getSupabaseAdmin()
    const { data: template, error } = await adminClient
      .from('swap_station_templates')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!template) return notFound('模板不存在')

    return ok({ message: '模板已更新', template })
  } catch (e: any) {
    return serverError()
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const { id } = await params
    const adminClient = getSupabaseAdmin()
    const { data: template, error } = await adminClient
      .from('swap_station_templates')
      .delete()
      .eq('id', id)
      .select('*')
      .single()

    if (error) return serverError(error.message)
    if (!template) return notFound('模板不存在')

    return ok({ message: '模板已删除', template })
  } catch (e: any) {
    return serverError()
  }
}
