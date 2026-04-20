import { createClient } from "./supabase/server";
import { convertToSDG, ratesToMap } from "./currency";
import type { ExchangeRate, RecurringExpense } from "./types";

/**
 * Auto-log recurring expenses for the current month if:
 * - the recurring item is active,
 * - today's day >= day_of_month,
 * - last_logged_month !== current YYYY-MM.
 *
 * Idempotent: updating last_logged_month prevents duplicates on repeated calls.
 * Call from dashboard load / post-login.
 */
export async function autoLogRecurringExpenses(): Promise<number> {
  const supabase = createClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const today = now.getDate();
  const todayIso = now.toISOString().slice(0, 10);

  const { data: recs } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("active", true);

  if (!recs || recs.length === 0) return 0;

  const { data: rates } = await supabase
    .from("exchange_rates")
    .select("*");
  const rateMap = ratesToMap((rates ?? []) as ExchangeRate[]);

  let inserted = 0;
  for (const r of recs as RecurringExpense[]) {
    if (r.last_logged_month === currentMonth) continue;
    if (today < r.day_of_month) continue;

    const sdg_amount = convertToSDG(Number(r.amount), r.currency, rateMap);

    const { error: txErr } = await supabase.from("transactions").insert({
      type: "expense",
      date: todayIso,
      amount: Number(r.amount),
      currency: r.currency,
      sdg_amount,
      brand: r.brand,
      category_id: r.category_id,
      description: `[Recurring] ${r.name}`,
      is_from_recurring: true,
      recurring_id: r.id,
    });

    if (!txErr) {
      await supabase
        .from("recurring_expenses")
        .update({ last_logged_month: currentMonth })
        .eq("id", r.id);
      inserted += 1;
    }
  }
  return inserted;
}
