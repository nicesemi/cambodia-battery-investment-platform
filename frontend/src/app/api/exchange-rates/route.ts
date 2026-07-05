import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'data', 'exchange-rates.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RatesCache {
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: number; // timestamp
}

function readCache(): RatesCache | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(data: RatesCache): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function fetchFreshRates(): Promise<RatesCache> {
  const res = await fetch('https://api.frankfurter.dev/latest?from=USD', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
  const data = await res.json();
  const rates: Record<string, number> = {};
  // Extract only the currencies we need
  const needed = ['CNY', 'HKD', 'BDT', 'KHR'];
  for (const code of needed) {
    if (data.rates[code]) rates[code] = data.rates[code];
  }
  return {
    base: 'USD',
    date: data.date,
    rates,
    fetchedAt: Date.now(),
  };
}

const FALLBACK_RATES: RatesCache = {
  base: 'USD',
  date: '2026-07-05',
  rates: { CNY: 7.25, HKD: 7.81, BDT: 119.5, KHR: 4080 },
  fetchedAt: 0,
};

async function getRates(): Promise<RatesCache> {
  const cached = readCache();
  if (cached && (Date.now() - cached.fetchedAt) < TTL_MS) {
    return cached;
  }
  try {
    const fresh = await fetchFreshRates();
    writeCache(fresh);
    return fresh;
  } catch {
    // Return stale cache if available, otherwise fallback
    return cached || FALLBACK_RATES;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const rates = await getRates();
    return NextResponse.json({
      base: rates.base,
      date: rates.date,
      rates: rates.rates,
    });
  } catch {
    return NextResponse.json(FALLBACK_RATES);
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const fresh = await fetchFreshRates();
    writeCache(fresh);
    return NextResponse.json({
      base: fresh.base,
      date: fresh.date,
      rates: fresh.rates,
      refreshed: true,
    });
  } catch {
    const fallback = readCache() || FALLBACK_RATES;
    return NextResponse.json(
      { ...fallback, refreshed: false, error: 'Failed to fetch fresh rates, using cache' },
      { status: 500 }
    );
  }
}
