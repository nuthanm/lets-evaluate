/**
 * Seeds one login per role for Playwright flow tests.
 * Usage: npm run test:seed:e2e
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { buildEmail, getEmailDomain } from "../src/lib/auth/validation";
import type { MemberRole } from "../src/lib/auth/config";
import { organizations, organizationMembers, users } from "../src/lib/db/schema";

const E2E_USERS: Array<{ username: string; role: MemberRole; name: string }> = [
  { username: "e2e.admin", role: "admin", name: "E2E Admin User" },
  { username: "e2e.ta", role: "ta", name: "E2E TA User" },
  { username: "e2e.ta_lead", role: "ta_lead", name: "E2E TA Lead User" },
  { username: "e2e.interviewer", role: "interviewer", name: "E2E Interviewer User" },
  { username: "e2e.manager", role: "manager", name: "E2E Manager User" },
  { username: "e2e.hr", role: "hr", name: "E2E HR User" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const password = process.env.E2E_TEST_PASSWORD ?? "Kanini@E2E2026";
  const domain = getEmailDomain();
  const orgSlug = process.env.ORG_SLUG ?? "kanini";
  const client = postgres(url, { prepare: false });
  const db = drizzle(client);

  let [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
  if (!org) {
    const orgId = uuid();
    await db.insert(organizations).values({
      id: orgId,
      name: process.env.ORG_NAME ?? "KANINI",
      slug: orgSlug,
    });
    org = {
      id: orgId,
      name: process.env.ORG_NAME ?? "KANINI",
      slug: orgSlug,
      createdAt: new Date(),
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  for (const account of E2E_USERS) {
    const email = buildEmail(account.username, domain);
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userId = existingUser?.id ?? uuid();

    if (existingUser) {
      await db
        .update(users)
        .set({ name: account.name, passwordHash })
        .where(eq(users.id, existingUser.id));
    } else {
      await db.insert(users).values({
        id: userId,
        name: account.name,
        email,
        passwordHash,
      });
    }

    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (membership) {
      await db
        .update(organizationMembers)
        .set({ role: account.role, deletedAt: null, lastActiveAt: now })
        .where(eq(organizationMembers.id, membership.id));
    } else {
      await db.insert(organizationMembers).values({
        id: uuid(),
        organizationId: org.id,
        userId,
        role: account.role,
        deletedAt: null,
        lastActiveAt: now,
      });
    }

    console.log(`✓ ${account.role.padEnd(12)} ${account.username}@${domain}`);
  }

  await client.end();
  console.log(`\nE2E password: ${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
