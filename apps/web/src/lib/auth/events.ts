import { createHash } from "node:crypto";

export type AuthEvent =
  | "auth.login.success"
  | "auth.login.pending"
  | "auth.login.denied"
  | "auth.logout"
  | "auth.error";

/**
 * A short, stable pseudonym for an email: enough to tell "the same person again" apart in logs
 * without writing the address itself. Not a secret, not reversible in practice for this purpose.
 */
export function identityHash(email: unknown): string | undefined {
  if (typeof email !== "string" || email.length === 0) return undefined;
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12);
}

/**
 * One JSON line per auth event, on stdout for `docker compose logs`. Callers pass only safe
 * fields: never tokens, authorization codes, cookies, secrets or a full email address.
 */
export function logAuthEvent(
  event: AuthEvent,
  fields: Record<string, string | undefined> = {},
): void {
  const line: Record<string, string> = { ts: new Date().toISOString(), event };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) line[key] = value;
  }
  console.log(JSON.stringify(line));
}
