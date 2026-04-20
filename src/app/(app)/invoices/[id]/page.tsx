import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();

  const [
    { data: invoice },
    { data: items },
    { data: clients },
    { data: rates },
    { data: company },
  ] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", params.id).single(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", params.id),
    supabase.from("clients").select("*").order("name"),
    supabase.from("exchange_rates").select("*"),
    supabase.from("company_settings").select("*").eq("id", 1).single(),
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
