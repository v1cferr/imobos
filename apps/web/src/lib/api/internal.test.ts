import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAccess, InternalApiError, signInUser } from "./internal";

const fetchMock = vi.fn();

describe("internal api client", () => {
  beforeEach(() => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000");
    vi.stubEnv("INTERNAL_API_TOKEN", "secret-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the token and never caches", async () => {
    fetchMock.mockResolvedValue(Response.json({ outcome: "pending", role: "user" }));
    await signInUser({ email: "ana@example.com", name: "Ana", googleSub: "g-1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api:8000/internal/users/sign-in");
    expect((init.headers as Record<string, string>)["x-internal-token"]).toBe("secret-token");
    expect(init.cache).toBe("no-store");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "ana@example.com",
      name: "Ana",
      google_sub: "g-1",
    });
  });

  it("reads an unknown email as no access", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(getAccess("x@example.com")).resolves.toBeNull();
  });

  it("encodes the email in the query string", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "approved", role: "user" }));
    await getAccess("a+b@example.com");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api:8000/internal/users/access?email=a%2Bb%40example.com",
    );
  });

  it("throws on any other failure, so callers fail closed", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(getAccess("x@example.com")).rejects.toBeInstanceOf(InternalApiError);
  });

  it("refuses to call without its configuration", async () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "");
    await expect(getAccess("x@example.com")).rejects.toBeInstanceOf(InternalApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
