import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.startsWith("postgresql")
  ? process.env.DATABASE_URL
  : process.env.DB_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DB_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });
