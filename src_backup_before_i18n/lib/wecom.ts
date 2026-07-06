/**
 * 企业微信机器人 Webhook 通知
 * Webhook URL 从环境变量 WECOM_WEBHOOK_URL 读取
 */

const WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL || '';

export async function sendWecomMessage(content: string): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.log('[WeCom] Webhook URL not configured, skip');
    return false;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { content },
      }),
    });
    const data = await res.json();
    if (data.errcode === 0) {
      console.log('[WeCom] Message sent successfully');
      return true;
    } else {
      console.error('[WeCom] Send failed:', data);
      return false;
    }
  } catch (e) {
    console.error('[WeCom] Send error:', e);
    return false;
  }
}

/**
 * 生成派工通知消息（Markdown 格式）
 */
export function buildDispatchMessage(params: {
  workerName: string;
  workerPhone: string;
  workerCode?: string;
  batteryList: Array<{ unit_code: string; site_name: string; asset_name: string; longitude?: number | null; latitude?: number | null }>;
}): string {
  const { workerName, workerPhone, workerCode, batteryList } = params;
  const code = workerCode ? ` (${workerCode})` : '';
  const batteryLines = batteryList
    .map((b, i) => {
      let line = `${i + 1}. **${b.unit_code || '-'}** — ${b.asset_name || '-'}（${b.site_name || '-'}）`;
      if (b.longitude != null && b.latitude != null) {
        line += ` — [导航](https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude})`;
      }
      return line;
    })
    .join('\n');

  return `## 🔧 新派工通知\n\n**派发对象**：${workerName}${code}\n**联系电话**：${workerPhone}\n**派发数量**：${batteryList.length} 个\n\n### 电池明细\n${batteryLines}\n\n> 请及时处理派工任务`;
}
