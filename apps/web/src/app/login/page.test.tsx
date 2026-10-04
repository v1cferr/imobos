import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, redirectMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("./actions", () => ({ signInWithGoogle: vi.fn() }));

import LoginPage from "./page";

const params = (error?: string, status?: string) => ({
  params: Promise.resolve({}),
  searchParams: Promise.resolve({ ...(error ? { error } : {}), ...(status ? { status } : {}) }),
});

describe("/login", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset().mockResolvedValue(null);
    redirectMock.mockClear();
  });

  it("offers Google sign-in to a visitor", async () => {
    render(await LoginPage(params()));
    expect(screen.getByRole("button", { name: "Continuar com Google" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains a refused account without revealing which one is allowed", async () => {
    render(await LoginPage(params("AccessDenied")));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("não tem acesso");
    expect(alert.textContent).not.toMatch(/@/);
  });

  it("tells a new account its request is waiting for approval", async () => {
    render(await LoginPage(params(undefined, "pending")));
    expect(screen.getByRole("status").textContent).toContain("aprovar");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a generic message for any other error code", async () => {
    render(await LoginPage(params("<script>alert(1)</script>")));
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível entrar");
  });

  it("sends a signed-in user straight to /today", async () => {
    getCurrentUserMock.mockResolvedValue({ name: "Ana", email: "ana@example.com", image: null, role: "user" });
    await expect(LoginPage(params())).rejects.toThrow("NEXT_REDIRECT:/today");
  });
});
