import { jwtVerify } from 'jose'
import { supabase } from './supabase'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'battery-investment-platform-jwt-secret-key-2024'
)

export interface UserPayload {
  id: string
  email: string
  username: string
  role: string
  is_active: boolean
  agent_type?: string | null // 'province_agent' | 'city_franchisee' | null
}

export async function authenticateToken(request: Request): Promise<UserPayload | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, role, is_active, agent_type')
      .eq('id', userId)
      .single()

    if (error || !user || !user.is_active) return null
    return user as UserPayload
  } catch {
    return null
  }
}

export type UserRole = 'admin' | 'operator' | 'investor' | 'franchisee'

export function hasRole(user: UserPayload, ...roles: string[]): boolean {
  return roles.includes(user.role)
}

export function requireAdmin(user: UserPayload): boolean {
  return user.role === 'admin'
}

export function requireOperator(user: UserPayload): boolean {
  return user.role === 'operator'
}

export function requireAdminOrOperator(user: UserPayload): boolean {
  return user.role === 'admin' || user.role === 'operator'
}
