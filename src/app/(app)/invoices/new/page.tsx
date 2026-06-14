import { createClient } from "@/lib/db/server";
import { InvoiceForm } from "@/components/invoice-form";
import type { Client, ExchangeRate } from "@/lib/types";

export const dynamic = "force-dynamic";

async function computeNextInvoiceNumber(): Promise<string> {
  const db = createClient();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await db
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
  const db = createClient();
  const [{ data: clients }, { data: rates }, nextNumber] = await Promise.all([
    db.from("clients").select("*").order("name"),
    db.from("exchange_rates").select("*"),
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
