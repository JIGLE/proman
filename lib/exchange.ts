import fs from 'fs';
import path from 'path';

type RatesData = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'exchange-rates.json');
const TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFromProvider(base = 'EUR'): Promise<RatesData> {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Exchange provider returned ${res.status}`);
  const json = await res.json();
  return {
    base: json.base,
    date: json.date,
    rates: json.rates,
  };
}

function readCache(): Record<string, { fetchedAt: number; data: RatesData }> | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(cache: Record<string, { fetchedAt: number; data: RatesData }>) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write exchange cache:', err);
  }
}

export async function getRates(base = 'EUR'): Promise<RatesData> {
  try {
    const cache = readCache() || {};
    const entry = cache[base];
    const now = Date.now();
    if (entry && now - entry.fetchedAt < TTL) {
      return entry.data;
    }

    const fresh = await fetchFromProvider(base);
    cache[base] = { fetchedAt: now, data: fresh };
    writeCache(cache);
    return fresh;
  } catch (err) {
    // Try to return any cached value as fallback
    const cache = readCache();
    if (cache) {
      const first = Object.values(cache)[0];
      if (first) return first.data;
    }
    throw err;
  }
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const rates = await getRates(from);
  const rate = rates.rates[to];
  if (!rate) throw new Error(`No rate available for ${to}`);
  return amount * rate;
}

export default { getRates, convertAmount };
