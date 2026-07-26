import { readFileSync } from "fs";
import postgres from "postgres";
import { randomBytes, randomUUID } from "crypto";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl =
  process.env.DATABASE_URL ??
  envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const base = (
  process.env.AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const sql = postgres(dbUrl, { ssl: "require", max: 1 });
const stages = await sql`
  SELECT cs.id, cs.candidate_id, cs.organization_id, cs.assigned_to_id
  FROM candidate_stages cs
  WHERE cs.kind IN ('technical', 'custom')
  ORDER BY cs.updated_at DESC
  LIMIT 1
`;
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
    ${"Fix the race condition"},
    ${"TypeScript"},
    ${40},
    ${"You are given an in-memory cache. Under concurrent requests, some keys return stale values.\n\n1. Identify the bug.\n2. Rewrite get/set to be safe.\n3. Note your trade-off."},
    ${"type Entry = { value: string; expiresAt: number };\n\nclass Cache {\n  private store = new Map<string, Entry>();\n  get(key: string): string | null {\n    const entry = this.store.get(key);\n    if (!entry) return null;\n    if (Date.now() > entry.expiresAt) {\n      this.store.delete(key);\n      return null;\n    }\n    return entry.value;\n  }\n  set(key: string, value: string, ttlMs: number) {\n    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });\n  }\n}\nexport { Cache };\n"},
    ${"type Entry = { value: string; expiresAt: number };\n\nclass Cache {\n  private store = new Map<string, Entry>();\n  get(key: string): string | null {\n    const entry = this.store.get(key);\n    if (!entry) return null;\n    if (Date.now() > entry.expiresAt) {\n      this.store.delete(key);\n      return null;\n    }\n    return entry.value;\n  }\n  set(key: string, value: string, ttlMs: number) {\n    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });\n  }\n}\nexport { Cache };\n"},
    ${"pending"},
    ${new Date(Date.now() + 72 * 3600_000)}
  )
`;
console.log(`${base}/coding/${token}`);
await sql.end();
