export type TxnType = "income" | "expense";
export type Brand = "QuadAgents" | "Mansatak" | "Shared";
export type ClientType = "client" | "vendor";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type Currency = string;

export interface Category {
  id: string;
  name: string;
  type: TxnType;
  brand: Brand | null;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at?: string;
}

export interface ExchangeRate {
  currency: Currency;
  rate_to_sdg: number;
  updated_at?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  brand: Brand;
  category_id: string | null;
  day_of_month: number;
  active: boolean;
  last_logged_month: string | null;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  brand: Brand;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: Currency;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  sdg_total: number;
  notes: string | null;
  paid_at: string | null;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Transaction {
  id: string;
  type: TxnType;
  date: string;
  amount: number;
  currency: Currency;
  sdg_amount: number;
  brand: Brand;
  category_id: string | null;
  description: string | null;
  client_id: string | null;
  invoice_id: string | null;
  is_from_recurring: boolean | null;
  recurring_id: string | null;
  created_at?: string;
  created_by?: string | null;
}

export interface CompanySettings {
  id: number;
  name: string;
  address: string | null;
  logo_url: string | null;
  tax_id: string | null;
  default_currency: Currency;
}

export const BRANDS: Brand[] = ["QuadAgents", "Mansatak", "Shared"];
// Fallback list — real list is fetched from the exchange_rates table via useCurrencies()
export const DEFAULT_CURRENCIES: Currency[] = ["SDG", "USD", "EUR", "SAR"];
