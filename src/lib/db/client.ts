"use client";

import {
  DbQueryBuilder,
  type DbRequest,
  type DbResult,
} from "./query-client";

async function postJson<T = any>(url: string, body: unknown): Promise<DbResult<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as DbResult<T>;
  return result;
}

async function executeRequest<T>(request: DbRequest): Promise<DbResult<T>> {
  return postJson<T>("/api/db", request);
}

export function createClient() {
  return {
    from(table: string) {
      return new DbQueryBuilder(table, executeRequest);
    },
    auth: {
      signInWithPassword(credentials: { email: string; password: string }) {
        return postJson("/api/auth/login", credentials);
      },
      signUp(credentials: {
        email: string;
        password: string;
        options?: unknown;
      }) {
        return postJson("/api/auth/signup", credentials);
      },
      signOut() {
        return postJson("/api/auth/logout", {});
      },
    },
  };
}
