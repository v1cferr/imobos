import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { getCurrentUser, requireUser } from "./session";

const session = (email: string) => ({
  user: { name: "Ana", email, image: null },
  expires: "2099-01-01T00:00:00.000Z",
});

describe("session guards", () => {
  beforeEach(() => {
    vi.stubEnv("IMOBOS_ALLOWED_EMAILS", "ana@example.com");
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the user for a valid session of an allowlisted email", async () => {
    authMock.mockResolvedValue(session("ana@example.com"));
    await expect(getCurrentUser()).resolves.toEqual({
      name: "Ana",
      email: "ana@example.com",
      image: null,
    });
  });

  it("returns null without a session", async () => {
    authMock.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when the session's email was removed from the allowlist", async () => {
    authMock.mockResolvedValue(session("ana@example.com"));
    vi.stubEnv("IMOBOS_ALLOWED_EMAILS", "outra@example.com");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("requireUser sends a visitor without a session to /login", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("requireUser lets an allowlisted user through without redirecting", async () => {
    authMock.mockResolvedValue(session("ana@example.com"));
    await expect(requireUser()).resolves.toMatchObject({ email: "ana@example.com" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
