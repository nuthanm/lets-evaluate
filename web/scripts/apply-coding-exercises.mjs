/**
 * Apply coding exercise tables (0019) idempotently.
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

async function run(label, query) {
  try {
    await sql.unsafe(query);
    console.log(`✓ ${label}`);
  } catch (e) {
    if (e.code === "42701" || e.code === "42P07" || e.code === "42710") {
      console.log(`  (already applied: ${label})`);
    } else {
      console.error(`✗ ${label}: ${e.message}`);
      throw e;
    }
  }
}

await run(
  "enum coding_session_status",
  `DO $$ BEGIN
    CREATE TYPE coding_session_status AS ENUM('pending','in_progress','submitted','expired');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
);

await run(
  "enum coding_event_type",
  `DO $$ BEGIN
    CREATE TYPE coding_event_type AS ENUM('opened','focused','blurred','typing','pasted','code_sync','submitted','expired','link_created');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
);

await run(
  "table coding_exercises",
  `CREATE TABLE IF NOT EXISTS coding_exercises (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title text NOT NULL,
    language text DEFAULT 'TypeScript' NOT NULL,
    time_limit_min integer DEFAULT 40 NOT NULL,
    scenario text DEFAULT '' NOT NULL,
    starter_code text DEFAULT '' NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    visibility text DEFAULT 'org' NOT NULL,
    role_id text REFERENCES roles(id) ON DELETE SET NULL,
    created_by_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  )`,
);

await run(
  "table coding_sessions",
  `CREATE TABLE IF NOT EXISTS coding_sessions (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    stage_id text NOT NULL REFERENCES candidate_stages(id) ON DELETE CASCADE,
    interviewer_id text REFERENCES users(id) ON DELETE SET NULL,
    exercise_id text REFERENCES coding_exercises(id) ON DELETE SET NULL,
    token text NOT NULL UNIQUE,
    title text NOT NULL,
    language text DEFAULT 'TypeScript' NOT NULL,
    time_limit_min integer DEFAULT 40 NOT NULL,
    scenario text DEFAULT '' NOT NULL,
    starter_code text DEFAULT '' NOT NULL,
    candidate_code text DEFAULT '' NOT NULL,
    candidate_notes text DEFAULT '' NOT NULL,
    status coding_session_status DEFAULT 'pending' NOT NULL,
    expires_at timestamptz,
    opened_at timestamptz,
    started_at timestamptz,
    submitted_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  )`,
);

await run(
  "table coding_session_events",
  `CREATE TABLE IF NOT EXISTS coding_session_events (
    id text PRIMARY KEY,
    session_id text NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
    type coding_event_type NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
  )`,
);

await run(
  "indexes",
  `CREATE INDEX IF NOT EXISTS coding_exercises_org_idx ON coding_exercises(organization_id);
   CREATE INDEX IF NOT EXISTS coding_exercises_creator_idx ON coding_exercises(created_by_id);
   CREATE INDEX IF NOT EXISTS coding_sessions_stage_idx ON coding_sessions(stage_id);
   CREATE INDEX IF NOT EXISTS coding_sessions_candidate_idx ON coding_sessions(candidate_id);
   CREATE INDEX IF NOT EXISTS coding_sessions_token_idx ON coding_sessions(token);
   CREATE INDEX IF NOT EXISTS coding_session_events_session_idx ON coding_session_events(session_id);`,
);

const check = await sql`
  SELECT to_regclass('public.coding_exercises') AS exercises,
         to_regclass('public.coding_sessions') AS sessions
`;
console.log("Tables:", check[0]);
await sql.end();
