import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import type {
  Category,
  Client,
  ExchangeRate,
  Transaction,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ data: txn }, { data: cats }, { data: clients }, { data: rates }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("id", params.id)
        .single(),
      supabase.from("categories").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("exchange_rates").select("*"),
    ]);

  if (!txn) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Edit transaction</h1>
      </div>
      <TransactionForm
        mode="edit"
        initial={txn as Transaction}
        categories={(cats ?? []) as Category[]}
        clients={(clients ?? []) as Client[]}
        rates={(rates ?? []) as ExchangeRate[]}
      />
    </div>
  );
}
