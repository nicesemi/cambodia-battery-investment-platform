import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

const STORE_COMMISSION = 0.05
const REVENUE_SHARE = 0.05

/**
 * POST /api/withdrawals — 提交提现申请（门店/加盟商/代理）
 * body: { amount, business_license_url, invoice_info_url, vat_invoice_url, bank_name, bank_account, bank_holder, resubmit_id? }
 * 若传入 resubmit_id，则将对应 rejected 申请重新提交为 pending
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const adminClient = getSupabaseAdmin()
    const body = await request.json()
    const { amount, business_license_url, invoice_info_url, vat_invoice_url, bank_name, bank_account, bank_holder, resubmit_id } = body

    // 重新提交逻辑：更新原 rejected 记录
    if (resubmit_id) {
      const { data: existing, error: findErr } = await adminClient
        .from('withdrawal_requests')
        .select('id, status, user_id')
        .eq('id', resubmit_id)
        .single()

      if (findErr || !existing) return badRequest('提现申请不存在')
      if (existing.user_id !== user.id) return unauthorized()
      if (existing.status !== 'rejected') return badRequest('仅已驳回的申请可以重新提交')

      const updateData: Record<string, any> = {
        status: 'pending',
        updated_at: new Date().toISOString(),
      }
      if (amount && amount > 0) updateData.amount = parseFloat(amount)
      if (business_license_url) updateData.business_license_url = business_license_url
      if (invoice_info_url) updateData.invoice_info_url = invoice_info_url
      if (vat_invoice_url) updateData.vat_invoice_url = vat_invoice_url
      if (bank_name) updateData.bank_name = bank_name
      if (bank_account) updateData.bank_account = bank_account
      if (bank_holder) updateData.bank_holder = bank_holder

      const { data: updated, error: updateErr } = await adminClient
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', resubmit_id)
        .select()
        .single()

      if (updateErr) return serverError(updateErr.message)
      return ok({ withdrawal: updated, resubmitted: true })
    }

    if (!amount || amount <= 0) return badRequest('提现金额必须大于0')
    if (!bank_name || !bank_account || !bank_holder) return badRequest('请填写完整的银行账户信息')
    // 门店/加盟商/代理需要上传文件；investor 不需要
    if (user.role !== 'investor') {
      if (!business_license_url) return badRequest('请上传营业执照')
      if (!invoice_info_url) return badRequest('请上传开票资料')
      if (!vat_invoice_url) return badRequest('请上传增值税专用发票')
    }

    const { data, error } = await adminClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        user_role: user.role,
        amount: parseFloat(amount),
        business_license_url,
        invoice_info_url,
        vat_invoice_url,
        bank_name,
        bank_account,
        bank_holder,
        status: 'pending'
      })
      .select()
      .single()

    if (error) return serverError(error.message)
    return ok({ withdrawal: data })
  } catch (e: any) {
    return serverError(e.message)
  }
}

/**
 * GET /api/withdrawals — 获取当前用户的提现申请列表 + 可提现余额
 * 整合引导订单的佣金和租金：staff_registration 找到投资者 → 投资者的 online 购买订单 → 计算 store_commission + revenue_share
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const adminClient = getSupabaseAdmin()

    // 1. 获取提现申请列表
    const { data: withdrawalList, error } = await adminClient
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return serverError(error.message)

    // 2. 计算已提现金额（已批准的提现）
    const approvedSum = (withdrawalList || [])
      .filter((w: any) => w.status === 'approved')
      .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0)

    // 3. 获取用户所有门店（自营）ID
    const { data: stores } = await adminClient
      .from('franchisee_stores')
      .select('id')
      .eq('owner_id', user.id)

    const storeIds = (stores || []).map((s: any) => s.id)

    // 4. 如果是市级加盟商，合并下辖门店
    if (user.agent_type === 'city_franchisee') {
      const { data: agentApps } = await adminClient
        .from('agent_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('agent_type', 'city_franchisee')

      if (agentApps && agentApps.length > 0) {
        const agentId = agentApps[0].id
        const { data: subApps } = await adminClient
          .from('franchisee_applications')
          .select('user_id')
          .eq('parent_agent_id', agentId)
          .eq('status', 'approved')

        const subUserIds = (subApps || []).map(a => a.user_id)
        if (subUserIds.length > 0) {
          const { data: subStores } = await adminClient
            .from('franchisee_stores')
            .select('id')
            .in('owner_id', subUserIds)
          for (const s of (subStores || [])) {
            if (!storeIds.includes(s.id)) storeIds.push(s.id)
          }
        }
      }
    }

    let totalEarned = 0
    let investorIds: string[] = []
    let activeInvestorIds = new Set<string>()

    if (storeIds.length > 0) {
      // 5. 通过 staff_registration 订单找到被引导注册的投资者
      const { data: regOrders } = await adminClient
        .from('investor_orders')
        .select('user_id, store_id')
        .in('store_id', storeIds)
        .eq('order_source', 'staff_registration')
        .in('status', ['completed', 'pending'])

      investorIds = Array.from(new Set((regOrders || []).map((o: any) => o.user_id).filter(Boolean)))

      if (investorIds.length > 0) {
        // 6. 查询哪些投资者当前仍持有 active 状态的电池（用于租金分成判断）
        const { data: activeUnits } = await adminClient
          .from('battery_units')
          .select('user_id')
          .in('user_id', investorIds)
          .eq('status', 'active')
        activeInvestorIds = new Set((activeUnits || []).map((u: any) => u.user_id))

        // 7. 查询这些投资者的 online 购买订单（已完成的真实购买）
        const { data: purchaseOrders } = await adminClient
          .from('investor_orders')
          .select('total_amount, units, unit_price, monthly_rent, asset_id, user_id')
          .in('user_id', investorIds)
          .eq('order_source', 'online')
          .eq('status', 'completed')

        if (purchaseOrders && purchaseOrders.length > 0) {
          // 获取资产月租金映射
          const assetIds = Array.from(new Set(purchaseOrders.map((o: any) => o.asset_id).filter(Boolean)))
          let assetRentMap = new Map<string, number>()
          if (assetIds.length > 0) {
            const { data: assets } = await adminClient
              .from('battery_assets')
              .select('id, monthly_rent')
              .in('id', assetIds)
            if (assets) {
              for (const a of assets) assetRentMap.set(a.id, a.monthly_rent || 0)
            }
          }

          // 8. 计算购买佣金 5%（所有订单）+ 月租金分成 5%（仅 active 持有人）
          for (const o of purchaseOrders) {
            const purchase = o.total_amount || (o.units || 0) * (o.unit_price || 0)
            const monthlyRent = o.monthly_rent ?? (assetRentMap.get(o.asset_id) || 0) * (o.units || 0)
            totalEarned += purchase * STORE_COMMISSION
            // 只有投资者当前仍持有 active 电池时，才计入租金分成
            if (activeInvestorIds.has(o.user_id)) {
              totalEarned += (monthlyRent || 0) * REVENUE_SHARE
            }
          }
        }
      }
    }

    // 8. 如果是市级加盟商，加上从下辖门店获得的 city_commission (3%) 和 city_revenue_share (3%)
    if (user.agent_type === 'city_franchisee' && investorIds.length > 0) {
      const { data: cityPurchaseOrders } = await adminClient
        .from('investor_orders')
        .select('total_amount, units, unit_price, monthly_rent, asset_id, user_id')
        .in('user_id', investorIds)
        .eq('order_source', 'online')
        .eq('status', 'completed')

      if (cityPurchaseOrders && cityPurchaseOrders.length > 0) {
        const assetIds = Array.from(new Set(cityPurchaseOrders.map((o: any) => o.asset_id).filter(Boolean)))
        let assetRentMap = new Map<string, number>()
        if (assetIds.length > 0) {
          const { data: assets } = await adminClient
            .from('battery_assets')
            .select('id, monthly_rent')
            .in('id', assetIds)
          if (assets) {
            for (const a of assets) assetRentMap.set(a.id, a.monthly_rent || 0)
          }
        }
        for (const o of cityPurchaseOrders) {
          const purchase = o.total_amount || (o.units || 0) * (o.unit_price || 0)
          const monthlyRent = o.monthly_rent ?? (assetRentMap.get(o.asset_id) || 0) * (o.units || 0)
          totalEarned += purchase * 0.03
          if (activeInvestorIds.has(o.user_id)) {
            totalEarned += (monthlyRent || 0) * 0.03
          }
        }
      }
    }

    const balance = Math.max(0, +(totalEarned - approvedSum).toFixed(2))

    return ok({
      withdrawals: withdrawalList || [],
      balance,
      breakdown: {
        total_earned: +totalEarned.toFixed(2),
        total_withdrawn: approvedSum,
      }
    })
  } catch (e: any) {
    return serverError(e.message)
  }
}
