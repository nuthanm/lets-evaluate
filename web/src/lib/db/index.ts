import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(connectionString, {
    prepare: false,
    max: 10,
    // Neon free tier wakes from sleep — cold starts can take longer than a few
    // seconds, so give the pooler enough time to spin the compute back up.
    connect_timeout: 30,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  _db = drizzle(client, { schema });
  return _db;
}

/** @deprecated use getDb() — kept for gradual migration */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export type Db = ReturnType<typeof getDb>;
