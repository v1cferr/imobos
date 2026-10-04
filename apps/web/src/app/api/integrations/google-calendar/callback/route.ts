import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { exchangeGoogleCalendar } from "@/lib/api/internal";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuthEvent } from "@/lib/auth/events";
import { withFlash } from "@/lib/flash";
import { cookieName, sameState, unpackFlow } from "@/lib/integrations/google-oauth";

/**
 * Google sends the broker back here. The session, the state and the PKCE verifier must all match
 * before the code reaches the api; otherwise nothing is exchanged.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const site = process.env.SITE_URL ?? request.nextUrl.origin;
  const back = (flash: string) => NextResponse.redirect(new URL(withFlash("/integrations", flash), site));

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", site));

  const jar = await cookies();
  const name = cookieName(site.startsWith("https://"));
  const flow = unpackFlow(jar.get(name)?.value);
  jar.delete(name);

  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    // access_denied: the broker cancelled on Google's screen. Not an error worth alarming about.
    return back("cancelled");
  }
  const code = params.get("code");
  if (!flow || !code || !sameState(flow.state, params.get("state"))) {
    logAuthEvent("auth.error", { type: "integration_state_mismatch" });
    return back("state");
  }

  const result = await exchangeGoogleCalendar({ code, codeVerifier: flow.verifier, actor: user.email });
  if (!result.ok) {
    logAuthEvent("auth.error", { type: `integration_${result.error}` });
    return back(result.error);
  }
  return back("connected_google_calendar");
}
