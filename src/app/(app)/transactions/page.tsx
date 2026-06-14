"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/db/client";
import { formatCurrency, formatSDG } from "@/lib/currency";
import {
  BRANDS,
  type Brand,
  type Category,
  type Client,
  type Transaction,
  type TxnType,
} from "@/lib/types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type FilterType = TxnType | "all";

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<FilterType>("all");
  const [brand, setBrand] = useState<Brand | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");

  const load = useCallback(async () => {
    const db = createClient();
    setLoading(true);
    const [{ data: tx }, { data: c }, { data: cl }] = await Promise.all([
      db
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("categories").select("*"),
      db.from("clients").select("*"),
    ]);
    setTxns((tx ?? []) as Transaction[]);
    setCats((c ?? []) as Category[]);
    setClients((cl ?? []) as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catMap = useMemo(
    () => new Map(cats.map((c) => [c.id, c])),
    [cats]
  );
  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );

  const filtered = txns.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (type !== "all" && t.type !== type) return false;
    if (brand !== "all" && t.brand !== brand) return false;
    if (categoryId !== "all" && t.category_id !== categoryId) return false;
    return true;
  });

  const totalSDG = filtered.reduce((s, t) => {
    return s + (t.type === "income" ? 1 : -1) * Number(t.sdg_amount);
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track income and expenses in any currency — stored in SDG.
          </p>
        </div>
        <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={load} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4" /> New transaction
          </Link>
        </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-from">From</Label>
              <Input
                id="txn-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-to">To</Label>
              <Input
                id="txn-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-type-filter">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as FilterType)}
              >
                <SelectTrigger id="txn-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-brand-filter">Brand</Label>
              <Select
                value={brand}
                onValueChange={(v) => setBrand(v as Brand | "all")}
              >
                <SelectTrigger id="txn-brand-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="txn-cat-filter">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="txn-cat-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No transactions match these filters.
              </p>
              <Button asChild className="mt-4">
                <Link href="/transactions/new">
                  <Plus className="h-4 w-4" /> Add transaction
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Client / Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">SDG</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {format(new Date(t.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {t.type === "income" ? (
                        <Badge variant="success">Income</Badge>
                      ) : (
                        <Badge variant="destructive">Expense</Badge>
                      )}
                    </TableCell>
                    <TableCell>{t.brand}</TableCell>
                    <TableCell>
                      {catMap.get(t.category_id ?? "")?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {t.description ?? ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clientMap.get(t.client_id ?? "")?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.amount, t.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatSDG(t.sdg_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                      >
                        <Link href={`/transactions/${t.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-right text-muted-foreground"
                  >
                    Net (filtered):
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatSDG(totalSDG)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
