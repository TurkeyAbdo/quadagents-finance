"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Download, CheckCircle2, Trash2, Send } from "lucide-react";
import { createClient } from "@/lib/db/client";
import { generateInvoicePDF } from "@/lib/pdf";
import { formatCurrency, formatSDG } from "@/lib/currency";
import { InvoiceForm } from "@/components/invoice-form";
import type {
  Client,
  Category,
  CompanySettings,
  ExchangeRate,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  clients: Client[];
  rates: ExchangeRate[];
  company: CompanySettings | null;
}

function statusBadge(s: InvoiceStatus) {
  switch (s) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "sent":
      return <Badge variant="info">Sent</Badge>;
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
  }
}

export function InvoiceDetailClient({
  invoice,
  items,
  clients,
  rates,
  company,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const client = clients.find((c) => c.id === invoice.client_id) ?? null;

  async function onDownloadPDF() {
    setBusy("pdf");
    try {
      generateInvoicePDF({ invoice, items, client, company });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "PDF generation failed",
        description:
          e instanceof Error ? e.message : "Failed to generate PDF",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onMarkAsSent() {
    setBusy("send");
    const db = createClient();
    const { error } = await db
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoice.id);
    setBusy(null);
    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Invoice marked as sent" });
    router.refresh();
  }

  async function onMarkAsPaid() {
    setBusy("paid");
    const db = createClient();

    // Idempotency: check if an income transaction already exists for this invoice.
    const { data: existing } = await db
      .from("transactions")
      .select("id")
      .eq("invoice_id", invoice.id)
      .eq("type", "income")
      .limit(1);

    // Always mark the invoice paid (safe even if status already = paid)
    const paidAt = new Date().toISOString();
    const { error: invErr } = await db
      .from("invoices")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", invoice.id);

    if (invErr) {
      setBusy(null);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: invErr.message,
      });
      return;
    }

    if (!existing || existing.length === 0) {
      // Find a reasonable income category to attribute the payment to.
      const { data: cats } = await db
        .from("categories")
        .select("*")
        .eq("type", "income")
        .order("name");
      const incomeCats = (cats ?? []) as Category[];
      const preferred =
        incomeCats.find((c) => c.name === "Client Revenue") ??
        incomeCats[0] ??
        null;

      const { error: txErr } = await db.from("transactions").insert({
        type: "income",
        date: new Date().toISOString().slice(0, 10),
        amount: invoice.total,
        currency: invoice.currency,
        sdg_amount: invoice.sdg_total,
        brand: invoice.brand,
        category_id: preferred?.id ?? null,
        description: `Payment for ${invoice.invoice_number}`,
        client_id: invoice.client_id,
        invoice_id: invoice.id,
      });

      if (txErr) {
        setBusy(null);
        toast({
          variant: "destructive",
          title: "Update failed",
          description: txErr.message,
        });
        return;
      }
    }

    setBusy(null);
    toast({ title: "Invoice marked as paid" });
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setBusy("delete");
    const db = createClient();
    // Cascades to invoice_items; linked transactions keep their history with invoice_id set null.
    const { error } = await db
      .from("invoices")
      .delete()
      .eq("id", invoice.id);
    setBusy(null);
    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Invoice deleted" });
    router.push("/invoices");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Edit {invoice.invoice_number}
          </h1>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Back
          </Button>
        </div>
        <InvoiceForm
          mode="edit"
          initial={invoice}
          initialItems={items}
          clients={clients}
          rates={rates}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {invoice.invoice_number}
            </h1>
            {statusBadge(invoice.status)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {invoice.brand} · Issued{" "}
            {format(new Date(invoice.issue_date), "MMM d, yyyy")} · Due{" "}
            {format(new Date(invoice.due_date), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={onDownloadPDF}
            disabled={busy === "pdf"}
          >
            <Download className="h-4 w-4" />
            {busy === "pdf" ? "Preparing..." : "Download PDF"}
          </Button>

          {invoice.status === "draft" && (
            <Button
              variant="secondary"
              onClick={onMarkAsSent}
              disabled={busy === "send"}
            >
              <Send className="h-4 w-4" /> Mark as Sent
            </Button>
          )}

          {invoice.status !== "paid" && (
            <Button onClick={onMarkAsPaid} disabled={busy === "paid"}>
              <CheckCircle2 className="h-4 w-4" />
              {busy === "paid" ? "Saving..." : "Mark as Paid"}
            </Button>
          )}

          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>

          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={busy === "delete"}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-right">
                      {Number(it.quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(it.unit_price, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(it.total, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground">
                    Tax ({Number(invoice.tax_rate).toFixed(2)}%)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.tax_amount, invoice.currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </TableCell>
                </TableRow>
                {invoice.currency !== "SDG" && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-right text-xs text-muted-foreground"
                    >
                      SDG equivalent
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatSDG(invoice.sdg_total)}
                    </TableCell>
                  </TableRow>
                )}
              </TableFooter>
            </Table>
            {invoice.notes && (
              <div className="mt-5">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </h3>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Client</CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <div className="space-y-1 text-sm">
                <div className="font-medium text-foreground">{client.name}</div>
                {client.email && (
                  <div className="text-muted-foreground">{client.email}</div>
                )}
                {client.phone && (
                  <div className="text-muted-foreground">{client.phone}</div>
                )}
                {client.address && (
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {client.address}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No client linked.</p>
            )}
            <div className="mt-5">
              <Link
                href="/clients"
                className="text-sm text-primary hover:underline"
              >
                Manage clients →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
