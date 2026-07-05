/**
 * 货币格式化工具
 * 统一使用 USD 作为主币种，CNY 为参考币种
 * 汇率：1 USD = 7.25 CNY
 */

export const USD_TO_CNY_RATE = 7.25;

/**
 * 将 USD 金额转为 CNY 金额
 */
export function usdToCny(usd: number): number {
  return Math.round(usd * USD_TO_CNY_RATE);
}

/**
 * 格式化 USD 显示，带千分位
 */
export function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * 格式化 CNY 显示，带千分位
 */
export function formatCNY(amount: number): string {
  return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * 双币种展示：USD 为主，CNY 为参考小字
 * 返回 { primary: string, secondary: string }
 */
export function dualCurrency(usd: number): { primary: string; secondary: string } {
  return {
    primary: formatUSD(usd),
    secondary: '≈ ' + formatCNY(usdToCny(usd)),
  };
}

/**
 * CNY 万 转 USD
 * 输入如 "¥50万" → 输出 USD 数字
 */
export function cnyWanToUsd(cnyWanStr: string): number {
  const num = parseFloat(cnyWanStr.replace('¥', '').replace('万', ''));
  return Math.round((num * 10000) / USD_TO_CNY_RATE);
}
