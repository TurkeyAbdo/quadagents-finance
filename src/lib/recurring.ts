import { convertToSDG, ratesToMap } from "./currency";
import { query, withTransaction } from "./db/postgres";
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
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const today = now.getDate();
  const todayIso = now.toISOString().slice(0, 10);

  const recs = await query<RecurringExpense>(
    "select * from recurring_expenses where active = true"
  );

  if (!recs || recs.length === 0) return 0;

  const rates = await query<ExchangeRate>("select * from exchange_rates");
  const rateMap = ratesToMap(rates);

  let inserted = 0;
  for (const r of recs as RecurringExpense[]) {
    if (r.last_logged_month === currentMonth) continue;
    if (today < r.day_of_month) continue;

    const sdg_amount = convertToSDG(Number(r.amount), r.currency, rateMap);

    const didInsert = await withTransaction(async (client) => {
      const claimed = await client.query(
        `update recurring_expenses
         set last_logged_month = $1
         where id = $2 and (last_logged_month is null or last_logged_month <> $1)
         returning id`,
        [currentMonth, r.id]
      );
      if (claimed.rowCount === 0) return false;

      await client.query(
        `insert into transactions (
          type,
          date,
          amount,
          currency,
          sdg_amount,
          brand,
          category_id,
          description,
          is_from_recurring,
          recurring_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
        [
          "expense",
          todayIso,
          Number(r.amount),
          r.currency,
          sdg_amount,
          r.brand,
          r.category_id,
          `[Recurring] ${r.name}`,
          r.id,
        ]
      );
      return true;
    });

    if (didInsert) {
      inserted += 1;
    }
  }
  return inserted;
}
