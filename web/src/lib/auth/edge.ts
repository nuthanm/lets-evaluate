/**
 * Edge-compatible NextAuth config used exclusively in middleware.
 *
 * The middleware runs in the Next.js Edge runtime which does NOT support
 * native Node.js TCP sockets — so we cannot import the postgres client or
 * bcrypt here.  This stripped-down config contains only what the Edge runtime
 * needs: JWT verification + the session/jwt callbacks that map token fields to
 * the session object.
 *
 * Route handlers (Node.js runtime) continue to use the full config exported
 * from @/lib/auth.
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { MemberRole } from "./config";

const edgeAuthConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [], // No providers needed — edge auth is read-only JWT verification
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token }) {
      // During middleware calls the `user` arg is always undefined (no sign-in
      // happens in the Edge runtime), so we simply pass the token through.
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

export const { auth } = NextAuth(edgeAuthConfig);
