import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, exchangeMock, jar } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    getCurrentUserMock: vi.fn(),
    exchangeMock: vi.fn(),
    jar: {
      store,
      get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
      delete: (name: string) => store.delete(name),
    },
  };
});
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/api/internal", () => ({ exchangeGoogleCalendar: exchangeMock }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));

import { GET } from "./route";

const COOKIE = "__Host-imobos-oauth-gcal";
const call = (query: string) =>
  GET(new NextRequest(`https://imobos.example/api/integrations/google-calendar/callback?${query}`));

describe("google calendar callback", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", "https://imobos.example");
    vi.spyOn(console, "log").mockImplementation(() => {});
    getCurrentUserMock.mockReset().mockResolvedValue({ email: "ana@example.com", role: "user" });
    exchangeMock.mockReset().mockResolvedValue({ ok: true });
    jar.store.clear();
    jar.store.set(COOKIE, "STATE.VERIFIER");
  });

  it("exchanges the code only when session, state and verifier match", async () => {
    const response = await call("code=4%2Fcode&state=STATE");
    expect(exchangeMock).toHaveBeenCalledWith({
      code: "4/code",
      codeVerifier: "VERIFIER",
      actor: "ana@example.com",
    });
    expect(response.headers.get("location")).toBe("https://imobos.example/integrations?toast=connected_google_calendar");
    expect(jar.store.has(COOKIE)).toBe(false);
  });

  it("refuses a forged or replayed state without exchanging anything", async () => {
    const response = await call("code=x&state=OTHER");
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("toast=state");
  });

  it("refuses when the flow cookie is missing (expired or another browser)", async () => {
    jar.store.clear();
    await call("code=x&state=STATE");
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it("sends someone without a session to /login", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await call("code=x&state=STATE");
    expect(response.headers.get("location")).toBe("https://imobos.example/login");
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it("treats a cancel on Google's screen as cancelled, not as an error", async () => {
    const response = await call("error=access_denied&state=STATE");
    expect(response.headers.get("location")).toContain("toast=cancelled");
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it("reports the api's refusal code", async () => {
    exchangeMock.mockResolvedValue({ ok: false, error: "scope_not_granted" });
    const response = await call("code=x&state=STATE");
    expect(response.headers.get("location")).toContain("toast=scope_not_granted");
  });
});
