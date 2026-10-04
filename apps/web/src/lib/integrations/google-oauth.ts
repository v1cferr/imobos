import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The browser half of the Google Calendar connection (ADR 0008): state and PKCE live in a short,
 * HttpOnly cookie; the code goes to the api, which alone ever sees the tokens.
 */
export const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const CALLBACK_PATH = "/api/integrations/google-calendar/callback";
export const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events.readonly"];
export const COOKIE_MAX_AGE_SECONDS = 10 * 60;

/** `__Host-` needs HTTPS; local development runs on plain HTTP. */
export function cookieName(secure: boolean): string {
  return secure ? "__Host-imobos-oauth-gcal" : "imobos-oauth-gcal";
}

export function newFlow(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  loginHint?: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    // A refresh token, so the calendar can be read without the broker present, and the consent
    // screen every time, so Google always returns that refresh token.
    access_type: "offline",
    prompt: "consent",
    ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
  }).toString();
  return url.toString();
}

/** Serialized as "state.verifier"; both are base64url, so the dot is unambiguous. */
export function packFlow(state: string, verifier: string): string {
  return `${state}.${verifier}`;
}

export function unpackFlow(value: string | undefined): { state: string; verifier: string } | null {
  if (!value) return null;
  const [state, verifier, ...rest] = value.split(".");
  if (!state || !verifier || rest.length) return null;
  return { state, verifier };
}

export function sameState(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
