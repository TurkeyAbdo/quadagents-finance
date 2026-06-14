"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { convertToSDG, ratesToMap } from "@/lib/currency";
import {
  BRANDS,
  type Brand,
  type Category,
  type Client,
  type Currency,
  type ExchangeRate,
  type Transaction,
  type TxnType,
} from "@/lib/types";
import { useCurrencies } from "@/hooks/use-currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface Props {
  mode: "create" | "edit";
  initial?: Transaction;
  categories: Category[];
  clients: Client[];
  rates: ExchangeRate[];
}

export function TransactionForm({
  mode,
  initial,
  categories,
  clients,
  rates,
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<TxnType>(initial?.type ?? "expense");
  const [date, setDate] = useState<string>(initial?.date ?? today);
  const [amount, setAmount] = useState<string>(
    initial?.amount ? String(initial.amount) : ""
  );
  const [currency, setCurrency] = useState<Currency>(
    initial?.currency ?? "SDG"
  );
  const { currencies } = useCurrencies();
  const [brand, setBrand] = useState<Brand>(initial?.brand ?? "Shared");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [clientId, setClientId] = useState<string>(initial?.client_id ?? "");
  const [invoiceRef, setInvoiceRef] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const rateMap = useMemo(() => ratesToMap(rates), [rates]);
  const filteredCategories = categories.filter((c) => c.type === type);

  const numericAmount = Number(amount || 0);
  const sdgPreview = convertToSDG(numericAmount, currency, rateMap);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!numericAmount || numericAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Amount must be greater than 0.",
      });
      return;
    }
    if (!categoryId) {
      toast({
        variant: "destructive",
        title: "Missing category",
        description: "Please choose a category.",
      });
      return;
    }

    setLoading(true);
    const db = createClient();

    const payload = {
      type,
      date,
      amount: numericAmount,
      currency,
      sdg_amount: sdgPreview,
      brand,
      category_id: categoryId,
      description: description || null,
      client_id: clientId || null,
    };

    let resErr = null;
    if (mode === "create") {
      const { error } = await db.from("transactions").insert(payload);
      resErr = error;
    } else if (initial) {
      const { error } = await db
        .from("transactions")
        .update(payload)
        .eq("id", initial.id);
      resErr = error;
    }

    setLoading(false);
    if (resErr) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: resErr.message,
      });
      return;
    }
    toast({
      title: mode === "create" ? "Transaction created" : "Transaction updated",
    });
    router.push("/transactions");
    router.refresh();
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    const db = createClient();
    const { error } = await db
      .from("transactions")
      .delete()
      .eq("id", initial.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Transaction deleted" });
    router.push("/transactions");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="txn-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as TxnType);
                  setCategoryId("");
                }}
              >
                <SelectTrigger id="txn-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                <SelectTrigger id="txn-currency">
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
              <p className="text-xs text-muted-foreground">
                SDG equivalent:{" "}
                <span className="font-medium text-foreground">
                  {sdgPreview.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  SDG
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-brand">Brand</Label>
              <Select
                value={brand}
                onValueChange={(v) => setBrand(v as Brand)}
              >
                <SelectTrigger id="txn-brand">
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
              <Label htmlFor="txn-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="txn-category">
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="txn-description">Description</Label>
              <Input
                id="txn-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note about this transaction"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-client">
                Client / Vendor{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={clientId || "__none__"}
                onValueChange={(v) => setClientId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="txn-client">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-invoice-ref">
                Invoice Reference{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="txn-invoice-ref"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-0001"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/transactions")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : mode === "create"
                  ? "Save Transaction"
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
