import { requireSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const session = await requireSession();

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [membership] = await db
    .select({
      joinedAt: organizationMembers.createdAt,
      lastActiveAt: organizationMembers.lastActiveAt,
      deletedAt: organizationMembers.deletedAt,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, session.user.organizationId),
        eq(organizationMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  return (
    <ProfileClient
      name={session.user.name}
      email={session.user.email}
      role={session.user.role}
      hasPassword={Boolean(user?.passwordHash)}
      joinedAt={membership?.joinedAt?.toISOString() ?? null}
      lastActiveAt={membership?.lastActiveAt?.toISOString() ?? null}
      isDeleted={Boolean(membership?.deletedAt)}
    />
  );
}
