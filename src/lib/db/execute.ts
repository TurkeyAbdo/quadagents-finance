import type { QueryResultRow } from "pg";
import {
  assertColumn,
  getTableDefinition,
  quoteIdent,
} from "./schema";
import { query } from "./postgres";
import type { DbRequest, DbResult, QueryFilter } from "./query-client";
import { toDbError } from "./query-client";

function selectedColumns(table: string, select?: string): string {
  if (!select || select.trim() === "*") return "*";
  return select
    .split(",")
    .map((column) => quoteIdent(assertColumn(table, column.trim())))
    .join(", ");
}

function normalizePayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({ ...(item as Record<string, unknown>) }));
  }
  if (payload && typeof payload === "object") {
    return [{ ...(payload as Record<string, unknown>) }];
  }
  throw new Error("Payload must be an object or array of objects");
}

function filteredPayload(
  table: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    assertColumn(table, key);
    if (value !== undefined) filtered[key] = value;
  }
  return filtered;
}

function buildWhere(
  table: string,
  filters: QueryFilter[],
  params: unknown[]
): string {
  if (filters.length === 0) return "";

  const clauses = filters.map((filter) => {
    const column = quoteIdent(assertColumn(table, filter.column));
    params.push(filter.value);
    const placeholder = `$${params.length}`;
    if (filter.op === "eq") return `${column} = ${placeholder}`;
    if (filter.op === "gte") return `${column} >= ${placeholder}`;
    if (filter.op === "like") return `${column} like ${placeholder}`;
    throw new Error(`Unsupported filter operator: ${filter.op}`);
  });

  return ` where ${clauses.join(" and ")}`;
}

function buildOrder(table: string, request: DbRequest): string {
  if (request.orders.length === 0) return "";
  return ` order by ${request.orders
    .map((order) => {
      const column = quoteIdent(assertColumn(table, order.column));
      return `${column} ${order.ascending ? "asc" : "desc"}`;
    })
    .join(", ")}`;
}

function buildLimit(request: DbRequest, params: unknown[]): string {
  if (!request.limit) return "";
  params.push(request.limit);
  return ` limit $${params.length}`;
}

async function executeSelect<T extends QueryResultRow>(
  request: DbRequest
): Promise<T[]> {
  const table = request.table;
  const params: unknown[] = [];
  const sql =
    `select ${selectedColumns(table, request.select)} from ${quoteIdent(
      table
    )}` +
    buildWhere(table, request.filters, params) +
    buildOrder(table, request) +
    buildLimit(request, params);
  return query<T>(sql, params);
}

async function executeInsert<T extends QueryResultRow>(
  request: DbRequest
): Promise<T[]> {
  const table = request.table;
  const rows = normalizePayload(request.payload).map((row) =>
    filteredPayload(table, row)
  );
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0]);
  if (columns.length === 0) throw new Error("Insert payload has no columns");

  const params: unknown[] = [];
  const values = rows.map((row) => {
    const placeholders = columns.map((column) => {
      params.push(row[column]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  const sql = `insert into ${quoteIdent(table)} (${columns
    .map(quoteIdent)
    .join(", ")}) values ${values.join(", ")} returning ${selectedColumns(
    table,
    request.select
  )}`;
  return query<T>(sql, params);
}

async function executeUpdate<T extends QueryResultRow>(
  request: DbRequest
): Promise<T[]> {
  const table = request.table;
  const payload = filteredPayload(table, normalizePayload(request.payload)[0]);
  const columns = Object.keys(payload);
  if (columns.length === 0) throw new Error("Update payload has no columns");

  const params: unknown[] = [];
  const setClause = columns
    .map((column) => {
      params.push(payload[column]);
      return `${quoteIdent(column)} = $${params.length}`;
    })
    .join(", ");

  const sql =
    `update ${quoteIdent(table)} set ${setClause}` +
    buildWhere(table, request.filters, params) +
    ` returning ${selectedColumns(table, request.select)}`;
  return query<T>(sql, params);
}

async function executeUpsert<T extends QueryResultRow>(
  request: DbRequest
): Promise<T[]> {
  const table = request.table;
  const definition = getTableDefinition(table);
  const payload = filteredPayload(table, normalizePayload(request.payload)[0]);
  const columns = Object.keys(payload);
  if (columns.length === 0) throw new Error("Upsert payload has no columns");
  if (!columns.includes(definition.primaryKey)) {
    throw new Error(`Upsert requires primary key '${definition.primaryKey}'`);
  }

  const params: unknown[] = [];
  const values = columns.map((column) => {
    params.push(payload[column]);
    return `$${params.length}`;
  });
  const updates = columns
    .filter((column) => column !== definition.primaryKey)
    .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`);

  const conflictAction =
    updates.length > 0 ? `do update set ${updates.join(", ")}` : "do nothing";

  const sql = `insert into ${quoteIdent(table)} (${columns
    .map(quoteIdent)
    .join(", ")}) values (${values.join(", ")}) on conflict (${quoteIdent(
    definition.primaryKey
  )}) ${conflictAction} returning ${selectedColumns(table, request.select)}`;
  return query<T>(sql, params);
}

async function executeDelete<T extends QueryResultRow>(
  request: DbRequest
): Promise<T[]> {
  const table = request.table;
  const params: unknown[] = [];
  const sql =
    `delete from ${quoteIdent(table)}` +
    buildWhere(table, request.filters, params) +
    ` returning ${selectedColumns(table, request.select)}`;
  return query<T>(sql, params);
}

export async function executeDbRequest<T = unknown>(
  request: DbRequest
): Promise<DbResult<T>> {
  try {
    getTableDefinition(request.table);
    const action = request.action ?? "select";
    let rows: QueryResultRow[];

    if (action === "select") rows = await executeSelect(request);
    else if (action === "insert") rows = await executeInsert(request);
    else if (action === "update") rows = await executeUpdate(request);
    else if (action === "upsert") rows = await executeUpsert(request);
    else if (action === "delete") rows = await executeDelete(request);
    else throw new Error(`Unsupported action: ${action}`);

    const data = request.single ? rows[0] ?? null : rows;
    return { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}
