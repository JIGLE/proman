// Client-side helper to call server exchange rates endpoint
export async function getRatesClient(base = "EUR") {
  const res = await fetch(`/api/exchange/rates?base=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const json = await res.json();
  if (!json || !json.success) throw new Error(json?.error || "Invalid exchange response");
  return json.data as { base: string; date: string; rates: Record<string, number> };
}

export async function convertClient(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const data = await getRatesClient(from);
  const rate = data.rates?.[to];
  if (!rate) throw new Error(`No rate for ${to}`);
  return amount * rate;
}

export default { getRatesClient, convertClient };
