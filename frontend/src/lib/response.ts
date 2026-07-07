import { NextResponse } from 'next/server'

export function ok(data: unknown, options?: number | { status?: number; headers?: Record<string, string> }) {
  if (typeof options === 'number') {
    return NextResponse.json(data, { status: options })
  }
  const { status = 200, headers } = options || {}
  return NextResponse.json(data, { status, headers })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}
