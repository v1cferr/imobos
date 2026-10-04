import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { type Role, roleFor } from "./allowlist";

export type CurrentUser = {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
};

/**
 * The authorization check that sits next to the data. The proxy is only an optimistic filter, so
 * every page, Server Action and Route Handler calls this. The role is recomputed from the
 * environment on every request, never trusted from the cookie: removing an email from the lists
 * locks that person out on the next request, even with a still-valid session.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  const role = roleFor(email);
  if (!email || !role) return null;
  return { name: session.user?.name ?? null, email, image: session.user?.image ?? null, role };
}

/** For pages and layouts: a missing or revoked session goes to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
