export type TableName =
  | "categories"
  | "clients"
  | "exchange_rates"
  | "recurring_expenses"
  | "invoices"
  | "invoice_items"
  | "transactions"
  | "company_settings";

interface TableDefinition {
  columns: readonly string[];
  primaryKey: string;
}

export const TABLES: Record<TableName, TableDefinition> = {
  categories: {
    primaryKey: "id",
    columns: ["id", "name", "type", "brand", "created_at"],
  },
  clients: {
    primaryKey: "id",
    columns: [
      "id",
      "name",
      "type",
      "email",
      "phone",
      "address",
      "notes",
      "created_at",
    ],
  },
  exchange_rates: {
    primaryKey: "currency",
    columns: ["currency", "rate_to_sdg", "updated_at"],
  },
  recurring_expenses: {
    primaryKey: "id",
    columns: [
      "id",
      "name",
      "amount",
      "currency",
      "brand",
      "category_id",
      "day_of_month",
      "active",
      "last_logged_month",
      "created_at",
    ],
  },
  invoices: {
    primaryKey: "id",
    columns: [
      "id",
      "invoice_number",
      "client_id",
      "brand",
      "issue_date",
      "due_date",
      "status",
      "currency",
      "subtotal",
      "tax_rate",
      "tax_amount",
      "total",
      "sdg_total",
      "notes",
      "paid_at",
      "created_at",
    ],
  },
  invoice_items: {
    primaryKey: "id",
    columns: [
      "id",
      "invoice_id",
      "description",
      "quantity",
      "unit_price",
      "total",
    ],
  },
  transactions: {
    primaryKey: "id",
    columns: [
      "id",
      "type",
      "date",
      "amount",
      "currency",
      "sdg_amount",
      "brand",
      "category_id",
      "description",
      "client_id",
      "invoice_id",
      "is_from_recurring",
      "recurring_id",
      "created_at",
      "created_by",
    ],
  },
  company_settings: {
    primaryKey: "id",
    columns: [
      "id",
      "name",
      "address",
      "logo_url",
      "tax_id",
      "default_currency",
    ],
  },
};

export function getTableDefinition(table: string): TableDefinition {
  const definition = TABLES[table as TableName];
  if (!definition) throw new Error(`Unsupported table: ${table}`);
  return definition;
}

export function assertColumn(table: string, column: string): string {
  const definition = getTableDefinition(table);
  if (!definition.columns.includes(column)) {
    throw new Error(`Unsupported column '${column}' on table '${table}'`);
  }
  return column;
}

export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
