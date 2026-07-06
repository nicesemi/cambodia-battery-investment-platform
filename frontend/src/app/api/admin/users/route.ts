import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || (user.role !== 'admin' && user.role !== 'operator')) return unauthorized('Admin or operator only')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    let query = supabase.from('users').select('id, email, username, full_name, phone, role, agent_type, kyc_status, certification_status, id_card_front_url, id_card_back_url, business_license_url, is_active, total_investment, total_dividends, investor_code, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`)

    const { data: users, count, error } = await query
    if (error) return serverError(error.message)

    return ok({ users: users || [], total: count || 0, page, limit })
  } catch (e: any) {
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authenticateToken(request)
    if (!admin || admin.role !== 'admin') return unauthorized('Admin only')

    const body = await request.json()
    const { email, username, password, fullName, phone } = body

    if (!email || !username || !password) {
      return badRequest('Missing required fields: email, username, password')
    }

    // Only one operator allowed
    const { data: existingOp } = await supabase.from('users').select('id').eq('role', 'operator').limit(1)
    if (existingOp && existingOp.length > 0) {
      return badRequest('Operator account already exists. Only one operator is allowed.')
    }

    // Check existing user
    const { data: existing } = await supabase.from('users').select('id').or(`email.eq.${email},username.eq.${username}`).limit(1)
    if (existing && existing.length > 0) {
      return badRequest('Email or username already exists')
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const { data: newUser, error } = await supabase.from('users').insert({
      email, username, password_hash: passwordHash,
      full_name: fullName || '', phone: phone || '', role: 'operator'
    }).select('id, email, username, full_name, role, created_at').single()

    if (error) return serverError(error.message)

    return ok({ user: newUser })
  } catch (e: any) {
    return serverError()
  }
}
