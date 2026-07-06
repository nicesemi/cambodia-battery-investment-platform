import { supabase } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { badRequest, ok, unauthorized, serverError } from '@/lib/response'
import { calculateBuybackPrice } from '@/lib/battery-valuation'

export const dynamic = 'force-dynamic'

// GET: 获取持有电池列表 或 预览回购价格（不执行）
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId')
    const listMode = searchParams.get('list')

    // ?list=1 → 返回用户持有的 battery_units
    if (listMode) {
      const { data: ibuList, error: ibuError } = await supabase
        .from('investor_battery_units')
        .select('id, battery_unit_id, battery_asset_id, purchase_price, purchased_at')
        .eq('investor_id', user.id)

      if (ibuError) return serverError('获取持有列表失败')

      // 获取关联的 unit 和 asset 信息
      const units = []
      for (const ibu of (ibuList || [])) {
        const { data: unit } = await supabase
          .from('battery_units')
          .select('id, unit_code, status, sensor_health_status')
          .eq('id', ibu.battery_unit_id)
          .single()
        const { data: asset } = await supabase
          .from('battery_assets')
          .select('name, name_i18n, unit_price')
          .eq('id', ibu.battery_asset_id)
          .single()
        // 兼容 JSONB 可能返回字符串的情况
        let nameI18n = asset?.name_i18n;
        if (typeof nameI18n === 'string') {
          try { nameI18n = JSON.parse(nameI18n); } catch {}
        }
        units.push({
          id: ibu.battery_unit_id,
          unit_code: unit?.unit_code || '-',
          asset_name: asset?.name || '-',
          asset_name_i18n: nameI18n || null,
          unit_price: ibu.purchase_price,
          purchased_at: ibu.purchased_at,
          status: unit?.status,
          health: unit?.sensor_health_status,
        })
      }

      return ok({ units })
    }

    if (!unitId) return badRequest('unitId required')

    const result: Record<string, unknown> = await computeBuybackForUnit(user.id, unitId, false)
    if ('error' in result) return badRequest(result.error as string)

    return ok(result)
  } catch (e: any) {
    console.error('Sell-to-platform preview error:', e)
    return serverError()
  }
}

// POST: 执行回购
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const { unitIds } = await request.json()
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return badRequest('unitIds must be a non-empty array')
    }

    const results = []
    let totalBuyback = 0

    for (const unitId of unitIds) {
      const result: Record<string, unknown> = await computeBuybackForUnit(user.id, unitId, true)
      if ('error' in result) {
        return badRequest(`电池 ${unitId}: ${result.error}`)
      }
      results.push(result)
      totalBuyback += Number(result.buybackPrice)
    }

    // 平台扣款（从平台利润角度，实际是支出给投资者）
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (!wallet) return serverError('钱包信息获取失败')

    const newBalance = Number(wallet.balance) + totalBuyback
    await supabase
      .from('user_wallets')
      .update({ balance: Math.round(newBalance * 100) / 100, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    // 记录交易
    const txNo = `PLT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    await supabase.from('transactions').insert({
      tx_no: txNo,
      user_id: user.id,
      type: 'trade',
      amount: totalBuyback,
      currency: 'USD',
      status: 'completed',
      remark: `平台回购 ${unitIds.length} 个电池单元`,
      completed_at: new Date().toISOString(),
    })

    return ok({
      message: `成功回购 ${unitIds.length} 个电池单元`,
      totalBuyback: Math.round(totalBuyback * 100) / 100,
      newBalance: Math.round(newBalance * 100) / 100,
      units: results,
    })
  } catch (e: any) {
    console.error('Sell-to-platform error:', e)
    return serverError()
  }
}

async function computeBuybackForUnit(
  userId: string,
  unitId: string,
  execute: boolean,
): Promise<Record<string, unknown>> {
  // 1. 查询投资者持有的电池单元
  const { data: ibu, error: ibuError } = await supabase
    .from('investor_battery_units')
    .select('id, battery_unit_id, battery_asset_id, purchase_price, purchased_at')
    .eq('investor_id', userId)
    .eq('battery_unit_id', unitId)
    .single()

  if (ibuError || !ibu) {
    return { error: '您不持有该电池单元' }
  }

  const { data: unit } = await supabase
    .from('battery_units')
    .select('status')
    .eq('id', unitId)
    .single()

  if (!unit || unit.status !== 'sold') {
    return { error: '该电池单元不在可回购状态' }
  }

  // 2. 计算持有月数
  const purchasedAt = new Date(ibu.purchased_at)
  const now = new Date()
  const monthsHeld = (now.getTime() - purchasedAt.getTime()) / (30.44 * 24 * 60 * 60 * 1000)

  // 3. 计算回购价格
  const valuation = calculateBuybackPrice({
    purchasePrice: Number(ibu.purchase_price),
    monthsHeld,
  })

  // 4. 执行回购
  if (execute && valuation.buybackPrice >= 0) {
    // 标记电池单元为 available
    await supabase
      .from('battery_units')
      .update({ status: 'available', investor_id: null, updated_at: new Date().toISOString() })
      .eq('id', unitId)

    // 删除投资者持有记录
    await supabase
      .from('investor_battery_units')
      .delete()
      .eq('id', ibu.id)

    // 更新用户资产总表
    const { data: ua } = await supabase
      .from('user_assets')
      .select('id, units')
      .eq('user_id', userId)
      .eq('asset_id', ibu.battery_asset_id)
      .single()

    if (ua && ua.units > 0) {
      if (ua.units <= 1) {
        await supabase.from('user_assets').delete().eq('id', ua.id)
      } else {
        await supabase
          .from('user_assets')
          .update({ units: ua.units - 1 })
          .eq('id', ua.id)
      }
    }
  }

  return {
    unitId,
    purchasePrice: valuation.purchasePrice,
    monthsHeld: valuation.monthsHeld,
    residualRate: valuation.residualRate,
    residualValue: valuation.residualValue,
    penaltyRate: valuation.penaltyRate,
    penaltyAmount: valuation.penaltyAmount,
    buybackPrice: valuation.buybackPrice,
    tier: valuation.tier,
    formula: valuation.formula,
  }
}
