import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const AGNES_KEY = 'sk-XZwfYeJy7DCgpo7h5DerZ3J4HzbcpRws52GL1WArmhC5pcZP'
const AGNES_URL = 'https://apihub.agnes-ai.com/v1/chat/completions'

const FRANCHISE_KNOWLEDGE = `
## 1kwh 换电平台加盟体系

### 三级加盟商体系

| 级别 | 加盟费 | 保证金 | 业绩目标 | 分成比例 | 区域保护 |
|------|--------|--------|----------|----------|----------|
| 省级总代理 | $68,966 | $27,586 | $1,379,310/月 | 自销佣金5%+租金5%，本省门店销售抽成2%+租金分成2% | 全省独家 |
| 市级加盟商 | $27,586 | $6,897 | $689,655/月 | 自销佣金5%+租金5%，本市门店销售抽成3%+租金分成3% | 全市独家 |
| 区县级门店 | $6,897 | $1,379 | $137,931/月 | 自销佣金5%+租金5% | 全区/县独家 |

- 保证金退还：达成对应级别业绩目标后，加盟商可申请退还保证金
- 省级代理达标线 $1,379,310，市级 $689,655，区县门店 $137,931

### 收益分成比例体系

- 投资者：租赁收入70%，新客销售佣金—
- 1kwh总部：租赁收入20%，负责品牌运营、电费运维、平台技术、风控保险
- 省级总代理：租赁收入2%，新客销售佣金2%，负责省域渠道管理、区域招商拓展、下级门店督导
- 市级加盟商：租赁收入3%，新客销售佣金3%，负责市域门店运营、本地市场推广、下级门店管理
- 区县级门店：租赁收入5%，新客销售佣金5%，负责一线销售服务、客户关系维护、电池配送换电

### 加盟商核心权益

1. 客户关系保护：引导的客户终身绑定，享受长期被动收入。帮助投资人注册并绑定门店后，该投资人所有交易的佣金归当前门店的上级
2. 区域保护：各级别加盟商享有专属区域保护，避免恶性竞争。同一城市相邻门店距离不少于5公里
3. 大客户折扣：达到级别业绩目标的加盟商享有电池资产批发大客户折扣
4. 品牌支持：1kwh提供统一品牌物料、线上引流导客、门店运营培训
5. 技术支持：提供智能换电柜设备、电池资产管理平台、物联网监控系统

### 开店条件

1. 具备合法经营主体资格（个体工商户或企业法人）
2. 店铺面积不少于30平方米（区县级）/ 50平方米（市级）/ 100平方米（省级）
3. 店铺位置位于商业区或人流密集区域
4. 具备一定资金实力，能承担加盟费、保证金及运营成本
5. 认同1kwh品牌理念，接受统一管理和培训

### 电池产品线

1. 标准型电池 60V20Ah：续航60-80km，适合日常通勤，租赁价$15/月
2. 长续航电池 72V30Ah：续航90-120km，适合外卖配送，租赁价$25/月
3. 快充型电池 60V40Ah：支持快充30分钟80%，续航100-130km，租赁价$35/月

### 风控保障

1. 电池保险：每块电池均投保财产险，意外损坏由保险公司赔付
2. 保证金监管：加盟商保证金由第三方银行监管，保障资金安全
3. 运营监控：物联网实时监控电池状态、位置、健康度
4. 合规经营：所有加盟门店须依法办理营业执照及相关许可

### 加盟流程

1. 提交加盟申请（线上填写地区、门店信息）
2. 资质审核（1-3个工作日）
3. 签订加盟合同（电子签约）
4. 缴纳加盟费及保证金
5. 门店装修及设备安装（总部指导）
6. 员工培训（线上+线下）
7. 正式开业运营
`

/**
 * POST /api/advisor/franchisee
 * 加盟专属 AI 顾问，使用 Agnes LLM 流式回答
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = body.messages || []

    if (!messages.length) {
      return new Response('messages 不能为空', { status: 400 })
    }

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const question = (lastUserMsg?.content || '').trim()

    if (!question) {
      return new Response('question 不能为空', { status: 400 })
    }

    // 查询平台当前数据作为上下文
    const sb = getSupabaseAdmin()
    const { count: storeCount } = await sb.from('franchisee_stores').select('*', { count: 'exact', head: true })
    const { count: userCount } = await sb.from('users').select('*', { count: 'exact', head: true })
    const { count: agentCount } = await sb.from('agent_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved')

    const liveData = `平台当前数据：${storeCount} 家门店，${userCount} 名用户，${agentCount} 名已认证加盟商`

    const systemPrompt = `你是1kwh换电投资平台的加盟专属顾问，专门为潜在加盟商解答问题。

${FRANCHISE_KNOWLEDGE}

${liveData}

回答规则：
1. 每个要点独占一行，用 "- " 开头，行与行之间空一行，段落之间空两行
2. 涉及金额时同时显示 USD 和 CNY，汇率按 1 USD = 7.25 CNY，格式：**$xxx**（≈ ¥xxx）
3. 对比数据优先使用表格，表格前后各留一空行
4. 如果用户问题超出知识库范围，诚实说明并提供联系方式：contact@1kwh.store
5. 不要编造知识库中没有的数据
6. 回答控制在400字以内，核心数据用**加粗**突出
7. 禁止使用连续大段文字，必须分段分行，保持视觉呼吸感`

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    const agnesRes = await fetch(AGNES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGNES_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'agnes-1.5-flash',
        messages: apiMessages,
        stream: true,
        temperature: 0.5,
        max_tokens: 1024,
      }),
    })

    if (!agnesRes.ok) {
      const errText = await agnesRes.text()
      console.error('[franchisee-advisor] Agnes error:', agnesRes.status, errText)
      return new Response('AI 服务暂时不可用', { status: 502 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = agnesRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue
              const jsonStr = trimmed.slice(6)
              if (jsonStr === '[DONE]') continue

              try {
                const parsed = JSON.parse(jsonStr)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(encoder.encode(content))
                }
              } catch {
                // skip parse errors
              }
            }
          }
        } catch (e) {
          console.error('[franchisee-advisor] stream error:', e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e: any) {
    console.error('[franchisee-advisor]', e)
    return new Response('查询失败，请稍后再试', { status: 500 })
  }
}
