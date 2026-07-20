import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();

if (!dbUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require" });

try {
  await sql`
    ALTER TABLE candidate_stages
      ADD COLUMN IF NOT EXISTS decided_by_id   text        REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS decided_at      timestamptz,
      ADD COLUMN IF NOT EXISTS report_key      text,
      ADD COLUMN IF NOT EXISTS report_filename text,
      ADD COLUMN IF NOT EXISTS questions       jsonb       DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS sla_due_at      timestamptz,
      ADD COLUMN IF NOT EXISTS handoff_note    text        DEFAULT ''
  `;
  console.log("✓ candidate_stages columns are up to date.");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await sql.end();
}
