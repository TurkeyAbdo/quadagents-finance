import { getCurrentUser } from "@/lib/auth";
import { executeDbRequest } from "./execute";
import { DbQueryBuilder } from "./query-client";

export function createClient() {
  return {
    from(table: string) {
      return new DbQueryBuilder(table, executeDbRequest);
    },
    auth: {
      async getUser() {
        const user = await getCurrentUser();
        return { data: { user }, error: null };
      },
    },
  };
}
