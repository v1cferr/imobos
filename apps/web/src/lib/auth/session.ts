import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { getAccess, type Role } from "@/lib/api/internal";

import { logAuthEvent } from "./events";

export type CurrentUser = {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
};

/**
 * The authorization check that sits next to the data. The proxy is only an optimistic filter, so
 * every page, Server Action and Route Handler calls this. Status and role come from the api on
 * every request (cached only within it), never from the cookie: disabling someone locks them out
 * on their next request. If the api cannot answer, access is denied (fail closed).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  let access;
  try {
    access = await getAccess(email);
  } catch {
    logAuthEvent("auth.error", { type: "api_unavailable" });
    return null;
  }
  if (access?.status !== "approved") return null;
  return {
    name: session.user?.name ?? null,
    email,
    image: session.user?.image ?? null,
    role: access.role,
  };
});

/** For pages and layouts: a missing, pending, disabled or revoked session goes to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin-only screens and actions. Anyone else gets a 404: the screen does not exist for them. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
