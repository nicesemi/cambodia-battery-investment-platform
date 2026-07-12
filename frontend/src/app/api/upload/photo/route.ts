import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return badRequest('缺少文件')
    if (!ALLOWED_TYPES.includes(file.type)) return badRequest('仅支持 PNG / JPEG / WebP / GIF 图片格式')
    if (file.size > MAX_SIZE) return badRequest('图片大小不能超过 10MB')

    const supabaseAdmin = getSupabaseAdmin()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `store-photos/store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('battery-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadErr) {
      console.error('Supabase storage upload failed:', uploadErr.message)
      return serverError(uploadErr.message)
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('battery-images')
      .getPublicUrl(filename)

    return ok({ url: urlData.publicUrl })
  } catch (e: any) {
    console.error('Upload error:', e)
    return serverError()
  }
}
