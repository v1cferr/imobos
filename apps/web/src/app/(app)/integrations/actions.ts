"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkConnection, disconnectConnection, type Provider } from "@/lib/api/internal";
import { requireUser } from "@/lib/auth/session";
import { withFlash } from "@/lib/flash";
import {
  authorizeUrl,
  CALLBACK_PATH,
  COOKIE_MAX_AGE_SECONDS,
  cookieName,
  newFlow,
  packFlow,
} from "@/lib/integrations/google-oauth";

const PROVIDERS: readonly Provider[] = ["google_calendar", "hubspot"];

function provider(form: FormData): Provider {
  const value = form.get("provider");
  if (!PROVIDERS.includes(value as Provider)) throw new Error("invalid provider");
  return value as Provider;
}

/** Starts the Google consent screen. Every approved user may connect the workspace's calendar. */
export async function connectGoogleCalendar(): Promise<void> {
  const user = await requireUser();
  const clientId = process.env.GOOGLE_INTEGRATIONS_CLIENT_ID;
  const site = process.env.SITE_URL;
  if (!clientId || !site) redirect(withFlash("/integrations", "not_configured"));

  const { state, verifier, challenge } = newFlow();
  const secure = site.startsWith("https://");
  (await cookies()).set(cookieName(secure), packFlow(state, verifier), {
    httpOnly: true,
    secure,
    sameSite: "lax", // the callback is a top-level navigation from Google
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  redirect(
    authorizeUrl({
      clientId,
      redirectUri: site + CALLBACK_PATH,
      state,
      challenge,
      loginHint: user.email,
    }),
  );
}

export async function check(form: FormData): Promise<void> {
  await requireUser();
  const result = await checkConnection(provider(form));
  revalidatePath("/integrations");
  redirect(withFlash("/integrations", result.status === "connected" ? "checked" : "check_failed"));
}

export async function disconnect(form: FormData): Promise<void> {
  await requireUser();
  await disconnectConnection(provider(form));
  revalidatePath("/integrations");
  redirect(withFlash("/integrations", "disconnected"));
}
