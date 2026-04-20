"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import {
  BRANDS,
  type Brand,
  type Category,
  type Currency,
  type RecurringExpense,
} from "@/lib/types";
import { useCurrencies } from "@/hooks/use-currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const UNCATEGORIZED = "__uncategorized__";

function emptyRec(): RecurringExpense {
  return {
    id: "",
    name: "",
    amount: 0,
    currency: "SDG",
    brand: "Shared",
    category_id: null,
    day_of_month: 1,
    active: true,
    last_logged_month: null,
  };
}

export default function RecurringPage() {
  const [rows, setRows] = useState<RecurringExpense[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const { currencies } = useCurrencies();

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase
        .from("recurring_expenses")
        .select("*")
        .order("name"),
      supabase
        .from("categories")
        .select("*")
        .eq("type", "expense")
        .order("name"),
    ]);
    setRows((r ?? []) as RecurringExpense[]);
    setCats((c ?? []) as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const catMap = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats]
  );

  async function save(r: RecurringExpense) {
    const supabase = createClient();
    if (!r.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (r.amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Amount must be greater than 0.",
      });
      return;
    }
    if (r.day_of_month < 1 || r.day_of_month > 28) {
      toast({
        variant: "destructive",
        title: "Invalid day",
        description: "Day of month must be between 1 and 28.",
      });
      return;
    }
    const payload = {
      name: r.name,
      amount: Number(r.amount),
      currency: r.currency,
      brand: r.brand,
      category_id: r.category_id,
      day_of_month: r.day_of_month,
      active: r.active,
    };
    const { error } = r.id
      ? await supabase
          .from("recurring_expenses")
          .update(payload)
          .eq("id", r.id)
      : await supabase.from("recurring_expenses").insert(payload);
    if (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
      return;
    }
    toast({ title: r.id ? "Recurring updated" : "Recurring created" });
    setEditing(null);
    await load();
  }

  async function toggleActive(r: RecurringExpense) {
    const supabase = createClient();
    await supabase
      .from("recurring_expenses")
      .update({ active: !r.active })
      .eq("id", r.id);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this recurring expense? History is preserved.")) return;
    const supabase = createClient();
    await supabase.from("recurring_expenses").delete().eq("id", id);
    toast({ title: "Recurring deleted" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-logged once per month on or after the day you specify.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyRec())}>
          <Plus className="h-4 w-4" /> New recurring
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No recurring expenses yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last logged</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.brand}</TableCell>
                    <TableCell>
                      {r.category_id ? catMap.get(r.category_id) ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.amount, r.currency)}
                    </TableCell>
                    <TableCell>{r.day_of_month}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className={cn(
                          "relative inline-flex h-5 w-9 rounded-full transition",
                          r.active ? "bg-primary" : "bg-muted"
                        )}
                        onClick={() => toggleActive(r)}
                        aria-label="Toggle active"
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 rounded-full bg-background transition transform mt-0.5",
                            r.active ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {r.last_logged_month ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(r)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(r.id)}
                          aria-label="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit recurring" : "New recurring"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="rec-name">Name</Label>
                  <Input
                    id="rec-name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-amount">Amount</Label>
                  <Input
                    id="rec-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.amount}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-currency">Currency</Label>
                  <Select
                    value={editing.currency}
                    onValueChange={(v) =>
                      setEditing({ ...editing, currency: v as Currency })
                    }
                  >
                    <SelectTrigger id="rec-currency">
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
                  <Label htmlFor="rec-brand">Brand</Label>
                  <Select
                    value={editing.brand}
                    onValueChange={(v) =>
                      setEditing({ ...editing, brand: v as Brand })
                    }
                  >
                    <SelectTrigger id="rec-brand">
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
                  <Label htmlFor="rec-cat">Category</Label>
                  <Select
                    value={editing.category_id ?? UNCATEGORIZED}
                    onValueChange={(v) =>
                      setEditing({
                        ...editing,
                        category_id: v === UNCATEGORIZED ? null : v,
                      })
                    }
                  >
                    <SelectTrigger id="rec-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNCATEGORIZED}>
                        Uncategorized
                      </SelectItem>
                      {cats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-day">Day of month (1-28)</Label>
                  <Input
                    id="rec-day"
                    type="number"
                    min="1"
                    max="28"
                    value={editing.day_of_month}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        day_of_month: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    id="rec-active"
                    checked={editing.active}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, active: v === true })
                    }
                  />
                  <Label htmlFor="rec-active" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && save(editing)}>
              {editing?.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
