import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const sql = postgres(dbUrl, { ssl: "require" });

const required = [
  "organizations","users","organization_members","candidates","candidate_stages",
  "pipeline_stages","roles","projects","evaluation_events","interview_assignments",
  "interviewer_availability","question_bank","mail_templates","screenings",
  "screening_sessions","job_descriptions","office_locations","org_email_config",
];

const rows = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`;
const existing = new Set(rows.map(r => r.table_name));

console.log("Missing tables:");
for (const t of required) {
  if (!existing.has(t)) console.log(" ✗", t);
}

// Check candidate_stages columns
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='candidate_stages'
`;
console.log("\ncandidate_stages columns:", cols.map(c => c.column_name).join(", "));

await sql.end();
