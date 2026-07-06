import { getSupabaseAdmin } from '@/lib/supabase';
import { authenticateToken } from '@/lib/auth';
import { ok, unauthorized, serverError } from '@/lib/response';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request);
    if (!user) return unauthorized();

    const adminClient = getSupabaseAdmin();

    const { data: profile } = await adminClient
      .from('users')
      .select('email_verified, email')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return unauthorized('用户邮箱不存在');
    }

    if (profile.email_verified) {
      return ok({ message: '邮箱已认证，无需重复发送' });
    }

    // Generate 6-digit verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save code to database
    await adminClient
      .from('users')
      .update({
        verification_code: code,
        verification_code_expires: expires,
      })
      .eq('id', user.id);

    // Send email
    await sendVerificationEmail(profile.email, code);

    return ok({ message: '验证码已发送' });
  } catch (e: any) {
    console.error('Send code error:', e);
    return serverError(e.message || '发送验证码失败');
  }
}
