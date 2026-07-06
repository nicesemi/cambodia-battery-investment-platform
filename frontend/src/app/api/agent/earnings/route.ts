import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/earnings — 获取代理收益明细
 * 
 * 返回三部分：
 * 1. self_earnings：自营门店收益（5% 购买佣金 + 5% 月租金分成）
 * 2. city_commission：本市加盟门店 3% 购买佣金
 * 3. city_rent_share：本市加盟门店 3% 月租金分成
 */
export async function GET(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user) return unauthorized()

    const adminClient = getSupabaseAdmin()

    // 1. 确认代理身份 — 先查 agent_applications，再 fallback 查 franchisee_applications（区县加盟商）
    let agent: { id: string; user_id: string; agent_type: string; region?: string; city?: string; parent_agent_id?: string } | null = null

    const { data: agentApps, error: agentErr } = await adminClient
      .from('agent_applications')
      .select('id, user_id, agent_type, region, city')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (agentErr) return serverError(agentErr.message)

    if (agentApps && agentApps.length > 0) {
      agent = agentApps[0]
    } else {
      // fallback: 区县加盟商（franchisee_applications）
      const { data: franchiseeApps, error: frErr } = await adminClient
        .from('franchisee_applications')
        .select('id, user_id, region, city, parent_agent_id, agent_type')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (frErr) return serverError(frErr.message)
      if (!franchiseeApps || franchiseeApps.length === 0) {
        return unauthorized('您不是已审批的代理商')
      }

      agent = {
        id: franchiseeApps[0].id,
        user_id: franchiseeApps[0].user_id,
        agent_type: franchiseeApps[0].agent_type || 'county_franchisee',
        region: franchiseeApps[0].region,
        city: franchiseeApps[0].city,
        parent_agent_id: franchiseeApps[0].parent_agent_id,
      }
    }

    // 2. 获取所有下辖加盟商的 user_id
    let subordinateUserIds: string[] = []
    if (agent.agent_type === 'city_franchisee' || agent.agent_type === 'county_franchisee') {
      const { data: subApps } = await adminClient
        .from('franchisee_applications')
        .select('user_id')
        .eq('parent_agent_id', agent.id)
        .eq('status', 'approved')
      subordinateUserIds = (subApps || []).map(a => a.user_id)
    } else if (agent.agent_type === 'province_agent') {
      // 省代理 → 市级加盟商 → 门店
      const { data: cityAgents } = await adminClient
        .from('agent_applications')
        .select('id')
        .eq('parent_agent_id', agent.id)
        .eq('status', 'approved')
      const cityAgentIds = (cityAgents || []).map(a => a.id)
      if (cityAgentIds.length > 0) {
        // [排查发现-断链点2] parent_agent_id 在 agent_applications 中可能是整数类型，
        // franchisee_applications 表的 parent_agent_id 外键引用 agent_applications.id。
        // 风险1：若 agent_applications.id 为 bigint，JS number 可能精度丢失导致 .in() 匹配失败。
        // 风险2：franchisee_applications 的 parent_agent_id 字段名需确认与 agent_applications.id 匹配。
        const { data: subApps } = await adminClient
          .from('franchisee_applications')
          .select('user_id')
          .in('parent_agent_id', cityAgentIds)
          .eq('status', 'approved')
        subordinateUserIds = Array.from(new Set((subApps || []).map(a => a.user_id)))
      }
    }

    // 3. 获取所有可见门店（owner_id = user.id 或 subordinateUserIds），
    //    然后按投资者关系分类（与 /api/franchisee/stores 保持一致）
    const allOwnerIds = [user.id, ...subordinateUserIds]
    const { data: allRawStores } = await adminClient
      .from('franchisee_stores')
      .select('id, name, owner_id')
      .in('owner_id', allOwnerIds)

    const allStores = allRawStores || []
    const allStoreIds = allStores.map((s: any) => s.id)

    // 按 owner_id 分类门店
    const subordinateSet = new Set(subordinateUserIds)
    const ownStoreIds: string[] = []
    const subStoreIds: string[] = []
    const ownStoreNames: Record<string, string> = {}
    const subStoreNames: Record<string, string> = {}

    for (const s of allStores) {
      if (s.owner_id === user.id) {
        // owner_id === user.id → 自营门店（佣金率5%）
        ownStoreIds.push(s.id)
        ownStoreNames[s.id] = s.name
      } else if (subordinateSet.has(s.owner_id)) {
        // owner_id 在 subordinateUserIds 中 → 加盟门店（佣金率3%）
        subStoreIds.push(s.id)
        subStoreNames[s.id] = s.name
      }
    }

    // 5. 计算自营门店收益：staff_registration → investor → online 购买订单 → 5% commission + 5% rent
    let selfCommission = 0
    let selfCommissionCurrentMonth = 0
    let selfCommissionSettled = 0
    let selfRentShare = 0
    let selfPurchaseAmount = 0
    const selfStoreMap: Record<string, { store_id: string; store_name: string; purchase_commission: number; rental_share: number; purchase_amount: number; rent_start_date: string | null }> = {}
    // 每个门店的 ren_start 记录（用于后续取最早值）
    const selfStoreRentStarts: Record<string, Date[]> = {}

    if (ownStoreIds.length > 0) {
      // [排查发现-断链点3a] 若 staff_registration 订单的 store_id 为 NULL，
      // .in('store_id', ownStoreIds) 会过滤掉这些订单（SQL IN 不匹配 NULL），
      // 导致 investorStoreMap 中缺少对应 investor → store 映射，进而遗漏：
      //   1) 该投资者的 online 购买订单佣金计算
      //   2) 该投资者的 active 电池租金分成计算
      // 建议检查 investor_orders 表中 order_source='staff_registration' 的 store_id 列是否有 NULL 值。
      const { data: regOrders } = await adminClient
        .from('investor_orders')
        .select('user_id, store_id')
        .in('store_id', ownStoreIds)
        .eq('order_source', 'staff_registration')
        .in('status', ['completed', 'pending'])

      // investor → store_id 映射
      const investorStoreMap = new Map<string, string>()
      for (const r of (regOrders || [])) {
        if (r.user_id && r.store_id) investorStoreMap.set(r.user_id, r.store_id)
      }
      const investorIds = Array.from(investorStoreMap.keys())

      if (investorIds.length > 0) {
        // 门店名称映射（使用已分类的 ownStoreNames）
        const storeNameMap: Record<string, string> = ownStoreNames

        // 自营门店购买佣金：所有 online 购买订单 × 5%
        const { data: purchases } = await adminClient
          .from('investor_orders')
          .select('total_amount, units, unit_price, user_id, created_at')
          .in('user_id', investorIds)
          .eq('order_source', 'online')
          .eq('status', 'completed')

        const nowForCommission = new Date()
        const currentYear = nowForCommission.getFullYear()
        const currentMonth = nowForCommission.getMonth()

        if (purchases && purchases.length > 0) {
          for (const o of purchases) {
            const purchase = o.total_amount || (o.units || 0) * (o.unit_price || 0)
            const commission = purchase * 0.05
            selfCommission += commission
            selfPurchaseAmount += purchase

            // 按购买月份分离：当月佣金=预计收益，历史佣金=已到账
            const purchaseDate = o.created_at ? new Date(o.created_at) : null
            const isCurrentMonth = purchaseDate
              && purchaseDate.getFullYear() === currentYear
              && purchaseDate.getMonth() === currentMonth
            if (isCurrentMonth) {
              selfCommissionCurrentMonth += commission
            } else {
              selfCommissionSettled += commission
            }

            const storeId = investorStoreMap.get(o.user_id) || o.user_id
            if (!selfStoreMap[storeId]) {
              selfStoreMap[storeId] = { store_id: storeId, store_name: storeNameMap[storeId] || '未知门店', purchase_commission: 0, rental_share: 0, purchase_amount: 0, rent_start_date: null }
            }
            selfStoreMap[storeId].purchase_commission += commission
            selfStoreMap[storeId].purchase_amount += purchase
          }
        }

        // 自营门店租金分成：所有 active 或 sold 电池当月租金 × 5%（10天等待期 + 首月按天折算）
        const { data: activeUnits } = await adminClient
          .from('battery_units')
          .select('id, investor_id, battery_asset_id')
          .in('investor_id', investorIds)
          .in('status', ['active', 'sold'])

        if (activeUnits && activeUnits.length > 0) {
          // 批量获取 battery_types 的 monthly_rent（通过 battery_assets.battery_type_id 关联）
          const assetIds = Array.from(new Set(activeUnits.map(u => u.battery_asset_id).filter(Boolean)))
          let rentMap = new Map<string, number>()
          if (assetIds.length > 0) {
            const { data: rentAssets } = await adminClient.from('battery_assets').select('id, battery_type_id').in('id', assetIds)
            const typeIds = Array.from(new Set((rentAssets || []).map((a: any) => a.battery_type_id).filter(Boolean)))
            if (typeIds.length > 0) {
              const { data: rentTypes } = await adminClient.from('battery_types').select('id, monthly_rent').in('id', typeIds)
              const typeRentMap = new Map((rentTypes || []).map((t: any) => [t.id, Number(t.monthly_rent || 0)]))
              for (const a of (rentAssets || [])) {
                rentMap.set(a.id, typeRentMap.get(a.battery_type_id) || 0)
              }
            }
          }

          // 通过 investor_battery_units 获取购买时间
          const unitIds = activeUnits.map(u => u.id).filter(Boolean)
          const purchaseMap = new Map<string, Date>()
          if (unitIds.length > 0) {
            const { data: ibuRows } = await adminClient
              .from('investor_battery_units')
              .select('battery_unit_id, purchased_at')
              .in('battery_unit_id', unitIds)
            for (const r of (ibuRows || [])) {
              if (r.purchased_at) purchaseMap.set(r.battery_unit_id, new Date(r.purchased_at))
            }
          }

          const now = new Date()
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

          for (const u of activeUnits) {
            const monthlyRent = rentMap.get(u.battery_asset_id) || 0
            // 始终记录 store（即使等待期内分成=0）
            const storeId = investorStoreMap.get(u.investor_id) || u.investor_id
            if (!selfStoreMap[storeId]) {
              selfStoreMap[storeId] = { store_id: storeId, store_name: storeNameMap[storeId] || '未知门店', purchase_commission: 0, rental_share: 0, purchase_amount: 0, rent_start_date: null }
            }

            if (monthlyRent <= 0) continue

            const purchasedAt = purchaseMap.get(u.id)
            if (!purchasedAt) continue

            // rent_start = purchased_at + 10天等待期
            const rentStart = new Date(purchasedAt)
            rentStart.setDate(rentStart.getDate() + 10)

            // 记录每个门店的 rent_start（用于取最早值）
            if (!selfStoreRentStarts[storeId]) selfStoreRentStarts[storeId] = []
            selfStoreRentStarts[storeId].push(rentStart)

            // 如果 rent_start > 今天 → 月租金=0，分成=0（但仍记录 rent_start_date）
            if (rentStart > now) continue

            let proratedRent: number
            if (
              rentStart.getFullYear() === now.getFullYear() &&
              rentStart.getMonth() === now.getMonth()
            ) {
              // rent_start 在本月 → 按天折算
              const remainingDays = Math.max(0, daysInMonth - rentStart.getDate() + 1)
              proratedRent = monthlyRent * (remainingDays / daysInMonth)
            } else {
              // rent_start 在上月或更早 → 全月月租金
              proratedRent = monthlyRent
            }

            const rentShare = proratedRent * 0.05
            selfRentShare += rentShare

            selfStoreMap[storeId].rental_share += rentShare
          }
        }
      }
    }

    // 对每个自营门店，取最早的 rent_start
    for (const [sid, dates] of Object.entries(selfStoreRentStarts)) {
      if (dates.length > 0) {
        const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
        const month = earliest.getMonth() + 1
        const day = earliest.getDate()
        selfStoreMap[sid].rent_start_date = `${month}月${day}日`
      }
    }

    const selfTotal = selfCommission + selfRentShare
    const selfStores = Object.values(selfStoreMap).map(s => ({
      ...s,
      purchase_commission: +s.purchase_commission.toFixed(2),
      rental_share: +s.rental_share.toFixed(2),
      purchase_amount: +s.purchase_amount.toFixed(2),
    }))

    // 6. 计算代理从下辖门店获得的佣金 + 租金分成
    // 市级代理: 3% 购买佣金 + 3% 月租金分成
    // 省级代理: 2% 购买佣金 + 2% 月租金分成
    // 区县加盟商: 若上级为 city_franchisee 则 3%，否则 0%
    let downstreamRate = 0
    if (agent.agent_type === 'province_agent') {
      downstreamRate = 0.02
    } else if (agent.agent_type === 'city_franchisee') {
      downstreamRate = 0.03
    } else if (agent.agent_type === 'county_franchisee') {
      if (agent.parent_agent_id) {
        const { data: parentAgent } = await adminClient
          .from('agent_applications')
          .select('agent_type')
          .eq('id', agent.parent_agent_id)
          .eq('status', 'approved')
          .maybeSingle()
        if (parentAgent && parentAgent.agent_type === 'city_franchisee') {
          downstreamRate = 0.03
        }
      }
    }
    let cityCommission = 0
    let cityCommissionCurrentMonth = 0
    let cityCommissionSettled = 0
    let cityRentShare = 0
    let cityPurchaseAmount = 0
    let cityDetails: any[] = []

    if ((subStoreIds.length > 0 || subordinateUserIds.length > 0) && downstreamRate > 0) {
      // [排查发现-断链点3b] 同自营门店（L92-97），下辖门店的 staff_registration 订单
      // store_id 若为 NULL 会被 .in() 过滤，导致 subInvestorIds 缺失，进而遗漏下辖门店的
      // online 购买佣金和 active 电池租金分成。建议检查数据完整性。
      const { data: subRegOrders } = await adminClient
        .from('investor_orders')
        .select('user_id, store_id')
        .in('store_id', subStoreIds)
        .eq('order_source', 'staff_registration')
        .in('status', ['completed', 'pending'])

      // 合并下辖加盟商 user_id（他们自身也可能是投资者，拥有 active 电池）
      const subInvestorIds = Array.from(new Set([
        ...(subRegOrders || []).map(o => o.user_id).filter(Boolean),
        ...subordinateUserIds,
      ]))

      if (subInvestorIds.length > 0) {
        // 建立 store_id → store_name 映射
        const { data: allSubStores } = await adminClient
          .from('franchisee_stores')
          .select('id, name')
          .in('id', subStoreIds)
        const storeNameMap: Record<string, string> = {}
        for (const s of (allSubStores || [])) storeNameMap[s.id] = s.name

        // 建立 investor → store_id/store_name 映射 & 查询投资者邮箱
        const subInvestorStoreMap = new Map<string, string>()
        for (const r of (subRegOrders || [])) {
          if (r.user_id && r.store_id) subInvestorStoreMap.set(r.user_id, r.store_id)
        }

        // 查询下辖投资者邮箱
        const { data: subInvestorUsers } = await adminClient
          .from('users')
          .select('id, email, username, full_name')
          .in('id', subInvestorIds)
        const subInvestorEmailMap = new Map<string, string>()
        if (subInvestorUsers) {
          for (const u of subInvestorUsers) {
            subInvestorEmailMap.set(u.id, u.email || u.username || '')
          }
        }

        // 下辖门店购买佣金：所有 online 购买订单 × downstreamRate
        const { data: subPurchases } = await adminClient
          .from('investor_orders')
          .select('total_amount, units, unit_price, created_at, store_id, user_id')
          .in('user_id', subInvestorIds)
          .eq('order_source', 'online')
          .eq('status', 'completed')

        // 按投资者聚合收益明细
        const investorDetailMap = new Map<string, { investor_id: string; investor_email: string; store_name: string; purchase_amount: number; monthly_rent: number; commission: number; rent_share: number; created_at: string; rent_start_date: string | null }>()
        // 每个投资者的 rent_start 记录（用于后续取最早值）
        const investorRentStarts = new Map<string, Date[]>()

        if (subPurchases && subPurchases.length > 0) {
          for (const o of subPurchases) {
            const purchase = o.total_amount || (o.units || 0) * (o.unit_price || 0)
            const commission = purchase * downstreamRate
            cityCommission += commission
            cityPurchaseAmount += purchase

            // 按购买月份分离：当月佣金=预计收益，历史佣金=已到账
            const subPurchaseDate = o.created_at ? new Date(o.created_at) : null
            const isCurrentMonthCity = subPurchaseDate
              && subPurchaseDate.getFullYear() === currentYear
              && subPurchaseDate.getMonth() === currentMonth
            if (isCurrentMonthCity) {
              cityCommissionCurrentMonth += commission
            } else {
              cityCommissionSettled += commission
            }
            const invId = o.user_id
            if (!investorDetailMap.has(invId)) {
              const sid = subInvestorStoreMap.get(invId) || ''
              investorDetailMap.set(invId, {
                investor_id: invId,
                investor_email: subInvestorEmailMap.get(invId) || '',
                store_name: storeNameMap[sid] || '未知门店',
                purchase_amount: 0,
                monthly_rent: 0,
                commission: 0,
                rent_share: 0,
                created_at: o.created_at || new Date().toISOString(),
                rent_start_date: null,
              })
            }
            const d = investorDetailMap.get(invId)!
            d.purchase_amount += purchase
            d.commission += commission
          }
        }

        // 下辖门店租金分成：所有 active 或 sold 电池当月租金 × downstreamRate（10天等待期 + 首月按天折算）
        const { data: subActiveUnits } = await adminClient
          .from('battery_units')
          .select('id, investor_id, battery_asset_id')
          .in('investor_id', subInvestorIds)
          .in('status', ['active', 'sold'])

        if (subActiveUnits && subActiveUnits.length > 0) {
          // 批量获取 battery_types 的 monthly_rent（通过 battery_assets.battery_type_id 关联）
          const subAssetIds = Array.from(new Set(subActiveUnits.map((u: any) => u.battery_asset_id).filter(Boolean)))
          let subRentMap = new Map<string, number>()
          if (subAssetIds.length > 0) {
            const { data: subRentAssets } = await adminClient.from('battery_assets').select('id, battery_type_id').in('id', subAssetIds)
            const subTypeIds = Array.from(new Set((subRentAssets || []).map((a: any) => a.battery_type_id).filter(Boolean)))
            if (subTypeIds.length > 0) {
              const { data: subRentTypes } = await adminClient.from('battery_types').select('id, monthly_rent').in('id', subTypeIds)
              const subTypeRentMap = new Map((subRentTypes || []).map((t: any) => [t.id, Number(t.monthly_rent || 0)]))
              for (const a of (subRentAssets || [])) {
                subRentMap.set(a.id, subTypeRentMap.get(a.battery_type_id) || 0)
              }
            }
          }

          // 通过 investor_battery_units 获取购买时间
          const subUnitIds = subActiveUnits.map((u: any) => u.id).filter(Boolean)
          const subPurchaseMap = new Map<string, Date>()
          if (subUnitIds.length > 0) {
            const { data: subIbuRows } = await adminClient
              .from('investor_battery_units')
              .select('battery_unit_id, purchased_at')
              .in('battery_unit_id', subUnitIds)
            for (const r of (subIbuRows || [])) {
              if (r.purchased_at) subPurchaseMap.set(r.battery_unit_id, new Date(r.purchased_at))
            }
          }

          const now = new Date()
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

          for (const u of subActiveUnits) {
            const monthlyRent = subRentMap.get(u.battery_asset_id) || 0
            // monthlyRent 始终累加（即使等待期内分成=0，也要展示全月月租金）
            if (monthlyRent <= 0) continue

            // 确保 investor 已在 detailMap 中（即使等待期内也要创建条目显示月租金）
            const invId = u.investor_id
            if (!investorDetailMap.has(invId)) {
              const sid = subInvestorStoreMap.get(invId) || ''
              investorDetailMap.set(invId, {
                investor_id: invId,
                investor_email: subInvestorEmailMap.get(invId) || '',
                store_name: storeNameMap[sid] || '未知门店',
                purchase_amount: 0,
                monthly_rent: 0,
                commission: 0,
                rent_share: 0,
                created_at: new Date().toISOString(),
                rent_start_date: null,
              })
            }
            const d = investorDetailMap.get(invId)!
            d.monthly_rent += monthlyRent

            // 10天等待期：只有 rent_start ≤ today 才计算分成
            const purchasedAt = subPurchaseMap.get(u.id)
            if (!purchasedAt) continue

            const rentStart = new Date(purchasedAt)
            rentStart.setDate(rentStart.getDate() + 10)

            // 记录该投资者的 rent_start（用于后续取最早值）
            if (!investorRentStarts.has(invId)) investorRentStarts.set(invId, [])
            investorRentStarts.get(invId)!.push(rentStart)

            if (rentStart > now) continue

            let proratedRent: number
            if (
              rentStart.getFullYear() === now.getFullYear() &&
              rentStart.getMonth() === now.getMonth()
            ) {
              const remainingDays = Math.max(0, daysInMonth - rentStart.getDate() + 1)
              proratedRent = monthlyRent * (remainingDays / daysInMonth)
            } else {
              proratedRent = monthlyRent
            }

            const rentShare = proratedRent * downstreamRate
            cityRentShare += rentShare
            d.rent_share += rentShare
          }
        }

        // 对每个投资者，取最早的 rent_start
        for (const invId of Array.from(investorRentStarts.keys())) {
          const dates = investorRentStarts.get(invId)!
          if (dates.length > 0 && investorDetailMap.has(invId)) {
            const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
            const month = earliest.getMonth() + 1
            const day = earliest.getDate()
            investorDetailMap.get(invId)!.rent_start_date = `${month}月${day}日`
          }
        }

        // 输出按投资者聚合的明细，四舍五入数值
        cityDetails = Array.from(investorDetailMap.values()).map(d => ({
          investor_id: d.investor_id,
          investor_email: d.investor_email,
          store_name: d.store_name,
          purchase_amount: +d.purchase_amount.toFixed(2),
          monthly_rent: +d.monthly_rent.toFixed(2),
          commission: +d.commission.toFixed(2),
          rent_share: +d.rent_share.toFixed(2),
          created_at: d.created_at,
          rent_start_date: d.rent_start_date,
        }))
      }
    }

    const cityTotal = cityCommission + cityRentShare
    const grandTotal = selfTotal + cityTotal
    const hasCityEarnings = ((subStoreIds.length > 0 || subordinateUserIds.length > 0) && downstreamRate > 0)

    // 当月预计收益 = 当月购买佣金 + 当月租金分成（次月1日可提现）
    const currentMonthTotal = selfCommissionCurrentMonth + cityCommissionCurrentMonth + selfRentShare + cityRentShare
    // 已到账收益 = 历史佣金分成（不含当月）
    const settledTotal = selfCommissionSettled + cityCommissionSettled

    return ok({
      agent_type: agent.agent_type,
      territory: agent.city || agent.region,
      self_earnings: {
        purchase_commission: +selfCommission.toFixed(2),
        rental_share: +selfRentShare.toFixed(2),
        total: +selfTotal.toFixed(2),
        total_purchase_amount: +selfPurchaseAmount.toFixed(2),
        stores: selfStores,
      },
      city_earnings: hasCityEarnings ? {
        purchase_commission: +cityCommission.toFixed(2),
        rental_share: +cityRentShare.toFixed(2),
        total: +cityTotal.toFixed(2),
        total_purchase_amount: +cityPurchaseAmount.toFixed(2),
        details: cityDetails.slice(0, 50),
      } : null,
      grand_total: +grandTotal.toFixed(2),
      current_month_total: +currentMonthTotal.toFixed(2),
      settled_total: +settledTotal.toFixed(2),
    })
  } catch (e: any) {
    console.error('Agent earnings error:', e)
    return serverError()
  }
}
