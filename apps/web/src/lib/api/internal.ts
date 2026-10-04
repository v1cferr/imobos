/**
 * Server-side client for the api's /internal/* routes (ADR 0007). It runs only on the server: the
 * token never reaches a browser, and the api is reachable only over the `app` network.
 */
export type Role = "admin" | "user";
export type Status = "pending" | "approved" | "disabled";
export type SignInOutcome = "approved" | "pending" | "disabled" | "closed" | "full" | "conflict";

export type Access = { status: Status; role: Role };

export type ManagedUser = {
  id: string;
  email: string;
  name: string | null;
  status: Status;
  role: Role;
  created_at: string;
  decided_by: string | null;
  protected: boolean;
};

export class InternalApiError extends Error {
  constructor(readonly status: number) {
    super(`internal api answered ${status}`);
    this.name = "InternalApiError";
  }
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const base = process.env.API_INTERNAL_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) throw new InternalApiError(500);
  const response = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", "x-internal-token": token },
  });
  if (!response.ok && response.status !== 404) throw new InternalApiError(response.status);
  return response;
}

export async function signInUser(identity: {
  email: string;
  name: string | null;
  googleSub: string;
}): Promise<{ outcome: SignInOutcome; role: Role | null }> {
  const response = await call("/internal/users/sign-in", {
    method: "POST",
    body: JSON.stringify({
      email: identity.email,
      name: identity.name,
      google_sub: identity.googleSub,
    }),
  });
  return response.json();
}

/** Current access of an email, or null when the api does not know it. */
export async function getAccess(email: string): Promise<Access | null> {
  const response = await call(`/internal/users/access?email=${encodeURIComponent(email)}`);
  if (response.status === 404) return null;
  return response.json();
}

export async function listUsers(): Promise<ManagedUser[]> {
  return (await call("/internal/users")).json();
}

export async function updateUser(
  id: string,
  change: { actor: string; status?: Status; role?: Role },
): Promise<void> {
  const response = await call(`/internal/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
  if (response.status === 404) throw new InternalApiError(404);
}

export async function rejectUser(id: string): Promise<void> {
  const response = await call(`/internal/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (response.status === 404) throw new InternalApiError(404);
}

export type Provider = "google_calendar" | "hubspot";

/** What the api tells about a connected account. Never carries a token (ADR 0008). */
export type ConnectionInfo = {
  provider: Provider;
  status: "connected" | "error" | null;
  available: boolean;
  account: string | null;
  connected_by: string | null;
  connected_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
};

export async function listConnections(): Promise<ConnectionInfo[]> {
  return (await call("/internal/connections")).json();
}

/** Hands the authorization code to the api, which exchanges and stores the tokens. */
export async function exchangeGoogleCalendar(change: {
  code: string;
  codeVerifier: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = process.env.API_INTERNAL_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) throw new InternalApiError(500);
  const response = await fetch(`${base}/internal/connections/google_calendar/exchange`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", "x-internal-token": token },
    body: JSON.stringify({ code: change.code, code_verifier: change.codeVerifier, actor: change.actor }),
  });
  if (response.ok) return { ok: true };
  if (response.status === 400 || response.status === 409) {
    const { detail } = (await response.json()) as { detail?: string };
    return { ok: false, error: detail ?? "exchange_failed" };
  }
  throw new InternalApiError(response.status);
}

export async function checkConnection(provider: Provider): Promise<void> {
  await call(`/internal/connections/${provider}/check`, { method: "POST" });
}

export async function disconnectConnection(provider: Provider): Promise<void> {
  await call(`/internal/connections/${provider}`, { method: "DELETE" });
}
