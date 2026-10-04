import { signInUser, type SignInOutcome } from "@/lib/api/internal";

export type SignInDecision =
  | { allowed: true }
  | { allowed: "pending" }
  | { allowed: false; reason: "provider" | "unverified_email" | SignInOutcome };

type SignInInput = {
  provider: string | undefined;
  profile: { email?: unknown; email_verified?: unknown; name?: unknown; sub?: unknown } | undefined;
};

/**
 * The only door into ImobOS (ADR 0007). Google must have verified the email; then the api decides:
 * an approved user enters, an unknown account becomes a pending request, anything else is refused.
 * The api is the only owner of who may enter, so this never decides on its own.
 */
export async function decideSignIn({ provider, profile }: SignInInput): Promise<SignInDecision> {
  if (provider !== "google") return { allowed: false, reason: "provider" };
  if (profile?.email_verified !== true || typeof profile.email !== "string") {
    return { allowed: false, reason: "unverified_email" };
  }
  if (typeof profile.sub !== "string" || profile.sub.length === 0) {
    return { allowed: false, reason: "unverified_email" };
  }
  const { outcome } = await signInUser({
    email: profile.email,
    name: typeof profile.name === "string" ? profile.name : null,
    googleSub: profile.sub,
  });
  if (outcome === "approved") return { allowed: true };
  if (outcome === "pending") return { allowed: "pending" };
  return { allowed: false, reason: outcome };
}
