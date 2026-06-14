import { notFound } from "next/navigation";
import { createClient } from "@/lib/db/server";
import type {
  Client,
  CompanySettings,
  ExchangeRate,
  Invoice,
  InvoiceItem,
} from "@/lib/types";
import { InvoiceDetailClient } from "./invoice-detail-client";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();

  const [
    { data: invoice },
    { data: items },
    { data: clients },
    { data: rates },
    { data: company },
  ] = await Promise.all([
    db.from("invoices").select("*").eq("id", params.id).single(),
    db
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", params.id),
    db.from("clients").select("*").order("name"),
    db.from("exchange_rates").select("*"),
    db.from("company_settings").select("*").eq("id", 1).single(),
  ]);

  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoice as Invoice}
      items={(items ?? []) as InvoiceItem[]}
      clients={(clients ?? []) as Client[]}
      rates={(rates ?? []) as ExchangeRate[]}
      company={(company ?? null) as CompanySettings | null}
    />
  );
}
