/**
 * 货币格式化工具 — 根据用户语言自动选择本地货币
 *
 * 语言 → 货币映射：
 *   zh-CN → CNY(¥)    zh-TW → HKD(HK$)
 *   en    → USD($)    bn    → BDT(৳)
 *   km    → KHR(៛)
 *
 * 汇率从 /api/exchange-rates 获取，每日自动刷新。
 */

// ─── 汇率常量（fallback） ────────────────────────────────
export const USD_TO_CNY = 7.25;
export const USD_TO_HKD = 7.81;
export const USD_TO_BDT = 119.5;
export const USD_TO_KHR = 4080;

// ─── 运行时汇率（启动后从 API 加载） ──────────────────────
let dynamicRates: Record<string, number> = {
  CNY: USD_TO_CNY,
  HKD: USD_TO_HKD,
  BDT: USD_TO_BDT,
  KHR: USD_TO_KHR,
};

let ratesLoaded = false;
let ratesPromise: Promise<void> | null = null;

/**
 * 从 API 获取最新汇率并缓存（前端调用）
 */
export async function fetchRates(): Promise<Record<string, number>> {
  if (ratesLoaded) return dynamicRates;
  if (ratesPromise) {
    await ratesPromise;
    return dynamicRates;
  }
  ratesPromise = (async () => {
    try {
      const res = await fetch('/api/exchange-rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          dynamicRates = { ...dynamicRates, ...data.rates };
        }
      }
    } catch {
      // 使用 fallback 常量
    }
  })();
  await ratesPromise;
  ratesLoaded = true;
  return dynamicRates;
}

export function getRates(): Record<string, number> {
  return dynamicRates;
}

// ─── 语言-货币配置 ────────────────────────────────────────
interface CurrencyConfig {
  code: string;    // ISO 货币代码
  symbol: string;  // 货币符号
  locale: string;  // toLocaleString 用的 locale
  rate: number;    // 1 USD = ? 该货币
}

const CURRENCY_MAP: Record<string, CurrencyConfig> = {
  'zh-CN': { code: 'CNY', symbol: '¥', locale: 'zh-CN', rate: USD_TO_CNY },
  'zh-TW': { code: 'HKD', symbol: 'HK$', locale: 'zh-TW', rate: USD_TO_HKD },
  en:      { code: 'USD', symbol: '$',   locale: 'en-US', rate: 1 },
  bn:      { code: 'BDT', symbol: '৳',  locale: 'bn-BD', rate: USD_TO_BDT },
  km:      { code: 'KHR', symbol: '៛', locale: 'km-KH', rate: USD_TO_KHR },
};

/**
 * 根据语言获取货币配置
 */
export function getCurrencyConfig(locale: string): CurrencyConfig {
  return CURRENCY_MAP[locale] || CURRENCY_MAP['en'];
}

/**
 * 1 USD → 目标货币金额
 */
export function usdToCurrency(usd: number, locale: string): number {
  const cfg = getCurrencyConfig(locale);
  const rate = dynamicRates[cfg.code] ?? cfg.rate;
  return Math.round(usd * rate);
}

/**
 * USD 金额 → CNY（保留兼容，内部走动态汇率）
 */
export function usdToCny(usd: number): number {
  const rate = dynamicRates.CNY ?? USD_TO_CNY;
  return Math.round(usd * rate);
}

/**
 * 格式化 USD 显示（底层方法）
 */
export function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化指定语言对应的本地货币显示
 * @param amountUsd  美元金额
 * @param locale     语言代码（zh-CN / zh-TW / en / bn / km）
 */
export function formatCurrency(amountUsd: number, locale: string): string {
  const cfg = getCurrencyConfig(locale);
  if (cfg.code === 'USD') return formatUSD(amountUsd);
  const localAmount = usdToCurrency(amountUsd, locale);
  return cfg.symbol + localAmount.toLocaleString(cfg.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * 根据语言返回主/副货币展示
 * - 非 USD 语言：主显示本地货币，副显示 USD 参考
 * - USD 语言：仅主显示 USD，无副显示
 */
export function localeCurrency(
  amountUsd: number,
  locale: string,
): { primary: string; secondary?: string } {
  const cfg = getCurrencyConfig(locale);
  if (cfg.code === 'USD') {
    return { primary: formatUSD(amountUsd) };
  }
  return {
    primary: formatCurrency(amountUsd, locale),
    secondary: formatUSD(amountUsd),
  };
}

// ─── 保留旧的 CNY 格式化（向后兼容特殊情况） ──────────────
export function formatCNY(amount: number): string {
  return '¥' + amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * 双币种展示（USD + CNY 参考）— 保留旧接口
 * @deprecated 新代码请使用 localeCurrency(amountUsd, i18n.language)
 */
export function dualCurrency(usd: number): { primary: string; secondary: string } {
  return {
    primary: formatUSD(usd),
    secondary: '≈ ' + formatCNY(usdToCny(usd)),
  };
}

/**
 * CNY 万 转 USD（保留兼容）
 */
export function cnyWanToUsd(cnyWanStr: string): number {
  const num = parseFloat(cnyWanStr.replace('¥', '').replace('万', ''));
  const rate = dynamicRates.CNY ?? USD_TO_CNY;
  return Math.round((num * 10000) / rate);
}
