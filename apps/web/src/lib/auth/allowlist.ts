/**
 * Who may enter ImobOS. The list lives in the environment (IMOBOS_ALLOWED_EMAILS), never in the
 * repository: comma-separated, compared case-insensitively. An empty or missing list denies
 * everyone, so a misconfigured deploy fails closed.
 */
export function parseAllowlist(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

export function isAllowedEmail(
  email: unknown,
  raw: string | undefined = process.env.IMOBOS_ALLOWED_EMAILS,
): boolean {
  if (typeof email !== "string" || email.length === 0) return false;
  return parseAllowlist(raw).has(email.trim().toLowerCase());
}
