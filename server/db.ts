import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let _pool: pg.Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function getDatabaseUrl(): string {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  const dbUrl = process.env.DB_URL;

  const databaseUrl = rawDatabaseUrl?.startsWith("postgresql://")
    ? rawDatabaseUrl
    : dbUrl?.startsWith("postgresql://")
      ? dbUrl
      : undefined;

  if (!databaseUrl) {
    const rawPreview = rawDatabaseUrl ? rawDatabaseUrl.substring(0, 40) + "..." : "NOT SET";
    const dbPreview = dbUrl ? dbUrl.substring(0, 40) + "..." : "NOT SET";
    throw new Error(
      `No valid PostgreSQL connection string found.\n` +
      `  DATABASE_URL: ${rawPreview}\n` +
      `  DB_URL: ${dbPreview}\n` +
      `Both must start with "postgresql://". Check your environment secrets.`,
    );
  }

  return databaseUrl;
}

export function getPool(): pg.Pool {
  if (!_pool) {
    const databaseUrl = getDatabaseUrl();
    try {
      const hostname = new URL(databaseUrl).hostname;
      console.log(`Database connecting to host: ${hostname}`);
    } catch {
      throw new Error(`Invalid database URL format: ${databaseUrl.substring(0, 40)}...`);
    }
    _pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Lazy proxies so existing `import { db, pool }` calls work without changes
export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_, prop) { return (getPool() as any)[prop]; },
});
export const db: ReturnType<typeof drizzle> = new Proxy({} as any, {
  get(_, prop) { return (getDb() as any)[prop]; },
});
