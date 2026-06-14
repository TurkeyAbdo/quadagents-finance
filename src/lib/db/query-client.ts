export type FilterOperator = "eq" | "gte" | "like";
export type QueryAction = "select" | "insert" | "update" | "delete" | "upsert";

export interface QueryFilter {
  column: string;
  op: FilterOperator;
  value: unknown;
}

export interface QueryOrder {
  column: string;
  ascending: boolean;
}

export interface DbRequest {
  table: string;
  action?: QueryAction;
  select?: string;
  payload?: unknown;
  filters: QueryFilter[];
  orders: QueryOrder[];
  limit?: number;
  single?: boolean;
}

export interface DbError {
  message: string;
  code?: string;
}

export interface DbResult<T = any> {
  data: T | null;
  error: DbError | null;
}

export type DbExecutor = <T = any>(
  request: DbRequest
) => Promise<DbResult<T>>;

export class DbQueryBuilder<T = any> implements PromiseLike<DbResult<T>> {
  private request: DbRequest;

  constructor(table: string, private readonly executor: DbExecutor) {
    this.request = {
      table,
      filters: [],
      orders: [],
    };
  }

  select(columns = "*") {
    if (!this.request.action) this.request.action = "select";
    this.request.select = columns;
    return this;
  }

  insert(payload: unknown) {
    this.request.action = "insert";
    this.request.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.request.action = "update";
    this.request.payload = payload;
    return this;
  }

  upsert(payload: unknown) {
    this.request.action = "upsert";
    this.request.payload = payload;
    return this;
  }

  delete() {
    this.request.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.request.filters.push({ column, op: "eq", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.request.filters.push({ column, op: "gte", value });
    return this;
  }

  like(column: string, value: unknown) {
    this.request.filters.push({ column, op: "like", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.request.orders.push({
      column,
      ascending: options?.ascending ?? true,
    });
    return this;
  }

  limit(count: number) {
    this.request.limit = count;
    return this;
  }

  single() {
    this.request.single = true;
    return this;
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.executor<T>(this.request).then(onfulfilled, onrejected);
  }
}

export function toDbError(error: unknown): DbError {
  if (error instanceof Error) return { message: error.message };
  return { message: "Unexpected database error" };
}
