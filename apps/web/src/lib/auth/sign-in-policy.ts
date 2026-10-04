import { type Role, roleFor } from "./allowlist";

export type SignInDecision =
  | { allowed: true; role: Role }
  | { allowed: false; reason: "provider" | "unverified_email" | "not_allowlisted" };

type SignInInput = {
  provider: string | undefined;
  profile: { email?: unknown; email_verified?: unknown } | undefined;
};

/**
 * The only door into ImobOS: a Google identity whose email Google has verified and that has a role
 * (admin or user). There is no user table, so there is no sign-up to bypass.
 */
export function decideSignIn(
  { provider, profile }: SignInInput,
  lists?: Parameters<typeof roleFor>[1],
): SignInDecision {
  if (provider !== "google") return { allowed: false, reason: "provider" };
  if (profile?.email_verified !== true) return { allowed: false, reason: "unverified_email" };
  const role = roleFor(profile.email, lists);
  if (!role) return { allowed: false, reason: "not_allowlisted" };
  return { allowed: true, role };
}
