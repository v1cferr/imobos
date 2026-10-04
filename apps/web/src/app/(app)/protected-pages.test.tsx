import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, requireAdminMock, listUsersMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireAdminMock: vi.fn(),
  listUsersMock: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: requireUserMock,
  requireAdmin: requireAdminMock,
}));
vi.mock("@/lib/api/internal", () => ({ listUsers: listUsersMock }));
vi.mock("./actions", () => ({ logout: vi.fn() }));
vi.mock("./admin/users/actions", () => ({
  approve: vi.fn(),
  reject: vi.fn(),
  disable: vi.fn(),
  enable: vi.fn(),
  setRole: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));

import AdminUsersPage from "./admin/users/page";
import CalendarPage from "./calendar/page";
import ConversationsPage from "./conversations/page";
import IntegrationsPage from "./integrations/page";
import AppLayout from "./layout";
import LeadsPage from "./leads/page";
import SettingsPage from "./settings/page";
import TodayPage from "./today/page";

const USER = { name: "Ana Paula", email: "ana@example.com", image: null, role: "user" as const };
const PAGES = { TodayPage, LeadsPage, ConversationsPage, CalendarPage, IntegrationsPage, SettingsPage };

describe("protected screens", () => {
  // Block body on purpose: a function returned from beforeEach becomes a teardown hook.
  beforeEach(() => {
    requireUserMock.mockReset().mockResolvedValue(USER);
  });

  it.each(Object.entries(PAGES))("%s checks the session itself, not only the layout", async (_, Page) => {
    requireUserMock.mockImplementation(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("the layout refuses to render without a user", async () => {
    requireUserMock.mockImplementation(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(AppLayout({ children: null, params: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });

  it("the layout shows the navigation, the user and a way out", async () => {
    render(await AppLayout({ children: <p>conteúdo</p>, params: Promise.resolve({}) }));
    for (const label of ["Hoje", "Leads", "Conversas", "Agenda", "Integrações", "Configurações"]) {
      expect(screen.getByRole("link", { name: label })).toBeDefined();
    }
    expect(screen.getByRole("link", { name: "Hoje" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Ana Paula")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sair" })).toBeDefined();
  });

  it("only an admin sees the Administrador label", async () => {
    render(await AppLayout({ children: null, params: Promise.resolve({}) }));
    expect(screen.queryByText("Administrador")).toBeNull();
    requireUserMock.mockResolvedValue({ ...USER, role: "admin" });
    render(await SettingsPage());
    expect(screen.getAllByText("Administrador").length).toBeGreaterThan(0);
  });

  it("only an admin gets the Usuários entry in the navigation", async () => {
    render(await AppLayout({ children: null, params: Promise.resolve({}) }));
    expect(screen.queryByRole("link", { name: "Usuários" })).toBeNull();
    requireUserMock.mockResolvedValue({ ...USER, role: "admin" });
    render(await AppLayout({ children: null, params: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Usuários" })).toBeDefined();
  });

  it("the admin screen refuses anyone requireAdmin refuses", async () => {
    requireAdminMock.mockImplementation(async () => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(AdminUsersPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("the admin screen groups requests, active users and disabled ones", async () => {
    requireAdminMock.mockResolvedValue({ ...USER, role: "admin" });
    const base = { name: null, created_at: "2026-10-04T12:00:00Z", decided_by: null };
    listUsersMock.mockResolvedValue([
      { ...base, id: "1", email: "admin@example.com", status: "approved", role: "admin", protected: true },
      { ...base, id: "2", email: "mae@example.com", status: "pending", role: "user", protected: false },
      { ...base, id: "3", email: "old@example.com", status: "disabled", role: "user", protected: false },
    ]);
    render(await AdminUsersPage());
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reativar" })).toBeDefined();
    expect(screen.getByText("Principal")).toBeDefined();
    // The protected bootstrap admin offers no button to change or disable it.
    expect(screen.queryByRole("button", { name: "Desativar" })).toBeNull();
  });

  it("today answers the daily question and labels its numbers as examples", async () => {
    render(await TodayPage());
    expect(screen.getByRole("heading", { level: 1, name: "O que preciso fazer hoje?" })).toBeDefined();
    expect(screen.getByText(/dados de exemplo/)).toBeDefined();
    expect(screen.getByText("João Silva")).toBeDefined();
  });

  it("integrations shows the services without any way to connect them yet", async () => {
    render(await IntegrationsPage());
    expect(screen.getAllByText("Em breve")).toHaveLength(6);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
