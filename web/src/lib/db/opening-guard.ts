import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getRoleOpeningStatus(roleId: string | null | undefined) {
  if (!roleId) return { open: true as const, role: null };
  const [role] = await db
    .select({ id: roles.id, name: roles.name, status: roles.status })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) return { open: true as const, role: null };
  return { open: role.status === "open", role };
}

export async function assertRoleOpen(roleId: string | null | undefined) {
  const { open, role } = await getRoleOpeningStatus(roleId);
  if (!open && role) {
    return `The opening "${role.name}" is closed. Reopen it or choose another role before continuing.`;
  }
  return null;
}
