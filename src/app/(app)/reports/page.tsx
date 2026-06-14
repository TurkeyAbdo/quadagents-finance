"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfYear } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/db/client";
import { formatSDG } from "@/lib/currency";
import { MonthlyBar } from "@/components/charts/monthly-bar";
import { downloadCSV } from "@/lib/csv";
import { downloadXLSX } from "@/lib/xlsx";
import {
  BRANDS,
  type Brand,
  type Category,
  type Transaction,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const today = new Date();
  const yStart = startOfYear(today).toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  const [from, setFrom] = useState(yStart);
  const [to, setTo] = useState(todayIso);
  const [brand, setBrand] = useState<Brand | "all">("all");
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const db = createClient();
      setLoading(true);
      const [{ data: tx }, { data: c }] = await Promise.all([
        db
          .from("transactions")
          .select("*")
          .order("date", { ascending: true }),
        db.from("categories").select("*"),
      ]);
      setTxns((tx ?? []) as Transaction[]);
      setCats((c ?? []) as Category[]);
      setLoading(false);
    })();
  }, []);

  const catMap = useMemo(
    () => new Map(cats.map((c) => [c.id, c])),
    [cats]
  );

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (brand !== "all" && t.brand !== brand) return false;
      return true;
    });
  }, [txns, from, to, brand]);

  // Monthly P&L
  const monthlyMap = new Map<
    string,
    { income: number; expense: number }
  >();
  for (const t of filtered) {
    const key = format(new Date(t.date), "MMM yy");
    const cur = monthlyMap.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += Number(t.sdg_amount);
    else cur.expense += Number(t.sdg_amount);
    monthlyMap.set(key, cur);
  }
  const monthlyRows = Array.from(monthlyMap.entries()).map(
    ([month, v]) => ({
      month,
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    })
  );

  // By category
  const byCatIncome = new Map<string, number>();
  const byCatExpense = new Map<string, number>();
  for (const t of filtered) {
    const name = catMap.get(t.category_id ?? "")?.name ?? "Uncategorized";
    const target = t.type === "income" ? byCatIncome : byCatExpense;
    target.set(name, (target.get(name) ?? 0) + Number(t.sdg_amount));
  }

  // Brand comparison
  const byBrand = {
    QuadAgents: { income: 0, expense: 0 },
    Mansatak: { income: 0, expense: 0 },
    Shared: { income: 0, expense: 0 },
  } as Record<Brand, { income: number; expense: number }>;
  for (const t of filtered) {
    const b = t.brand as Brand;
    if (t.type === "income") byBrand[b].income += Number(t.sdg_amount);
    else byBrand[b].expense += Number(t.sdg_amount);
  }

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.sdg_amount), 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.sdg_amount), 0);

  function exportCSV() {
    const rows = filtered.map((t) => ({
      date: t.date,
      type: t.type,
      brand: t.brand,
      category: catMap.get(t.category_id ?? "")?.name ?? "",
      amount: Number(t.amount),
      currency: t.currency,
      sdg_amount: Number(t.sdg_amount),
      description: t.description ?? "",
    }));
    downloadCSV(
      `transactions_${from}_to_${to}`,
      rows,
      [
        "date",
        "type",
        "brand",
        "category",
        "amount",
        "currency",
        "sdg_amount",
        "description",
      ]
    );
  }

  function exportXLSX() {
    const txRows = filtered.map((t) => ({
      Date: t.date,
      Type: t.type,
      Brand: t.brand,
      Category: catMap.get(t.category_id ?? "")?.name ?? "",
      Amount: Number(t.amount),
      Currency: t.currency,
      "SDG Amount": Number(t.sdg_amount),
      Description: t.description ?? "",
    }));
    const monthRows = monthlyRows.map((r) => ({
      Month: r.month,
      Income: r.income,
      Expense: r.expense,
      Net: r.net,
    }));
    const brandRows = (Object.keys(byBrand) as Brand[]).map((b) => ({
      Brand: b,
      Income: byBrand[b].income,
      Expense: byBrand[b].expense,
      Net: byBrand[b].income - byBrand[b].expense,
    }));
    const expCatRows = Array.from(byCatExpense.entries()).map(
      ([Category, Total]) => ({ Category, Total })
    );
    const incCatRows = Array.from(byCatIncome.entries()).map(
      ([Category, Total]) => ({ Category, Total })
    );
    downloadXLSX(`report_${from}_to_${to}`, [
      { name: "Transactions", rows: txRows },
      { name: "Monthly P&L", rows: monthRows },
      { name: "By Brand", rows: brandRows },
      { name: "Income by Category", rows: incCatRows },
      { name: "Expense by Category", rows: expCatRows },
    ]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Filter by date and brand. Export CSV or Excel for anything below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={exportXLSX}>
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rpt-from">From</Label>
              <Input
                id="rpt-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rpt-to">To</Label>
              <Input
                id="rpt-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rpt-brand">Brand</Label>
              <Select
                value={brand}
                onValueChange={(v) => setBrand(v as Brand | "all")}
              >
                <SelectTrigger id="rpt-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                <div>
                  Income:{" "}
                  <span className="font-medium text-foreground">
                    {formatSDG(totalIncome)}
                  </span>
                </div>
                <div>
                  Expense:{" "}
                  <span className="font-medium text-foreground">
                    {formatSDG(totalExpense)}
                  </span>
                </div>
                <div>
                  Net:{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      totalIncome - totalExpense >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    )}
                  >
                    {formatSDG(totalIncome - totalExpense)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monthly P&L</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : monthlyRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No data in range.
            </div>
          ) : (
            <>
              <MonthlyBar
                data={monthlyRows.map((r) => ({
                  month: r.month,
                  income: r.income,
                  expense: r.expense,
                }))}
              />
              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expense</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyRows.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell>{r.month}</TableCell>
                        <TableCell className="text-right">
                          {formatSDG(r.income)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatSDG(r.expense)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            r.net >= 0 ? "text-green-700" : "text-red-700"
                          )}
                        >
                          {formatSDG(r.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Income by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">SDG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(byCatIncome.entries()).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-muted-foreground py-6"
                    >
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.from(byCatIncome.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, total]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell className="text-right">
                          {formatSDG(total)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Expense by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">SDG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(byCatExpense.entries()).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-muted-foreground py-6"
                    >
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.from(byCatExpense.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, total]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell className="text-right">
                          {formatSDG(total)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Brand comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(byBrand) as Brand[]).map((b) => {
                const v = byBrand[b];
                const net = v.income - v.expense;
                return (
                  <TableRow key={b}>
                    <TableCell className="font-medium">{b}</TableCell>
                    <TableCell className="text-right">
                      {formatSDG(v.income)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatSDG(v.expense)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        net >= 0 ? "text-green-700" : "text-red-700"
                      )}
                    >
                      {formatSDG(net)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
