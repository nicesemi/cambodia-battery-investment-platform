import { getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/franchisee/store-orders
 * 返回加盟商门店通过店员帮注册(staff_registration)产生的已支付订单
 * 包含购买金额、月租金、三级佣金计算
 * 
 * 权限范围：
 * - franchisee（普通加盟商）：只查自己 owner 的门店
 * - city_franchisee（市级加盟商）：查本市所有下辖门店
 * - province_agent（省代理）：查本省所有下辖门店
 * - admin：查全部
 * 
 * 租金分成仅对仍持有 active 电池的投资者计算
 * 限制返回最近 10 条
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    if (user.role !== 'franchisee' && user.role !== 'admin') {
      return unauthorized('Franchisee only')
    }

    const adminClient = getSupabaseAdmin()

    // 获取门店列表（按角色权限）
    let storeIds: string[] = []

    if (user.role === 'admin') {
      // admin: 全部门店
      const { data: allStores } = await adminClient
        .from('franchisee_stores')
        .select('id')
      storeIds = (allStores || []).map((s: any) => s.id)
    } else {
      // franchisee（含 city_franchisee 和 province_agent）：先查自营门店
      const { data: ownStores } = await adminClient
        .from('franchisee_stores')
        .select('id')
        .eq('owner_id', user.id)
      storeIds = (ownStores || []).map((s: any) => s.id)

      // city_franchisee：查本市所有下辖门店
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

      // province_agent：查本省所有下辖门店（两级）
      if (user.agent_type === 'province_agent') {
        const { data: agentApps } = await adminClient
          .from('agent_applications')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .eq('agent_type', 'province_agent')

        if (agentApps && agentApps.length > 0) {
          const provinceAgentId = agentApps[0].id

          // 第一级：市级加盟商
          const { data: cityAgents } = await adminClient
            .from('agent_applications')
            .select('id, user_id')
            .eq('parent_agent_id', provinceAgentId)
            .eq('status', 'approved')

          const cityUserIds = (cityAgents || []).map(a => a.user_id)
          const cityAgentIds = (cityAgents || []).map(a => a.id)

          // 市级加盟商自营门店
          if (cityUserIds.length > 0) {
            const { data: cityOwnStores } = await adminClient
              .from('franchisee_stores')
              .select('id')
              .in('owner_id', cityUserIds)
            for (const s of (cityOwnStores || [])) {
              if (!storeIds.includes(s.id)) storeIds.push(s.id)
            }
          }

          // 第二级：市级下辖门店
          if (cityAgentIds.length > 0) {
            const { data: subApps } = await adminClient
              .from('franchisee_applications')
              .select('user_id')
              .in('parent_agent_id', cityAgentIds)
              .eq('status', 'approved')

            const subUserIds = Array.from(new Set((subApps || []).map(a => a.user_id)))
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
      }
    }

    if (storeIds.length === 0) {
      return ok({ orders: [] })
    }

    // 获取门店基本信息
    const { data: stores } = await adminClient
      .from('franchisee_stores')
      .select('id, name, store_code, owner_id')
      .in('id', storeIds)

    // 查询这些门店的 staff_registration 订单，提取被注册的投资者
    const { data: regOrders, error: regErr } = await adminClient
      .from('investor_orders')
      .select('id, user_id, store_id, created_at')
      .in('store_id', storeIds)
      .eq('order_source', 'staff_registration')
      .in('status', ['completed', 'pending'])

    if (regErr) return serverError(regErr.message)

    const investorIds = Array.from(new Set((regOrders || []).map((o: any) => o.user_id).filter(Boolean)))

    if (!regOrders || regOrders.length === 0 || investorIds.length === 0) {
      return ok({ orders: [], summary: { total_orders: 0, total_purchase: 0, total_monthly_rent: 0, total_store_commission: 0, total_revenue_share: 0, total_city_commission: 0, total_province_commission: 0 } })
    }

    // 查询哪些投资者当前仍持有 active 电池（租金分成判断）
    // 同时获取 activated_at 用于10天等待期+首月按天折算
    const { data: activeUnits } = await adminClient
      .from('battery_units')
      .select('user_id, asset_id, activated_at, status')
      .in('user_id', investorIds)
      .eq('status', 'active')

    // 构建 user_id → battery_units[] 映射
    const userBatteryMap = new Map<string, any[]>()
    for (const u of (activeUnits || [])) {
      if (!userBatteryMap.has(u.user_id)) userBatteryMap.set(u.user_id, [])
      userBatteryMap.get(u.user_id)!.push(u)
    }

    // 获取资产月租金映射（通过 battery_assets → battery_type_id → battery_types.monthly_rent）
    const batteryAssetIds = Array.from(new Set((activeUnits || []).map((u: any) => u.asset_id).filter(Boolean)))
    let batteryAssetMap = new Map<string, { monthly_rent: number }>()
    if (batteryAssetIds.length > 0) {
      const { data: batteryAssets } = await adminClient
        .from('battery_assets')
        .select('id, monthly_rent, battery_type_id')
        .in('id', batteryAssetIds)

      // 批量查询 battery_types 获取 monthly_rent
      const btIds = Array.from(new Set((batteryAssets || []).map((a: any) => a.battery_type_id).filter(Boolean)))
      const btRentMap = new Map<string, number>()
      if (btIds.length > 0) {
        const { data: bTypes } = await adminClient
          .from('battery_types')
          .select('id, monthly_rent')
          .in('id', btIds)
        for (const bt of (bTypes || [])) btRentMap.set(bt.id, Number(bt.monthly_rent || 0))
      }

      for (const a of (batteryAssets || [])) {
        const btRent = btRentMap.get(a.battery_type_id)
        batteryAssetMap.set(a.id, { monthly_rent: btRent ?? a.monthly_rent ?? 0 })
      }
    }

    // 查询这些投资者的 online 购买订单
    const { data: purchaseOrders, error: purchaseErr } = await adminClient
      .from('investor_orders')
      .select('*')
      .in('user_id', investorIds)
      .eq('order_source', 'online')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    if (purchaseErr) return serverError(purchaseErr.message)

    // 获取订单关联的资产信息
    const assetIds = Array.from(new Set((purchaseOrders || []).map((o: any) => o.asset_id).filter(Boolean)))
    let assetMap = new Map<string, any>()
    if (assetIds.length > 0) {
      const { data: assets } = await adminClient
        .from('battery_assets')
        .select('id, name, name_i18n, unit_price, monthly_rent, battery_type, battery_type_id')
        .in('id', assetIds)

      // 批量查询 battery_types 获取 monthly_rent
      const assetBtIds = Array.from(new Set((assets || []).map((a: any) => a.battery_type_id).filter(Boolean)))
      const assetBtRentMap = new Map<string, number>()
      if (assetBtIds.length > 0) {
        const { data: assetBTypes } = await adminClient
          .from('battery_types')
          .select('id, monthly_rent')
          .in('id', assetBtIds)
        for (const bt of (assetBTypes || [])) assetBtRentMap.set(bt.id, Number(bt.monthly_rent || 0))
      }

      if (assets) {
        for (const a of assets) {
          const btRent = assetBtRentMap.get(a.battery_type_id)
          assetMap.set(a.id, { ...a, bt_monthly_rent: btRent ?? a.monthly_rent ?? 0 })
        }
      }
    }

    // 门店映射
    const storeMap = new Map((stores || []).map((s: any) => [s.id, { name: s.name, store_code: s.store_code }]))

    // 投资者→门店映射（从 regOrders 构建）
    const investorStoreMap = new Map<string, { store_id: string; reg_time: string }>()
    for (const r of regOrders || []) {
      if (!investorStoreMap.has(r.user_id)) {
        investorStoreMap.set(r.user_id, { store_id: r.store_id, reg_time: r.created_at })
      }
    }

    // battery_assets.battery_type（中文显示名）→ BATTERY_PRODUCTS.id（英文代码）映射
    const BATTERY_TYPE_TO_PRODUCT_ID: Record<string, string> = {
      '4820 通用低速两轮换电': '4820',
      '7250 高速电摩换电': '7250',
      '6035 中速电摩换电': '6035',
      '72100 重载三轮备用款': '72100',
      '4.2米物流货车电池': 'van420',
      '6米客运中巴电池': 'bus600',
      '12米城市大巴电池': 'bus1200',
      '工商业100kWh风冷柜': 'ess100',
      '工商业215kWh储能柜': 'ess215',
      '工商业300kWh储能柜': 'ess300',
      '工商业500kWh液冷柜': 'ess500',
      '20尺-1.45MWh集装箱储能': 'cont145',
      '20尺-3.44MWh集装箱储能': 'cont344',
      '20尺-3.99MWh集装箱储能': 'cont399',
      '40尺-5MWh风冷集装箱储能': 'cont500',
      '40尺-5.2MWh液冷集装箱储能': 'cont520',
      '40尺-6MWh液冷集装箱储能': 'cont600',
    }

    // 佣金比例
    const STORE_COMMISSION = 0.05
    const CITY_COMMISSION = 0.03
    const PROVINCE_COMMISSION = 0.02

    const enrichedOrders = (purchaseOrders || []).map((o: any) => {
      const asset = assetMap.get(o.asset_id)
      const investStore = investorStoreMap.get(o.user_id)
      const storeInfo = storeMap.get(investStore?.store_id || o.store_id)
      const purchaseAmount = o.total_amount || ((o.units || 0) * (o.unit_price || 0))
      const monthlyRent = (asset?.bt_monthly_rent || 0) * (o.units || 0)

      // 购买佣金 5%（所有订单）
      const storeCommission = +(purchaseAmount * STORE_COMMISSION).toFixed(2)
      // 月租金分成 5%（含10天等待期+首月按天折算）
      let totalMonthlyRent = 0
      const batteries = userBatteryMap.get(o.user_id) || []
      const now = new Date()
      const currentMonth = now.getMonth() // 0-based
      const currentYear = now.getFullYear()
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

      for (const bu of batteries) {
        const ba = batteryAssetMap.get(bu.asset_id)
        const mRent = ba?.monthly_rent || 0
        if (!bu.activated_at || mRent <= 0) continue

        const activated = new Date(bu.activated_at)
        // 10天等待期结束日
        const rentStart = new Date(activated)
        rentStart.setDate(rentStart.getDate() + 10)

        // 如果租金开始日期在当前月之后 → 尚未开始
        if (rentStart.getFullYear() > currentYear || (rentStart.getFullYear() === currentYear && rentStart.getMonth() > currentMonth)) {
          continue
        }
        // 如果租金开始日期在当前月之前 → 整月计算
        if (rentStart.getFullYear() < currentYear || (rentStart.getFullYear() === currentYear && rentStart.getMonth() < currentMonth)) {
          totalMonthlyRent += mRent
        } else {
          // 首月：按天折算
          const remainingDays = Math.max(0, daysInMonth - rentStart.getDate() + 1)
          totalMonthlyRent += +(mRent * remainingDays / daysInMonth).toFixed(2)
        }
      }
      const revenueShare = +(totalMonthlyRent * STORE_COMMISSION).toFixed(2)

      // 城市/省级佣金 = 购买佣金 + 租金分成（含10天等待期+首月按天折算）
      const cityCommission = +(purchaseAmount * CITY_COMMISSION + totalMonthlyRent * CITY_COMMISSION).toFixed(2)
      const provinceCommission = +(purchaseAmount * PROVINCE_COMMISSION + totalMonthlyRent * PROVINCE_COMMISSION).toFixed(2)
      const commissionTotal = +(storeCommission + revenueShare + cityCommission + provinceCommission).toFixed(2)

      return {
        ...o,
        store_name: storeInfo?.name || '未知门店',
        store_code: storeInfo?.store_code || '',
        order_type: 'investor_binding',
        asset_name: asset?.name || '—',
        asset_name_i18n: asset?.name_i18n,
        battery_type: asset?.battery_type || '—',
        product_id: BATTERY_TYPE_TO_PRODUCT_ID[asset?.battery_type] || null,
        purchase_amount: purchaseAmount,
        standard_monthly_rent: monthlyRent,                  // 电池标准月租金（不受等待期影响）
        monthly_rent: totalMonthlyRent,                      // 本月实际可分成租金（10天等待期+首月按天折算）
        store_commission: storeCommission,
        revenue_share: revenueShare,
        city_commission: cityCommission,
        province_commission: provinceCommission,
        commission_total: commissionTotal,
      }
    })

    // 汇总统计
    const summary = {
      total_orders: enrichedOrders.length,
      total_purchase: enrichedOrders.reduce((sum: number, o: any) => sum + (o.purchase_amount || 0), 0),
      total_monthly_rent: enrichedOrders.reduce((sum: number, o: any) => sum + (o.monthly_rent || 0), 0),
      total_store_commission: enrichedOrders.reduce((sum: number, o: any) => sum + (o.store_commission || 0), 0),
      total_revenue_share: enrichedOrders.reduce((sum: number, o: any) => sum + (o.revenue_share || 0), 0),
      total_city_commission: enrichedOrders.reduce((sum: number, o: any) => sum + (o.city_commission || 0), 0),
      total_province_commission: enrichedOrders.reduce((sum: number, o: any) => sum + (o.province_commission || 0), 0),
    }

    return ok({ orders: enrichedOrders, summary })
  } catch (e: any) {
    return serverError(e.message)
  }
}
