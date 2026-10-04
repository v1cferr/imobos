import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { identityHash, logAuthEvent } from "@/lib/auth/events";
import { decideSignIn } from "@/lib/auth/sign-in-policy";

/** A session lasts 7 days of inactivity; each day of use slides it forward. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Authentication only: Google tells us WHO is signing in, nothing more (ADR 0006). Connecting
 * Gmail, Calendar or any other API is V1C-85 and never happens through this login.
 *
 * No adapter on purpose: the session is an encrypted JWT (JWE) in an HttpOnly cookie, and the
 * default jwt callback keeps only name, email, picture and sub. Google's access, refresh and id
 * tokens are dropped once the identity is verified.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // PKCE is the default; state and nonce are added as defense in depth.
      checks: ["pkce", "state", "nonce"],
      authorization: {
        // Identity scopes only, no access_type=offline: there is no refresh token to keep.
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS, updateAge: 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      const decision = await decideSignIn({ provider: account?.provider, profile });
      if (decision.allowed === "pending") {
        // A request now waits for an admin. No session is created; the page says so.
        logAuthEvent("auth.login.pending", { id: identityHash(profile?.email) });
        return "/login?status=pending";
      }
      if (!decision.allowed) {
        logAuthEvent("auth.login.denied", {
          reason: decision.reason,
          id: identityHash(profile?.email),
        });
      }
      return decision.allowed;
    },
    // Used by proxy.ts as an optimistic gate. Pages, actions and handlers check again.
    authorized({ auth: session }) {
      return Boolean(session?.user);
    },
  },
  events: {
    signIn({ user }) {
      logAuthEvent("auth.login.success", { id: identityHash(user.email) });
    },
    signOut() {
      logAuthEvent("auth.logout");
    },
  },
  logger: {
    // Auth.js errors can carry request details; only the error's stable type is logged
    // (`type` survives minification, unlike the class name).
    error(error) {
      const type = "type" in error && typeof error.type === "string" ? error.type : "Unknown";
      logAuthEvent("auth.error", { type });
    },
    warn(code) {
      console.warn(JSON.stringify({ ts: new Date().toISOString(), event: "auth.warn", code }));
    },
    debug() {},
  },
});
