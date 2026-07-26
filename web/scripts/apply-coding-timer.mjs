/**
 * Add coding_sessions.timer_ends_at for resume / autosave timing.
 */
import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl =
  process.env.DATABASE_URL ??
  envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require", max: 1 });

try {
  await sql.unsafe(
    `ALTER TABLE coding_sessions ADD COLUMN IF NOT EXISTS timer_ends_at timestamptz`,
  );
  console.log("✓ coding_sessions.timer_ends_at");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await sql.end();
}
