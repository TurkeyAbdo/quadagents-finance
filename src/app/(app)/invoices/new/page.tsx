import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "@/components/invoice-form";
import type { Client, ExchangeRate } from "@/lib/types";

export const dynamic = "force-dynamic";

async function computeNextInvoiceNumber(): Promise<string> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`);
  let maxN = 0;
  for (const row of data ?? []) {
    const suffix = String(row.invoice_number).slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > maxN) maxN = n;
  }
  const next = String(maxN + 1).padStart(4, "0");
  return `${prefix}${next}`;
}

export default async function NewInvoicePage() {
  const supabase = createClient();
  const [{ data: clients }, { data: rates }, nextNumber] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("exchange_rates").select("*"),
    computeNextInvoiceNumber(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invoice number auto-generated. You can download a PDF after saving.
        </p>
      </div>
      <InvoiceForm
        mode="create"
        clients={(clients ?? []) as Client[]}
        rates={(rates ?? []) as ExchangeRate[]}
        nextInvoiceNumber={nextNumber}
      />
    </div>
  );
}
