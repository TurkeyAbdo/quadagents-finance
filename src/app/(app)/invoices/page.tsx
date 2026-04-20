"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatSDG } from "@/lib/currency";
import type { Client, Invoice, InvoiceStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all"
  );

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      setLoading(true);
      const [{ data: inv }, { data: cl }] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("issue_date", { ascending: false })
          .limit(500),
        supabase.from("clients").select("*"),
      ]);

      // Lightweight client-side "overdue" marker: if due_date < today and status === "sent",
      // display as overdue (no DB write — display-only).
      const today = new Date().toISOString().slice(0, 10);
      const normalized = ((inv ?? []) as Invoice[]).map((i) =>
        i.status === "sent" && i.due_date < today
          ? { ...i, status: "overdue" as InvoiceStatus }
          : i
      );
      setInvoices(normalized);
      setClients((cl ?? []) as Client[]);
      setLoading(false);
    })();
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );

  const filtered =
    statusFilter === "all"
      ? invoices
      : invoices.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, send, and track invoices. PDFs are generated client-side.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="inv-status-filter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as InvoiceStatus | "all")
              }
            >
              <SelectTrigger id="inv-status-filter" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
              <Button asChild className="mt-4">
                <Link href="/invoices/new">
                  <Plus className="h-4 w-4" /> Create first invoice
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">SDG</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.invoice_number}
                    </TableCell>
                    <TableCell>
                      {clientMap.get(i.client_id ?? "")?.name ?? "—"}
                    </TableCell>
                    <TableCell>{i.brand}</TableCell>
                    <TableCell>
                      {format(new Date(i.issue_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(i.due_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{statusBadge(i.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(i.total, i.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatSDG(i.sdg_total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label="Open"
                      >
                        <Link href={`/invoices/${i.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
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
