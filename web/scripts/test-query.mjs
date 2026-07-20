import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const sql = postgres(dbUrl, { ssl: "require" });

// Run the exact failing query to see the real error
try {
  const result = await sql`
    select "candidate_stages"."id", "candidate_stages"."label", "candidate_stages"."kind",
           "candidate_stages"."decision", "candidate_stages"."decided_at",
           "candidate_stages"."comments", "candidate_stages"."report_key",
           "candidate_stages"."report_filename", "candidate_stages"."candidate_id",
           "candidates"."name", "roles"."name", "projects"."name"
    from "candidate_stages"
    inner join "candidates" on "candidate_stages"."candidate_id" = "candidates"."id"
    left join "roles" on "candidates"."role_id" = "roles"."id"
    left join "projects" on "candidates"."project_id" = "projects"."id"
    where ("candidate_stages"."organization_id" = ${'test'} and "candidate_stages"."decided_by_id" = ${'test'})
    order by "candidate_stages"."decided_at" desc
    limit 1
  `;
  console.log("Query ran OK, rows:", result.length);
} catch (e) {
  console.error("Query error:", e.message, e.code);
}

// Also check evaluation_events
try {
  await sql`select count(*) from evaluation_events limit 1`;
  console.log("evaluation_events: OK");
} catch (e) {
  console.error("evaluation_events error:", e.message);
}

// Check screening_feedback
try {
  await sql`select count(*) from screening_feedback limit 1`;
  console.log("screening_feedback: OK");
} catch (e) {
  console.error("screening_feedback error:", e.message);
}

await sql.end();
