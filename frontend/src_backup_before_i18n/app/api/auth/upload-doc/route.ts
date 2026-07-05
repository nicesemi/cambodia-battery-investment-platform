import { getSupabaseAdmin } from '@/lib/supabase';
import { authenticateToken } from '@/lib/auth';
import { ok, badRequest, unauthorized, serverError } from '@/lib/response';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_DOC_TYPES = ['id_card_front', 'id_card_back', 'business_license'];

export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request);
    if (!user) return unauthorized();

    const formData = await request.formData();
    const docType = formData.get('docType') as string;
    const file = formData.get('file') as File | null;

    if (!docType || !VALID_DOC_TYPES.includes(docType)) {
      return badRequest('无效的文档类型，仅支持: id_card_front, id_card_back, business_license');
    }

    if (!file) {
      return badRequest('请上传文件');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest('仅支持 JPG、PNG、WebP 格式');
    }

    if (file.size > MAX_SIZE) {
      return badRequest('文件大小不能超过 5MB');
    }

    const adminClient = getSupabaseAdmin();
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const storagePath = `${user.id}/${docType}_${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await adminClient
      .storage
      .from('kyc-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      return serverError('文件上传失败: ' + uploadErr.message);
    }

    // Get public URL
    const { data: urlData } = adminClient
      .storage
      .from('kyc-documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || '';

    // Map docType to db column
    const fieldMap: Record<string, string> = {
      id_card_front: 'id_card_front_url',
      id_card_back: 'id_card_back_url',
      business_license: 'business_license_url',
    };

    const dbField = fieldMap[docType];

    // Update user record
    const updateData: Record<string, any> = { [dbField]: fileUrl };

    // Determine certification status update
    if (docType === 'id_card_front' || docType === 'id_card_back') {
      // Check if both front and back are uploaded
      const { data: currentUser } = await adminClient
        .from('users')
        .select('id_card_front_url, id_card_back_url, role, rejection_reason')
        .eq('id', user.id)
        .single();

      const hasFront = docType === 'id_card_front' ? true : !!currentUser?.id_card_front_url;
      const hasBack = docType === 'id_card_back' ? true : !!currentUser?.id_card_back_url;

      if (hasFront && hasBack) {
        updateData.certification_status = 'kyc_submitted';
        updateData.rejection_reason = null;
      }
    } else if (docType === 'business_license') {
      // If franchisee, mark as business_verified
      const { data: currentUser } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (currentUser?.role === 'franchisee') {
        updateData.certification_status = 'kyc_submitted';
        updateData.rejection_reason = null;
      }
    }

    const { error: updateErr } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateErr) {
      console.error('Update user error:', updateErr);
      return serverError('更新用户信息失败');
    }

    return ok({
      message: '文件上传成功',
      docType,
      url: fileUrl,
    });
  } catch (e: any) {
    console.error('Upload doc error:', e);
    return serverError(e.message || '上传失败');
  }
}
