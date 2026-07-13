import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { supabase } from '@/lib/supabase'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    if (!email || !password) return badRequest('Email and password required')

    const { data: user, error } = await supabase.from('users')
      .select('id, email, username, password_hash, full_name, role, is_active, agent_type, kyc_status, certification_status')
      .eq('email', email).single()

    if (error || !user) return unauthorized('Invalid email or password')
    if (!user.is_active) return unauthorized('Account is disabled')

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return unauthorized('Invalid email or password')

    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'battery-investment-platform-jwt-secret-key-2024')
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    return ok({ message: 'Login successful', token, user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name, role: user.role, agentType: user.agent_type || null, kyc_status: user.kyc_status || null, certification_status: user.certification_status || null } })
  } catch (e: any) {
    console.error('Login error:', e.message)
    return serverError()
  }
}
