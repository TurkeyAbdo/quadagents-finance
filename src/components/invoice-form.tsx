"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { convertToSDG, ratesToMap } from "@/lib/currency";
import {
  BRANDS,
  type Brand,
  type Client,
  type Currency,
  type ExchangeRate,
  type Invoice,
  type InvoiceItem,
} from "@/lib/types";
import { useCurrencies } from "@/hooks/use-currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface LineItemDraft {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  mode: "create" | "edit";
  initial?: Invoice;
  initialItems?: InvoiceItem[];
  clients: Client[];
  rates: ExchangeRate[];
  /** Next sequential invoice number for the current year, for create mode */
  nextInvoiceNumber?: string;
}

export function InvoiceForm({
  mode,
  initial,
  initialItems,
  clients,
  rates,
  nextInvoiceNumber,
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  const [invoiceNumber] = useState<string>(
    initial?.invoice_number ?? nextInvoiceNumber ?? ""
  );
  const [clientId, setClientId] = useState<string>(initial?.client_id ?? "");
  const [brand, setBrand] = useState<Brand>(initial?.brand ?? "QuadAgents");
  const [issueDate, setIssueDate] = useState<string>(
    initial?.issue_date ?? today
  );
  const [dueDate, setDueDate] = useState<string>(
    initial?.due_date ?? inTwoWeeks
  );
  const [currency, setCurrency] = useState<Currency>(
    initial?.currency ?? "SDG"
  );
  const { currencies } = useCurrencies();
  const [taxRate, setTaxRate] = useState<number>(Number(initial?.tax_rate ?? 0));
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [items, setItems] = useState<LineItemDraft[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((i) => ({
          id: i.id,
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        }))
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );
  const [loading, setLoading] = useState(false);

  const rateMap = useMemo(() => ratesToMap(rates), [rates]);

  const subtotal = items.reduce(
    (s, it) => s + Number(it.quantity) * Number(it.unit_price),
    0
  );
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;
  const sdgTotal = convertToSDG(total, currency, rateMap);

  function updateItem(idx: number, patch: Partial<LineItemDraft>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  }
  function removeItem(idx: number) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) {
      toast({
        variant: "destructive",
        title: "Missing client",
        description: "Please pick a client.",
      });
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      toast({
        variant: "destructive",
        title: "Incomplete line items",
        description: "Every line item needs a description.",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const invoicePayload = {
      invoice_number: invoiceNumber,
      client_id: clientId,
      brand,
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      sdg_total: sdgTotal,
      notes: notes || null,
    };

    let invoiceId = initial?.id;

    if (mode === "create") {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoicePayload)
        .select("id")
        .single();
      if (error) {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Save failed",
          description: error.message,
        });
        return;
      }
      invoiceId = data!.id;
    } else if (initial) {
      const { error } = await supabase
        .from("invoices")
        .update(invoicePayload)
        .eq("id", initial.id);
      if (error) {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Save failed",
          description: error.message,
        });
        return;
      }
      // Replace line items wholesale
      await supabase.from("invoice_items").delete().eq("invoice_id", initial.id);
    }

    if (invoiceId) {
      const itemRows = items.map((it) => ({
        invoice_id: invoiceId!,
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        total: Number(it.quantity) * Number(it.unit_price),
      }));
      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(itemRows);
      if (itemsErr) {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Save failed",
          description: itemsErr.message,
        });
        return;
      }
    }

    setLoading(false);
    toast({
      title: mode === "create" ? "Invoice created" : "Invoice updated",
    });
    router.push(`/invoices/${invoiceId}`);
    router.refresh();
  }

  const fmt = (n: number) =>
    `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-number">Invoice Number</Label>
            <Input id="inv-number" value={invoiceNumber} disabled />
            <p className="text-xs text-muted-foreground">
              Auto-generated. Editable only via database.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-brand">Brand</Label>
            <Select
              value={brand}
              onValueChange={(v) => setBrand(v as Brand)}
            >
              <SelectTrigger id="inv-brand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="inv-client">
                <SelectValue placeholder="Pick a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
            >
              <SelectTrigger id="inv-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-issue">Issue Date</Label>
            <Input
              id="inv-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-due">Due Date</Label>
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Line items</h3>
            <Button type="button" variant="secondary" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-40">Unit price</TableHead>
                  <TableHead className="w-40 text-right">
                    Line total
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2 pr-2">
                      <Input
                        value={it.description}
                        onChange={(e) =>
                          updateItem(idx, { description: e.target.value })
                        }
                        required
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity: Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.unit_price}
                        onChange={(e) =>
                          updateItem(idx, {
                            unit_price: Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2 text-right text-foreground">
                      {fmt(Number(it.quantity) * Number(it.unit_price))}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-tax">Tax rate (%)</Label>
              <Input
                id="inv-tax"
                type="number"
                step="0.01"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="md:text-right space-y-1 text-sm">
              <div className="flex items-center justify-between md:justify-end gap-6 text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">
                  {fmt(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-6 text-muted-foreground">
                <span>Tax</span>
                <span className="text-foreground font-medium">
                  {fmt(taxAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-6 pt-2 border-t">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-foreground font-semibold">
                  {fmt(total)}
                </span>
              </div>
              {currency !== "SDG" && (
                <div className="flex items-center justify-between md:justify-end gap-6 text-xs text-muted-foreground">
                  <span>SDG equivalent</span>
                  <span>
                    {sdgTotal.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    SDG
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
              className="min-h-[90px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/invoices")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : mode === "create"
            ? "Create Invoice"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
