import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('swap_station_templates')
      .select('*')
      .order('cabinet_count', { ascending: true })

    if (error) return serverError(error.message)
    return ok({ templates: data || [] })
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
    const cabinet_count = formData.get('cabinet_count') as string
    const price = formData.get('price') as string
    const monthly_rent = formData.get('monthly_rent') as string
    const annual_roi = formData.get('annual_roi') as string
    const gps_lat = formData.get('gps_lat') as string
    const gps_lng = formData.get('gps_lng') as string
    const name_i18n = formData.get('name_i18n') as string

    if (!name || !cabinet_count || !price) {
      return badRequest('缺少必填字段: name, cabinet_count, price')
    }

    let image_url: string | null = null
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
        image_url = urlData.publicUrl
      }
    }

    const priceVal = parseFloat(price)
    const monthlyRentVal = monthly_rent ? parseFloat(monthly_rent) : 0
    let annualRoiVal = annual_roi ? parseFloat(annual_roi) : 0
    if (annualRoiVal === 0 && priceVal > 0 && monthlyRentVal > 0) {
      annualRoiVal = parseFloat(((monthlyRentVal * 12 / priceVal) * 100).toFixed(1))
    }

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('swap_station_templates')
      .insert({
        name: name.trim(),
        name_i18n: name_i18n ? JSON.parse(name_i18n) : null,
        cabinet_count: parseInt(cabinet_count),
        price: priceVal,
        monthly_rent: monthlyRentVal,
        annual_roi: annualRoiVal,
        image_url,
        gps_lat: gps_lat ? parseFloat(gps_lat) : null,
        gps_lng: gps_lng ? parseFloat(gps_lng) : null,
      })
      .select('*')
      .single()

    if (error) return serverError(error.message)
    return ok({ message: '模板已创建', template: data }, 201)
  } catch (e: any) {
    console.error('POST swap-station error:', e);
    return NextResponse.json({ error: '创建模板失败: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
