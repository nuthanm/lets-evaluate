import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import {
  buildEmail,
  formatZodError,
  getEmailDomain,
  registerBodySchema,
} from "@/lib/auth/validation";
import { logEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const body = registerBodySchema.parse(await req.json());
    const domain = getEmailDomain();
    const email = buildEmail(body.username, domain);

    const domainCheck = process.env.ALLOWED_EMAIL_DOMAIN;
    if (domainCheck && !email.endsWith(`@${domainCheck.toLowerCase()}`)) {
      return NextResponse.json(
        { error: `Accounts must use an @${domainCheck} email address` },
        { status: 403 },
      );
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const orgSlug = process.env.ORG_SLUG ?? "kanini";
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

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

    const passwordHash = await bcrypt.hash(body.password, 12);
    const now = new Date();

    let userId = existingUser?.id ?? uuid();

    if (existingUser) {
      await db
        .update(users)
        .set({
          name: body.name.trim(),
          passwordHash,
        })
        .where(eq(users.id, existingUser.id));
    } else {
      await db.insert(users).values({
        id: userId,
        name: body.name.trim(),
        email,
        passwordHash,
      });
    }

    const [existingMembership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMembership) {
      await db
        .update(organizationMembers)
        .set({
          role: body.role,
          deletedAt: null,
          lastActiveAt: now,
        })
        .where(eq(organizationMembers.id, existingMembership.id));
    } else {
      await db.insert(organizationMembers).values({
        id: uuid(),
        organizationId: org.id,
        userId,
        role: body.role,
        deletedAt: null,
        lastActiveAt: now,
      });
    }

    await logEvent({
      organizationId: org.id,
      actorId: userId,
      entityType: "user",
      entityId: userId,
      action: existingMembership?.deletedAt ? "user.reactivated" : existingUser ? "user.re-registered" : "user.registered",
      payload: {
        email,
        role: body.role,
        joinedAt: existingMembership?.createdAt ?? now,
        lastActiveAt: now,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(e) }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }
}
