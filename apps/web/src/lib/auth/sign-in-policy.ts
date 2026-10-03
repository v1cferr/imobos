import { isAllowedEmail } from "./allowlist";

export type SignInDecision =
  | { allowed: true }
  | { allowed: false; reason: "provider" | "unverified_email" | "not_allowlisted" };

type SignInInput = {
  provider: string | undefined;
  profile: { email?: unknown; email_verified?: unknown } | undefined;
};

/**
 * The only door into ImobOS: a Google identity whose email Google has verified and that is on the
 * allowlist. There is no user table, so there is no sign-up to bypass.
 */
export function decideSignIn({ provider, profile }: SignInInput, allowlist?: string): SignInDecision {
  if (provider !== "google") return { allowed: false, reason: "provider" };
  if (profile?.email_verified !== true) return { allowed: false, reason: "unverified_email" };
  if (!isAllowedEmail(profile.email, allowlist ?? process.env.IMOBOS_ALLOWED_EMAILS)) {
    return { allowed: false, reason: "not_allowlisted" };
  }
  return { allowed: true };
}
