import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { isAllowedEmail } from "./allowlist";

export type CurrentUser = {
  name: string | null;
  email: string;
  image: string | null;
};

/**
 * The authorization check that sits next to the data. The proxy is only an optimistic filter, so
 * every page, Server Action and Route Handler calls this. It re-checks the allowlist too: removing
 * an email from IMOBOS_ALLOWED_EMAILS locks that person out on the next request, even with a
 * still-valid cookie.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAllowedEmail(email)) return null;
  return { name: session.user?.name ?? null, email, image: session.user?.image ?? null };
}

/** For pages and layouts: a missing or revoked session goes to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
