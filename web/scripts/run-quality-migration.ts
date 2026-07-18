/**
 * Applies quality dashboard tables (0014_quality_test_results.sql).
 * Usage: npm run db:migrate:quality
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sqlPath = join(import.meta.dirname, "../drizzle/0014_quality_test_results.sql");
  const sql14 = readFileSync(sqlPath, "utf8");
  const client = postgres(url, { prepare: false, max: 1 });

  await client.unsafe(sql14);
  const sql15 = readFileSync(join(import.meta.dirname, "../drizzle/0015_quality_sla.sql"), "utf8");
  await client.unsafe(sql15);
  await client.end();
  console.log("✓ Quality tables + SLA migration applied");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
