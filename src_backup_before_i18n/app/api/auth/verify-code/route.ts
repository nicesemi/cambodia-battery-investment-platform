import { getSupabaseAdmin } from '@/lib/supabase';
import { authenticateToken } from '@/lib/auth';
import { ok, badRequest, unauthorized, serverError } from '@/lib/response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return badRequest('请输入6位验证码');
    }

    const adminClient = getSupabaseAdmin();

    const { data: profile } = await adminClient
      .from('users')
      .select('verification_code, verification_code_expires, email_verified')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return unauthorized('用户不存在');
    }

    if (profile.email_verified) {
      return ok({ message: '邮箱已验证' });
    }

    if (!profile.verification_code) {
      return badRequest('请先发送验证码');
    }

    if (profile.verification_code !== code) {
      return badRequest('验证码错误');
    }

    // Check expiration
    if (profile.verification_code_expires) {
      const expiresAt = new Date(profile.verification_code_expires).getTime();
      if (Date.now() > expiresAt) {
        return badRequest('验证码已过期，请重新发送');
      }
    }

    // Update user: mark email verified, clear code, update certification status
    await adminClient
      .from('users')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires: null,
        certification_status: 'email_verified',
      })
      .eq('id', user.id);

    return ok({ message: '邮箱验证成功' });
  } catch (e: any) {
    console.error('Verify code error:', e);
    return serverError(e.message || '验证失败');
  }
}
