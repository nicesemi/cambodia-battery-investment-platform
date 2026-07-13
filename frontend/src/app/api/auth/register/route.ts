import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { supabase } from '@/lib/supabase'
import { badRequest, ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, username, password, fullName, phone, role } = body

    if (!email || !username || !password) {
      return badRequest('Missing required fields: email, username, password')
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return badRequest('Invalid email format')
    }
    if (username.length < 3 || password.length < 6) {
      return badRequest('Username min 3 chars, password min 6 chars')
    }

    // Public registration: only investor or franchisee
    const userRole = role || 'investor'
    if (!['investor', 'franchisee'].includes(userRole)) {
      return badRequest('Invalid role for public registration')
    }

    // Check existing
    const { data: existing } = await supabase.from('users').select('id').or(`email.eq.${email},username.eq.${username}`).limit(1)
    if (existing && existing.length > 0) {
      return badRequest('Email or username already exists')
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const { data: user, error } = await supabase.from('users').insert({
      email, username, password_hash: passwordHash,
      full_name: fullName || '', phone: phone || '', role: userRole
    }).select('id, email, username, full_name, role, created_at').single()

    if (error) return badRequest(error.message)

    // Create wallet (upsert to avoid duplicate rows)
    await supabase.from('user_wallets').upsert(
      { user_id: user.id, balance: 0, currency: 'USD' },
      { onConflict: 'user_id, currency', ignoreDuplicates: true }
    )

    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'battery-investment-platform-jwt-secret-key-2024')
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    return ok({ message: 'Registration successful', token, user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name, role: user.role } }, 201)
  } catch (e: any) {
    console.error('Register error:', e)
    return serverError()
  }
}
