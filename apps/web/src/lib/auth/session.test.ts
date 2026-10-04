import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getAccessMock, redirectMock, notFoundMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getAccessMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api/internal", () => ({ getAccess: getAccessMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock, notFound: notFoundMock }));

import { getCurrentUser, requireAdmin, requireUser } from "./session";

const session = { user: { name: "Ana", email: "ana@example.com", image: null }, expires: "2099" };

describe("session guards", () => {
  beforeEach(() => {
    authMock.mockReset().mockResolvedValue(session);
    getAccessMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns an approved user with the role the api reports", async () => {
    getAccessMock.mockResolvedValue({ status: "approved", role: "user" });
    await expect(getCurrentUser()).resolves.toEqual({
      name: "Ana",
      email: "ana@example.com",
      image: null,
      role: "user",
    });
  });

  it.each([
    ["no session", null, null],
    ["unknown to the api", session, null],
    ["pending", session, { status: "pending", role: "user" }],
    ["disabled", session, { status: "disabled", role: "user" }],
  ])("returns null when %s", async (_, s, access) => {
    authMock.mockResolvedValue(s);
    getAccessMock.mockResolvedValue(access);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("fails closed when the api cannot answer", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    getAccessMock.mockImplementation(async () => {
      throw new Error("down");
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("requireUser sends anyone without access to /login", async () => {
    getAccessMock.mockResolvedValue({ status: "pending", role: "user" });
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("requireAdmin answers 404 to a regular user and passes an admin", async () => {
    getAccessMock.mockResolvedValue({ status: "approved", role: "user" });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
    getAccessMock.mockResolvedValue({ status: "approved", role: "admin" });
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });
});
