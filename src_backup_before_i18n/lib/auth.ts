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
  agent_type?: string | null
  email_verified?: boolean
  certification_status?: string
  rejection_reason?: string | null
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
      .select('id, email, username, role, is_active, agent_type, email_verified, certification_status, rejection_reason')
      .eq('id', userId)
      .single()

    if (error || !user || !user.is_active) return null
    return user as UserPayload
  } catch {
    return null
  }
}

// requireVerified: checks that certification_status is not 'unverified'
// kyc_rejected users are allowed through (they can view profile/dashboard but not invest)
// Returns null if user is verified, returns a 403 Response if not
export function requireVerified(user: UserPayload): Response | null {
  if (!user.certification_status || user.certification_status === 'unverified') {
    return Response.json(
      { error: '请先完成邮箱认证和实名认证', code: 'NOT_VERIFIED' },
      { status: 403 }
    )
  }
  return null
}

// requireKycNotRejected: blocks users whose certification was rejected
// Use this for investment/transaction endpoints
// Returns null if not rejected, returns a 403 Response if rejected
export function requireKycNotRejected(user: UserPayload): Response | null {
  if (user.certification_status === 'kyc_rejected') {
    return Response.json(
      { error: '您的实名认证已被驳回，请查看驳回意见后重新提交', code: 'KYC_REJECTED' },
      { status: 403 }
    )
  }
  return null
}

// requireEmailVerified: checks that email_verified === true
// Returns null if verified, returns a 403 Response if not
export function requireEmailVerified(user: UserPayload): Response | null {
  if (!user.email_verified) {
    return Response.json(
      { error: '请先完成邮箱认证', code: 'EMAIL_NOT_VERIFIED' },
      { status: 403 }
    )
  }
  return null
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
