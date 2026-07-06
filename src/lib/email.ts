import nodemailer from 'nodemailer';
import { execSync } from 'child_process';

function getEmailPass(): string {
  // 优先从环境变量读取，否则从 macOS 钥匙串读取
  if (process.env.EMAIL_PASS) return process.env.EMAIL_PASS;
  try {
    return execSync(
      'security find-generic-password -s "1kwh-smtp" -a "mail@1kwh.store" -w',
      { encoding: 'utf-8' }
    ).trim();
  } catch {
    return '';
  }
}

const emailPort = parseInt(process.env.EMAIL_PORT || '465', 10);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.exmail.qq.com',
  port: emailPort,
  secure: emailPort === 465,
  auth: {
    user: process.env.EMAIL_USER || 'mail@1kwh.store',
    pass: getEmailPass(),
  },
});

export async function sendVerificationEmail(email: string, code: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">邮箱验证码</h2>
      <p style="color: #666;">您正在进行邮箱验证，验证码如下：</p>
      <div style="font-size: 32px; font-weight: bold; color: #4F46E5; padding: 20px; background: #F3F4F6; text-align: center; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #999; font-size: 14px;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
      <p style="color: #999; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
    </div>
  `;

  return sendEmail(email, '邮箱验证码 - 电池投资平台', html);
}

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_USER || 'mail@1kwh.store';
  const info = await transporter.sendMail({ from, to, subject, html });
  return info;
}
