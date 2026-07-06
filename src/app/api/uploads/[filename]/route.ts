import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const filepath = join(process.cwd(), 'public', 'uploads', filename)

  // 防止路径遍历
  if (!filepath.startsWith(join(process.cwd(), 'public', 'uploads'))) {
    return new Response('Not Found', { status: 404 })
  }

  if (!existsSync(filepath)) {
    return new Response('Not Found', { status: 404 })
  }

  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const contentType = MIME[ext] || 'application/octet-stream'

  const buffer = await readFile(filepath)

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
