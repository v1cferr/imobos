/**
 * Liveness for the container healthcheck. Public on purpose and answers no question about the
 * user: it must never redirect, because every page now sends a visitor without a session to the
 * public login URL, which a healthcheck inside the container cannot (and should not) reach.
 */
export function GET(): Response {
  return Response.json({ status: "ok" });
}
