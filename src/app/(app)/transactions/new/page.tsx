import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import type { Category, Client, ExchangeRate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [{ data: cats }, { data: clients }, { data: rates }] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("exchange_rates").select("*"),
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
