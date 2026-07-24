import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { normalizeLoginCredentials } from "@/lib/auth/validation";

export type MemberRole =
  | "admin"
  | "ta"
  | "ta_lead"
  | "interviewer"
  | "manager"
  | "hr";

function parseGroupEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function roleFromEntraGroups(groups?: string[]): MemberRole {
  if (!groups?.length) return "interviewer";
  const admin = parseGroupEnv("AZURE_AD_ADMIN_GROUPS");
  const taLead = parseGroupEnv("AZURE_AD_TA_LEAD_GROUPS");
  const ta = parseGroupEnv("AZURE_AD_TA_GROUPS");
  const interviewer = parseGroupEnv("AZURE_AD_INTERVIEWER_GROUPS");
  const manager = parseGroupEnv("AZURE_AD_MANAGER_GROUPS");
  const hr = parseGroupEnv("AZURE_AD_HR_GROUPS");
  if (groups.some((g) => admin.includes(g))) return "admin";
  if (groups.some((g) => taLead.includes(g))) return "ta_lead";
  if (groups.some((g) => ta.includes(g))) return "ta";
  if (groups.some((g) => manager.includes(g))) return "manager";
  if (groups.some((g) => hr.includes(g))) return "hr";
  if (groups.some((g) => interviewer.includes(g))) return "interviewer";
  return "interviewer";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      organizationId: string;
      role: MemberRole;
    };
  }
  interface User {
    organizationId?: string;
    role?: MemberRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    organizationId?: string;
    role?: MemberRole;
  }
}

async function resolveMembership(userId: string) {
  const rows = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        isNull(organizationMembers.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Username or email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = normalizeLoginCredentials({
        email: credentials?.email as string | undefined,
        password: credentials?.password as string | undefined,
      });
      if (!parsed.ok) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, parsed.email))
        .limit(1);

      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.password, user.passwordHash);
      if (!ok) return null;

      const membership = await resolveMembership(user.id);
      if (!membership) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: membership.organizationId,
        role: membership.role as MemberRole,
      };
    },
  }),
];

if (
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        const domain = process.env.ALLOWED_EMAIL_DOMAIN;
        if (domain && user.email && !user.email.endsWith(`@${domain}`)) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
        if (user.organizationId && user.role) {
          token.organizationId = user.organizationId;
          token.role = user.role;
        } else if (user.id && account?.provider === "microsoft-entra-id") {
          const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email!.toLowerCase()))
            .limit(1);
          let userId = existing?.id;
          const entraGroups = (profile as { groups?: string[] } | undefined)
            ?.groups;
          const mappedRole = roleFromEntraGroups(entraGroups);
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.slug, process.env.ORG_SLUG ?? "kanini"))
            .limit(1);

          if (!userId) {
            userId = uuid();
            await db.insert(users).values({
              id: userId,
              email: user.email!.toLowerCase(),
              name: user.name ?? user.email!.split("@")[0],
              emailVerified: new Date(),
            });
            const [org] = await db
              .select()
              .from(organizations)
              .where(eq(organizations.slug, process.env.ORG_SLUG ?? "kanini"))
              .limit(1);
            if (org) {
              await db.insert(organizationMembers).values({
                id: uuid(),
                organizationId: org.id,
                userId,
                role: mappedRole,
              });
            }
          } else {
            const membership = await resolveMembership(userId);
            if (membership && entraGroups?.length) {
              await db
                .update(organizationMembers)
                .set({
                  role: mappedRole,
                  deletedAt: null,
                  lastActiveAt: new Date(),
                })
                .where(
                  and(
                    eq(organizationMembers.userId, userId),
                    eq(
                      organizationMembers.organizationId,
                      membership.organizationId,
                    ),
                  ),
                );
            } else if (!membership && org) {
              await db.insert(organizationMembers).values({
                id: uuid(),
                organizationId: org.id,
                userId,
                role: mappedRole,
                deletedAt: null,
                lastActiveAt: new Date(),
              });
            }
          }
          const membership = await resolveMembership(userId);
          if (membership) {
            token.organizationId = membership.organizationId;
            token.role = (entraGroups?.length
              ? mappedRole
              : membership.role) as MemberRole;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as MemberRole;
      }
      return session;
    },
  },
  trustHost: true,
};
