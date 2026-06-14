import { createClient } from "@/lib/db/server";
import { TransactionForm } from "@/components/transaction-form";
import type { Category, Client, ExchangeRate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const db = createClient();
  const [{ data: cats }, { data: clients }, { data: rates }] =
    await Promise.all([
      db.from("categories").select("*").order("name"),
      db.from("clients").select("*").order("name"),
      db.from("exchange_rates").select("*"),
    ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">New transaction</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Original amount is preserved; SDG equivalent is computed from the
          current exchange rate.
        </p>
      </div>
      <TransactionForm
        mode="create"
        categories={(cats ?? []) as Category[]}
        clients={(clients ?? []) as Client[]}
        rates={(rates ?? []) as ExchangeRate[]}
      />
    </div>
  );
}
