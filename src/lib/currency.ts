import type { Currency, ExchangeRate } from "./types";

export function formatSDG(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} SDG`;
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: Currency = "SDG"
): string {
  const n = Number(amount ?? 0);
  const formatted = n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

/**
 * Convert an amount in `currency` to SDG using provided rate map.
 * rate_to_sdg is "how many SDG per 1 unit of the currency".
 */
export function convertToSDG(
  amount: number,
  currency: Currency,
  rates: ExchangeRate[] | Record<string, number>
): number {
  if (currency === "SDG") return amount;
  let rate = 1;
  if (Array.isArray(rates)) {
    const found = rates.find((r) => r.currency === currency);
    rate = found ? Number(found.rate_to_sdg) : 1;
  } else {
    rate = Number(rates[currency] ?? 1);
  }
  return amount * rate;
}

export function ratesToMap(rates: ExchangeRate[]): Record<string, number> {
  const map: Record<string, number> = { SDG: 1 };
  for (const r of rates) map[r.currency] = Number(r.rate_to_sdg);
  return map;
}
