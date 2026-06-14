import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as {
  quadagentsPgPool?: Pool;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a PostgreSQL connection string to your environment."
    );
  }
  return url;
}

export function getPool(): Pool {
  if (!globalForPg.quadagentsPgPool) {
    globalForPg.quadagentsPgPool = new Pool({
      connectionString: connectionString(),
      ssl:
        process.env.POSTGRES_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return globalForPg.quadagentsPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
