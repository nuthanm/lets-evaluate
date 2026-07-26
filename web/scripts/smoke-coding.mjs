/**
 * Smoke-test coding exercise APIs against the local DB (no browser login).
 * Creates a disposable session for an existing active technical stage if found.
 */
import { readFileSync } from "fs";
import postgres from "postgres";
import { randomBytes } from "crypto";
import { randomUUID } from "crypto";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl =
  process.env.DATABASE_URL ??
  envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const base =
  process.env.AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const sql = postgres(dbUrl, { ssl: "require", max: 1 });

const stages = await sql`
  SELECT cs.id, cs.candidate_id, cs.organization_id, cs.assigned_to_id, cs.label, cs.status, cs.kind
  FROM candidate_stages cs
  WHERE cs.kind IN ('technical', 'custom')
  ORDER BY cs.updated_at DESC
  LIMIT 1
`;

if (!stages.length) {
  console.error("No technical/custom stage found in DB.");
  await sql.end();
  process.exit(1);
}

const stage = stages[0];
const token = randomBytes(24).toString("hex");
const id = randomUUID();

await sql`
  INSERT INTO coding_sessions (
    id, organization_id, candidate_id, stage_id, interviewer_id, token,
    title, language, time_limit_min, scenario, starter_code, candidate_code, status, expires_at
  ) VALUES (
    ${id},
    ${stage.organization_id},
    ${stage.candidate_id},
    ${stage.id},
    ${stage.assigned_to_id},
    ${token},
    ${"Smoke test: race condition"},
    ${"TypeScript"},
    ${40},
    ${"Identify and fix the concurrency bug."},
    ${"export const x = 1;\n"},
    ${"export const x = 1;\n"},
    ${"pending"},
    ${new Date(Date.now() + 72 * 3600_000)}
  )
`;

console.log("Created session", id);
console.log("Candidate URL:", `${base.replace(/\/$/, "")}/coding/${token}`);

const get = await fetch(`${base.replace(/\/$/, "")}/api/coding/${token}`);
console.log("GET", get.status, await get.json());

const start = await fetch(`${base.replace(/\/$/, "")}/api/coding/${token}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "start" }),
});
console.log("START", start.status, await start.json());

const sync = await fetch(`${base.replace(/\/$/, "")}/api/coding/${token}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "sync",
    code: "export const x = 2; // fixed\n",
    event: "typing",
  }),
});
console.log("SYNC", sync.status, await sync.json());

const submit = await fetch(`${base.replace(/\/$/, "")}/api/coding/${token}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "submit",
    code: "export const x = 2; // fixed\n",
    notes: "Used a mutex",
  }),
});
console.log("SUBMIT", submit.status, await submit.json());

await sql.end();
