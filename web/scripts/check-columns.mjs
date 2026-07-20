import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const sql = postgres(dbUrl, { ssl: "require" });

async function cols(table) {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${table}
    ORDER BY ordinal_position
  `;
  return rows.map(r => r.column_name);
}

console.log("candidates:", (await cols("candidates")).join(", "));
console.log("evaluation_events:", (await cols("evaluation_events")).join(", "));
console.log("screenings:", (await cols("screenings")).join(", "));
console.log("organization_members:", (await cols("organization_members")).join(", "));

// Run the exact failing query
try {
  const r = await sql`
    select cs.id, cs.decided_by_id from candidate_stages cs limit 1
  `;
  console.log("\ndecided_by_id query: OK, sample:", r[0]);
} catch(e) {
  console.error("\ndecided_by_id query ERROR:", e.message);
}

await sql.end();
