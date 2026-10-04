import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, checkMock, disconnectMock, setMock, redirectMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  checkMock: vi.fn(),
  disconnectMock: vi.fn(),
  setMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/api/internal", () => ({ checkConnection: checkMock, disconnectConnection: disconnectMock }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setMock }) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { check, connectGoogleCalendar, disconnect } from "./actions";

const form = (provider: string) => {
  const f = new FormData();
  f.set("provider", provider);
  return f;
};

describe("integration actions", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", "https://imobos.example");
    vi.stubEnv("GOOGLE_INTEGRATIONS_CLIENT_ID", "cid");
    requireUserMock.mockReset().mockResolvedValue({ email: "ana@example.com" });
    [checkMock, disconnectMock, setMock].forEach((m) => m.mockReset());
  });

  it("starts Google's consent with a short HttpOnly __Host- cookie holding state and verifier", async () => {
    await expect(connectGoogleCalendar()).rejects.toThrow(/NEXT_REDIRECT:https:\/\/accounts\.google\.com/);
    const [name, value, options] = setMock.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(name).toBe("__Host-imobos-oauth-gcal");
    expect(value.split(".")).toHaveLength(2);
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    const url = new URL(String(redirectMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("redirect_uri")).toBe("https://imobos.example/api/integrations/google-calendar/callback");
    expect(url.searchParams.get("login_hint")).toBe("ana@example.com");
  });

  it("refuses to start without the client configured", async () => {
    vi.stubEnv("GOOGLE_INTEGRATIONS_CLIENT_ID", "");
    await expect(connectGoogleCalendar()).rejects.toThrow("NEXT_REDIRECT:/integrations?toast=not_configured");
    expect(setMock).not.toHaveBeenCalled();
  });

  it("checks and disconnects only known providers, for signed-in users", async () => {
    checkMock.mockResolvedValue({ status: "connected" });
    await expect(check(form("google_calendar"))).rejects.toThrow("NEXT_REDIRECT:/integrations?toast=checked");
    checkMock.mockResolvedValue({ status: "error" });
    await expect(check(form("google_calendar"))).rejects.toThrow("NEXT_REDIRECT:/integrations?toast=check_failed");
    await expect(disconnect(form("google_calendar"))).rejects.toThrow("NEXT_REDIRECT:/integrations?toast=disconnected");
    expect(checkMock).toHaveBeenCalledWith("google_calendar");
    expect(disconnectMock).toHaveBeenCalledWith("google_calendar");
    await expect(disconnect(form("dropbox"))).rejects.toThrow("invalid provider");
    requireUserMock.mockImplementation(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(check(form("google_calendar"))).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
