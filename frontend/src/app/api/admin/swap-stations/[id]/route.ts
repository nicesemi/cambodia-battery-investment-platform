import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, notFound, serverError } from '@/lib/response'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

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
        .from('battery-images')
        .upload(`swap-stations/${filename}`, buffer, {
          contentType: image.type,
          upsert: false
        })

      if (uploadErr) {
        console.error('Supabase storage upload failed:', uploadErr.message);
        return NextResponse.json({ error: '图片上传失败，请重试' }, { status: 500 });
      } else {
        const { data: urlData } = adminClient.storage
          .from('battery-images')
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
  } catch (err) {
    console.error('PUT swap-station error:', err);
    return NextResponse.json({ error: '更新模板失败: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
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
