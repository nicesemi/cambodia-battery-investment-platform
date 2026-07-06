/**
 * 电池回购残值计算公式
 *
 * 电池寿命：5年 = 60个月，线性折旧
 * 残值公式：V_res = C × (1 - T_hold / 60)
 * 分档阶梯重罚：
 *   - 12个月内：罚 60%
 *   - 13-24个月：罚 40%
 *   - 25-36个月：罚 20%
 *   - 36个月以上：不罚
 */

export interface BuybackInput {
  purchasePrice: number           // 原始购买单价
  monthsHeld: number              // 持有月数
  batteryLifespanMonths?: number  // 电池寿命(月)，默认 60
}

export interface BuybackResult {
  purchasePrice: number
  monthsHeld: number
  residualRate: number      // 残值率 (0~1)
  residualValue: number     // 残值 V_res
  penaltyRate: number       // 罚金比例 (0~1)
  penaltyAmount: number     // 罚金金额
  buybackPrice: number      // 最终回购价
  buybackPriceCNY: number   // 回购价人民币参考
  tier: string              // 惩罚档位说明
  formula: string           // 使用的公式说明
}

function getPenaltyRate(months: number): { rate: number; tier: string } {
  if (months <= 12) return { rate: 0.6, tier: '12个月内（罚60%）' }
  if (months <= 24) return { rate: 0.4, tier: '13-24个月（罚40%）' }
  if (months <= 36) return { rate: 0.2, tier: '25-36个月（罚20%）' }
  return { rate: 0, tier: '36个月以上（不罚）' }
}

export function calculateBuybackPrice(input: BuybackInput): BuybackResult {
  const {
    purchasePrice: C,
    monthsHeld: T,
    batteryLifespanMonths: L = 60,
  } = input

  // 残值率 = max(0, 1 - T/L)
  const residualRate = Math.max(0, 1 - T / L)
  // 残值
  const residualValue = C * residualRate
  // 罚金比例（按已满月数取整判定档位）
  const { rate: penaltyRate, tier } = getPenaltyRate(Math.ceil(T))
  // 罚金金额
  const penaltyAmount = residualValue * penaltyRate
  const USD_TO_CNY = 7.25;
  // 回购价 = 残值 - 罚金（不低于 0）
  const buybackPrice = Math.max(0, residualValue - penaltyAmount)

  return {
    purchasePrice: Math.round(C * 100) / 100,
    monthsHeld: Math.round(T * 100) / 100,
    residualRate: Math.round(residualRate * 10000) / 100,
    residualValue: Math.round(residualValue * 100) / 100,
    penaltyRate: Math.round(penaltyRate * 10000) / 100,
    penaltyAmount: Math.round(penaltyAmount * 100) / 100,
    buybackPrice: Math.round(buybackPrice * 100) / 100,
    buybackPriceCNY: Math.round(buybackPrice * USD_TO_CNY * 100) / 100,
    tier,
    formula: `V_res = $${C.toFixed(2)} × (1 - ${T.toFixed(1)} / ${L}) = $${residualValue.toFixed(2)}，${tier}，回购价 = $${residualValue.toFixed(2)} × (1 - ${(penaltyRate * 100).toFixed(0)}%) = $${buybackPrice.toFixed(2)} (≈ ¥${(buybackPrice * USD_TO_CNY).toFixed(2)})`,
  }
}
