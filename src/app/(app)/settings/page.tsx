"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BRANDS,
  type Brand,
  type Category,
  type CompanySettings,
  type Currency,
  type ExchangeRate,
  type TxnType,
} from "@/lib/types";
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
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const ANY_BRAND = "__any__";

export default function SettingsPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [newCat, setNewCat] = useState<{
    name: string;
    type: TxnType;
    brand: Brand | "";
  }>({ name: "", type: "expense", brand: "" });
  const [newRate, setNewRate] = useState<{ currency: string; rate: string }>({
    currency: "",
    rate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const [{ data: c }, { data: r }, { data: co }] = await Promise.all([
      supabase.from("categories").select("*").order("type").order("name"),
      supabase.from("exchange_rates").select("*").order("currency"),
      supabase.from("company_settings").select("*").eq("id", 1).single(),
    ]);
    setCats((c ?? []) as Category[]);
    setRates((r ?? []) as ExchangeRate[]);
    setCompany(
      (co ?? {
        id: 1,
        name: "QuadAgents Group",
        address: null,
        logo_url: null,
        tax_id: null,
        default_currency: "SDG",
      }) as CompanySettings
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!newCat.name.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").insert({
      name: newCat.name,
      type: newCat.type,
      brand: newCat.brand || null,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Add failed",
        description: error.message,
      });
      return;
    }
    setNewCat({ name: "", type: "expense", brand: "" });
    await load();
    toast({ title: "Category added" });
  }

  async function deleteCategory(id: string) {
    if (
      !confirm(
        "Delete this category? Transactions keep their reference but show 'Uncategorized'."
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
      return;
    }
    await load();
    toast({ title: "Category deleted" });
  }

  async function saveRate(currency: Currency, rate: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from("exchange_rates")
      .upsert({
        currency,
        rate_to_sdg: rate,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
      return;
    }
    await load();
    toast({ title: `Rate saved for ${currency}` });
  }

  async function addRate() {
    const code = newRate.currency.trim().toUpperCase();
    const rate = Number(newRate.rate);
    if (!code || code.length > 5 || !/^[A-Z]+$/.test(code)) {
      toast({
        variant: "destructive",
        title: "Invalid currency code",
        description: "Use 3–5 uppercase letters, e.g. JPY, GBP, INR.",
      });
      return;
    }
    if (!rate || rate <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid rate",
        description: "Enter how many SDG equal 1 unit of this currency.",
      });
      return;
    }
    if (rates.some((r) => r.currency === code)) {
      toast({
        variant: "destructive",
        title: "Already exists",
        description: `${code} is already in the list.`,
      });
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("exchange_rates").insert({
      currency: code,
      rate_to_sdg: rate,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Add failed",
        description: error.message,
      });
      return;
    }
    setNewRate({ currency: "", rate: "" });
    await load();
    toast({ title: `Currency ${code} added` });
  }

  async function deleteRate(currency: Currency) {
    if (currency === "SDG") return;
    if (
      !confirm(
        `Remove ${currency}? Transactions already recorded in ${currency} keep their stored SDG values.`
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from("exchange_rates")
      .delete()
      .eq("currency", currency);
    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
      return;
    }
    await load();
    toast({ title: `${currency} removed` });
  }

  async function saveCompany() {
    if (!company) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("company_settings").upsert({
      id: 1,
      name: company.name,
      address: company.address,
      logo_url: company.logo_url,
      tax_id: company.tax_id,
      default_currency: company.default_currency,
    });
    setSaving(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Company settings saved" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Categories, exchange rates and company info used in invoices.
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
              <CardDescription>
                Create categories for your income and expense transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input
                    id="cat-name"
                    value={newCat.name}
                    onChange={(e) =>
                      setNewCat({ ...newCat, name: e.target.value })
                    }
                    placeholder="e.g. Freelance Fees"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-type">Type</Label>
                  <Select
                    value={newCat.type}
                    onValueChange={(v) =>
                      setNewCat({ ...newCat, type: v as TxnType })
                    }
                  >
                    <SelectTrigger id="cat-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-brand">Brand filter (optional)</Label>
                  <Select
                    value={newCat.brand === "" ? ANY_BRAND : newCat.brand}
                    onValueChange={(v) =>
                      setNewCat({
                        ...newCat,
                        brand: v === ANY_BRAND ? "" : (v as Brand),
                      })
                    }
                  >
                    <SelectTrigger id="cat-brand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_BRAND}>Any</SelectItem>
                      {BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={addCategory}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cats.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          {c.type === "income" ? (
                            <Badge variant="success">Income</Badge>
                          ) : (
                            <Badge variant="destructive">Expense</Badge>
                          )}
                        </TableCell>
                        <TableCell>{c.brand ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCategory(c.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cats.length === 0 && !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-sm text-muted-foreground py-6"
                        >
                          No categories yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exchange rates</CardTitle>
              <CardDescription>
                Base currency is SDG. Rate is &ldquo;SDG per 1 unit of
                currency&rdquo;. Add any currency you need.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-cur">Currency code</Label>
                  <Input
                    id="new-cur"
                    maxLength={5}
                    placeholder="e.g. SAR, GBP, JPY"
                    value={newRate.currency}
                    onChange={(e) =>
                      setNewRate({
                        ...newRate,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="new-rate">Rate to SDG (1 unit = ? SDG)</Label>
                  <Input
                    id="new-rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="e.g. 680"
                    value={newRate.rate}
                    onChange={(e) =>
                      setNewRate({ ...newRate, rate: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button className="w-full" onClick={addRate}>
                    <Plus className="h-4 w-4" /> Add currency
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead>Rate to SDG</TableHead>
                        <TableHead>Last updated</TableHead>
                        <TableHead className="w-44 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((r) => (
                        <RateRow
                          key={r.currency}
                          rate={r}
                          onSave={saveRate}
                          onDelete={deleteRate}
                        />
                      ))}
                      {rates.length === 0 && !loading && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-sm text-muted-foreground py-6"
                          >
                            No currencies yet. Add one above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company information</CardTitle>
              <CardDescription>
                Shown on generated invoice PDFs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {company && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-name">Company name</Label>
                    <Input
                      id="co-name"
                      value={company.name}
                      onChange={(e) =>
                        setCompany({ ...company, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-tax">Tax ID</Label>
                    <Input
                      id="co-tax"
                      value={company.tax_id ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, tax_id: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="co-address">Address</Label>
                    <Textarea
                      id="co-address"
                      className="min-h-[70px]"
                      value={company.address ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-logo">Logo URL (optional)</Label>
                    <Input
                      id="co-logo"
                      value={company.logo_url ?? ""}
                      onChange={(e) =>
                        setCompany({ ...company, logo_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-currency">Default currency</Label>
                    <Select
                      value={company.default_currency}
                      onValueChange={(v) =>
                        setCompany({
                          ...company,
                          default_currency: v as Currency,
                        })
                      }
                    >
                      <SelectTrigger id="co-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rates.map((r) => (
                          <SelectItem key={r.currency} value={r.currency}>
                            {r.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end">
                    <Button disabled={saving} onClick={saveCompany}>
                      <Save className="h-4 w-4" />{" "}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RateRow({
  rate,
  onSave,
  onDelete,
}: {
  rate: ExchangeRate;
  onSave: (currency: Currency, rate: number) => Promise<void>;
  onDelete: (currency: Currency) => Promise<void>;
}) {
  const [v, setV] = useState<number>(Number(rate.rate_to_sdg));
  const dirty = Number(v) !== Number(rate.rate_to_sdg);
  const isBase = rate.currency === "SDG";
  return (
    <TableRow>
      <TableCell className="font-medium">
        {rate.currency}
        {isBase && (
          <span className="ml-2 text-xs text-muted-foreground">(base)</span>
        )}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.0001"
          min="0"
          className="max-w-[200px]"
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          disabled={isBase}
        />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {rate.updated_at
          ? format(new Date(rate.updated_at), "MMM d, yyyy · HH:mm")
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            disabled={!dirty || isBase}
            onClick={() => onSave(rate.currency, Number(v))}
          >
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            disabled={isBase}
            onClick={() => onDelete(rate.currency)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
