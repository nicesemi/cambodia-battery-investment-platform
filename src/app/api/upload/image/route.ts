import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { unauthorized, badRequest, serverError, ok } from '@/lib/response'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const THUMB_WIDTH = 200

async function generateThumbnail(buffer: Buffer, contentType: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(buffer)
    .resize(THUMB_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()
}

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin only')

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return badRequest('请选择要上传的图片')
    if (!ALLOWED_TYPES.includes(file.type)) return badRequest('仅支持 PNG / JPEG / WebP / GIF 图片格式')
    if (file.size > MAX_SIZE) return badRequest('图片大小不能超过 10MB')

    const supabaseAdmin = getSupabaseAdmin()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const originalPath = `battery-types/${baseName}.${ext}`
    const thumbPath = `battery-types/thumb/${baseName}.jpg`

    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // Upload original
    const { error: origErr } = await supabaseAdmin.storage
      .from('battery-images')
      .upload(originalPath, originalBuffer, {
        contentType: file.type,
        upsert: false
      })
    if (origErr) return serverError(origErr.message)

    // Generate & upload thumbnail
    let thumbnailUrl = ''
    try {
      const thumbBuffer = await generateThumbnail(originalBuffer, file.type)
      const { error: thumbErr } = await supabaseAdmin.storage
        .from('battery-images')
        .upload(thumbPath, thumbBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })
      if (!thumbErr) {
        const { data: thumbData } = supabaseAdmin.storage
          .from('battery-images')
          .getPublicUrl(thumbPath)
        thumbnailUrl = thumbData.publicUrl
      }
    } catch { /* thumbnail generation failed, non-blocking */ }

    const { data: urlData } = supabaseAdmin.storage
      .from('battery-images')
      .getPublicUrl(originalPath)

    return ok({ url: urlData.publicUrl, path: originalPath, thumbnail_url: thumbnailUrl, thumbnail_path: thumbPath })
  } catch (e: any) {
    return serverError()
  }
}
