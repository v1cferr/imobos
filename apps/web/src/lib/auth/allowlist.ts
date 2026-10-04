/**
 * Who may enter ImobOS, and as what. Both lists live in the environment, never in the repository:
 * comma-separated Google emails, compared case-insensitively.
 *
 *   IMOBOS_ADMIN_EMAILS    operators: full access, plus admin-only screens as they appear
 *   IMOBOS_ALLOWED_EMAILS  regular users
 *
 * An email on neither list has no role and is denied, so empty lists fail closed. A user-managed
 * list with approval replaces this when sign-up opens (V1C-90).
 */
export type Role = "admin" | "user";

export function parseAllowlist(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

type RoleLists = { admins?: string; users?: string };

export function roleFor(
  email: unknown,
  lists: RoleLists = {
    admins: process.env.IMOBOS_ADMIN_EMAILS,
    users: process.env.IMOBOS_ALLOWED_EMAILS,
  },
): Role | null {
  if (typeof email !== "string" || email.length === 0) return null;
  const normalized = email.trim().toLowerCase();
  if (parseAllowlist(lists.admins).has(normalized)) return "admin";
  if (parseAllowlist(lists.users).has(normalized)) return "user";
  return null;
}
