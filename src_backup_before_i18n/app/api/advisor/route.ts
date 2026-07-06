import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const AGNES_KEY = 'sk-XZwfYeJy7DCgpo7h5DerZ3J4HzbcpRws52GL1WArmhC5pcZP'
const AGNES_URL = 'https://apihub.agnes-ai.com/v1/chat/completions'

async function querySupabase(question: string) {
  const sb = getSupabaseAdmin()
  const q = question.toLowerCase()

  const isStore    = /店铺|门店|加盟|store|franchise/.test(q)
  const isUser     = /用户|会员|投资人|加盟商|user|member|investor/.test(q)
  const isBattery  = /电池|资产|换电|battery|asset/.test(q)
  const isTrade    = /交易|买卖|订单|trade|order/.test(q)
  const isDividend = /分红|dividend/.test(q)
  const isProfit   = /利润|业绩|profit|performance/.test(q) && !isDividend
  const isWallet   = /钱包|余额|充值|提现|wallet|balance|deposit|withdraw/.test(q)
  const isWorker   = /工人|员工|worker|staff/.test(q)
  const isAgent    = /代理商|代理申请|agent/.test(q)

  let data: any = {}
  let intentLabel = ''

  if (isStore) {
    const { count: total } = await sb.from('franchisee_stores').select('*', { count: 'exact', head: true })
    const { count: active } = await sb.from('franchisee_stores').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { count: pending } = await sb.from('franchisee_stores').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { data: byType } = await sb.from('franchisee_stores').select('store_type').limit(1000)
    const typeCounts: Record<string, number> = {}
    ;(byType || []).forEach((r: any) => { typeCounts[r.store_type] = (typeCounts[r.store_type] || 0) + 1 })
    data = { total, active, pending, typeCounts }
    intentLabel = '门店'
  } else if (isUser) {
    const { count: total } = await sb.from('users').select('*', { count: 'exact', head: true })
    const { count: investors } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'investor')
    const { count: franchisees } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'franchisee')
    const { count: admins } = await sb.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin','operator'])
    const { data: recent } = await sb.from('users').select('username,role,created_at').order('created_at', { ascending: false }).limit(5)
    data = { total, investors, franchisees, admins, recent }
    intentLabel = '用户'
  } else if (isBattery) {
    const { count: totalAssets } = await sb.from('battery_assets').select('*', { count: 'exact', head: true })
    const { count: available } = await sb.from('battery_assets').select('*', { count: 'exact', head: true }).eq('status', 'available')
    const { count: inUse } = await sb.from('battery_assets').select('*', { count: 'exact', head: true }).eq('status', 'in_use')
    const { count: totalUnits } = await sb.from('battery_units').select('*', { count: 'exact', head: true })
    const { data: types } = await sb.from('battery_types').select('name,capacity_wh,max_daily_orders').limit(100)
    data = { totalAssets, available, inUse, totalUnits, types }
    intentLabel = '电池'
  } else if (isTrade) {
    const { count: totalRecords } = await sb.from('trade_records').select('*', { count: 'exact', head: true })
    const { count: totalOrders } = await sb.from('trade_orders').select('*', { count: 'exact', head: true })
    const { data: recentRecords } = await sb.from('trade_records').select('id,order_id,total_price,status,created_at').order('created_at', { ascending: false }).limit(5)
    const { data: sumData } = await sb.from('trade_records').select('total_price').limit(10000)
    const totalAmount = (sumData || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0)
    data = { totalRecords, totalOrders, totalAmount, recentRecords }
    intentLabel = '交易'
  } else if (isDividend) {
    const { count: total } = await sb.from('dividend_records').select('*', { count: 'exact', head: true })
    const { data: sumData } = await sb.from('dividend_records').select('amount').limit(10000)
    const totalAmount = (sumData || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
    const { data: recent } = await sb.from('dividend_records').select('id,user_id,amount,status,created_at').order('created_at', { ascending: false }).limit(5)
    data = { total, totalAmount, recent }
    intentLabel = '分红'
  } else if (isProfit) {
    const { data: profits } = await sb.from('platform_profits').select('profit_amount,profit_date').order('profit_date', { ascending: false }).limit(30)
    const totalProfit = (profits || []).reduce((s: number, r: any) => s + (r.profit_amount || 0), 0)
    const { data: perf } = await sb.from('store_performance').select('total_orders,total_revenue').limit(10000)
    const totalOrders = (perf || []).reduce((s: number, r: any) => s + (r.total_orders || 0), 0)
    const totalRevenue = (perf || []).reduce((s: number, r: any) => s + (r.total_revenue || 0), 0)
    data = { totalProfit, totalOrders, totalRevenue, recentProfits: profits }
    intentLabel = '利润'
  } else if (isWallet) {
    const { count: totalWallets } = await sb.from('user_wallets').select('*', { count: 'exact', head: true })
    const { data: wallets } = await sb.from('user_wallets').select('balance,cny_balance').limit(10000)
    const totalBalance = (wallets || []).reduce((s: number, w: any) => s + (w.balance || 0), 0)
    const totalCny = (wallets || []).reduce((s: number, w: any) => s + (w.cny_balance || 0), 0)
    const { count: totalTx } = await sb.from('transactions').select('*', { count: 'exact', head: true })
    const { count: totalWithdraw } = await sb.from('withdrawal_requests').select('*', { count: 'exact', head: true })
    const { count: pendingWithdraw } = await sb.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    data = { totalWallets, totalBalance, totalCny, totalTx, totalWithdraw, pendingWithdraw }
    intentLabel = '钱包'
  } else if (isWorker) {
    const { count: total } = await sb.from('workers').select('*', { count: 'exact', head: true })
    const { count: onDuty } = await sb.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'on_duty')
    const { count: offDuty } = await sb.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'off_duty')
    const { data: recent } = await sb.from('workers').select('name,status,created_at').order('created_at', { ascending: false }).limit(5)
    data = { total, onDuty, offDuty, recent }
    intentLabel = '工人'
  } else if (isAgent) {
    const { count: total } = await sb.from('agent_applications').select('*', { count: 'exact', head: true })
    const { count: approved } = await sb.from('agent_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved')
    const { count: pending } = await sb.from('agent_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: rejected } = await sb.from('agent_applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    const { data: recent } = await sb.from('agent_applications').select('full_name,agent_type,status,created_at').order('created_at', { ascending: false }).limit(5)
    data = { total, approved, pending, rejected, recent }
    intentLabel = '代理商'
  } else {
    const { count: userCount } = await sb.from('users').select('*', { count: 'exact', head: true })
    const { count: storeCount } = await sb.from('franchisee_stores').select('*', { count: 'exact', head: true })
    const { count: batteryCount } = await sb.from('battery_assets').select('*', { count: 'exact', head: true })
    const { count: tradeCount } = await sb.from('trade_records').select('*', { count: 'exact', head: true })
    data = { userCount, storeCount, batteryCount, tradeCount }
    intentLabel = '平台概况'
  }

  return { data, intentLabel }
}

/**
 * POST /api/advisor
 * 接收 messages 数组，查询 Supabase 获取真实数据，
 * 调用 Agnes LLM 流式返回智能回答。
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

    const { data, intentLabel } = await querySupabase(question)

    const systemPrompt = `你是换电投资平台的AI顾问。以下是平台${intentLabel}相关的当前数据：

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请基于以上真实数据用中文简洁专业地回答用户问题。如果数据中某些字段为 null 或不存在，如实说明"暂无数据"，不要编造。`

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
      console.error('[advisor] Agnes error:', agnesRes.status, errText)
      return new Response('AI 服务暂时不可用', { status: 502 })
    }

    // 流式转发 SSE，提取 content 为纯文本流（兼容 useChat streamProtocol: 'text'）
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
                // 跳过解析失败的行
              }
            }
          }
        } catch (e) {
          console.error('[advisor] stream error:', e)
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
    console.error('[advisor]', e)
    return new Response('查询失败，请稍后再试', { status: 500 })
  }
}
