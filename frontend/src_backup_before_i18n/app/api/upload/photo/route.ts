import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return serverError('缺少文件')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    const url = `/api/uploads/${filename}`
    return ok({ url })
  } catch (e: any) {
    console.error('Upload error:', e)
    return serverError()
  }
}
