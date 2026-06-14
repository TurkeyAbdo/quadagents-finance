import Link from "next/link";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/db/server";
import { formatSDG } from "@/lib/currency";
import { StatCard } from "@/components/stat-card";
import { MonthlyBar } from "@/components/charts/monthly-bar";
import { PieBreakdown } from "@/components/charts/pie";
import type { Category, Transaction } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = createClient();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  const [{ data: txns }, { data: categories }] = await Promise.all([
    db
      .from("transactions")
      .select("*")
      .gte("date", sixMonthsAgo.toISOString().slice(0, 10))
      .order("date", { ascending: false }),
    db.from("categories").select("*"),
  ]);

  const tx = (txns ?? []) as Transaction[];
  const cats = (categories ?? []) as Category[];
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  const inThisMonth = (t: Transaction) =>
    new Date(t.date) >= monthStart && new Date(t.date) <= now;
  const inThisYear = (t: Transaction) =>
    new Date(t.date) >= yearStart && new Date(t.date) <= now;

  const monthIncome = tx
    .filter((t) => t.type === "income" && inThisMonth(t))
    .reduce((s, t) => s + Number(t.sdg_amount), 0);
  const monthExpense = tx
    .filter((t) => t.type === "expense" && inThisMonth(t))
    .reduce((s, t) => s + Number(t.sdg_amount), 0);
  const monthNet = monthIncome - monthExpense;

  const ytdIncome = tx
    .filter((t) => t.type === "income" && inThisYear(t))
    .reduce((s, t) => s + Number(t.sdg_amount), 0);
  const ytdExpense = tx
    .filter((t) => t.type === "expense" && inThisYear(t))
    .reduce((s, t) => s + Number(t.sdg_amount), 0);
  const ytdNet = ytdIncome - ytdExpense;

  // Last 6 months bar data (oldest → newest)
  const monthBuckets: Record<string, { income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, "MMM yy");
    monthBuckets[key] = { income: 0, expense: 0 };
  }
  for (const t of tx) {
    const d = new Date(t.date);
    const key = format(d, "MMM yy");
    if (!(key in monthBuckets)) continue;
    if (t.type === "income")
      monthBuckets[key].income += Number(t.sdg_amount);
    else monthBuckets[key].expense += Number(t.sdg_amount);
  }
  const monthlyData = Object.entries(monthBuckets).map(
    ([month, { income, expense }]) => ({ month, income, expense })
  );

  // Pie: expenses by category (this month)
  const expenseByCat: Record<string, number> = {};
  tx.filter((t) => t.type === "expense" && inThisMonth(t)).forEach((t) => {
    const name = catMap.get(t.category_id ?? "") ?? "Uncategorized";
    expenseByCat[name] = (expenseByCat[name] ?? 0) + Number(t.sdg_amount);
  });
  const expensePie = Object.entries(expenseByCat).map(([name, value]) => ({
    name,
    value,
  }));

  // Pie: income by brand (this month)
  const incomeByBrand: Record<string, number> = {};
  tx.filter((t) => t.type === "income" && inThisMonth(t)).forEach((t) => {
    incomeByBrand[t.brand] =
      (incomeByBrand[t.brand] ?? 0) + Number(t.sdg_amount);
  });
  const incomePie = Object.entries(incomeByBrand).map(([name, value]) => ({
    name,
    value,
  }));

  const recent = tx.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(now, "MMMM yyyy")} · All figures in SDG
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Income (This Month)"
          value={formatSDG(monthIncome)}
          icon={ArrowUpRight}
          tone="success"
        />
        <StatCard
          label="Expenses (This Month)"
          value={formatSDG(monthExpense)}
          icon={ArrowDownRight}
          tone="danger"
        />
        <StatCard
          label="Net (This Month)"
          value={formatSDG(monthNet)}
          icon={CircleDollarSign}
          tone={monthNet >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Net (Year to Date)"
          value={formatSDG(ytdNet)}
          icon={TrendingUp}
          tone={ytdNet >= 0 ? "success" : "danger"}
          sublabel={`Income ${formatSDG(ytdIncome)} · Expenses ${formatSDG(
            ytdExpense
          )}`}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Last 6 months · Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBar data={monthlyData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Expenses by category (this month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={expensePie} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Income by brand (this month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={incomePie} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="text-sm font-semibold">
            Recent transactions
          </CardTitle>
          <Link
            href="/transactions"
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No transactions yet.{" "}
              <Link
                className="text-primary hover:underline"
                href="/transactions/new"
              >
                Add your first one
              </Link>
              .
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
                  <TableHead className="text-right">Amount (SDG)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((t) => (
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
                      {catMap.get(t.category_id ?? "") ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {t.description ?? ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatSDG(t.sdg_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
