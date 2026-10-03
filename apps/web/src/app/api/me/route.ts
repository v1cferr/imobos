import { getCurrentUser } from "@/lib/auth/session";

/**
 * Session probe: who is signed in, or 401. Route Handlers are outside the proxy, so this is the
 * pattern every future handler follows: getCurrentUser() first, answer 401 (never redirect).
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ name: user.name, image: user.image });
}
