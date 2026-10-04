import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, requireAdminMock, listUsersMock, listConnectionsMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireAdminMock: vi.fn(),
  listUsersMock: vi.fn(),
  listConnectionsMock: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: requireUserMock,
  requireAdmin: requireAdminMock,
}));
vi.mock("@/lib/api/internal", () => ({ listUsers: listUsersMock, listConnections: listConnectionsMock }));
vi.mock("./integrations/actions", () => ({ check: vi.fn(), connectGoogleCalendar: vi.fn(), disconnect: vi.fn() }));
vi.mock("./actions", () => ({ logout: vi.fn() }));
vi.mock("./admin/users/actions", () => ({
  approve: vi.fn(),
  reject: vi.fn(),
  disable: vi.fn(),
  enable: vi.fn(),
  setRole: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import AdminUsersPage from "./admin/users/page";
import CalendarPage from "./calendar/page";
import ConversationsPage from "./conversations/page";
import IntegrationsPage from "./integrations/page";
import AppLayout from "./layout";
import LeadsPage from "./leads/page";
import SettingsPage from "./settings/page";
import TodayPage from "./today/page";

const USER = { name: "Ana Paula", email: "ana@example.com", image: null, role: "user" as const };
const noParams = { params: Promise.resolve({}), searchParams: Promise.resolve({}) };
const PAGES = {
  TodayPage,
  LeadsPage,
  ConversationsPage,
  CalendarPage,
  IntegrationsPage: () => IntegrationsPage(noParams),
  SettingsPage,
};

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
    expect(screen.getByRole("link", { name: "Hoje" }).hasAttribute("data-active")).toBe(true);
    expect(screen.getByRole("link", { name: "Leads" }).hasAttribute("data-active")).toBe(false);
    const userMenu = screen.getByRole("button", { name: /Ana Paula/ });
    fireEvent.click(userMenu);
    expect(await screen.findByRole("menuitem", { name: "Sair" })).toBeDefined();
    expect(screen.getByRole("menuitemradio", { name: "Automático" })).toBeDefined();
  });

  it("only an admin sees the Administrador label", async () => {
    render(await AppLayout({ children: null, params: Promise.resolve({}) }));
    expect(screen.queryByText("Administrador")).toBeNull();
    requireUserMock.mockResolvedValue({ ...USER, role: "admin" });
    render(await AppLayout({ children: null, params: Promise.resolve({}) }));
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

  it("integrations shows the calendar state, HubSpot on hold and the Chatwoot channels", async () => {
    listConnectionsMock.mockResolvedValue([
      { provider: "google_calendar", status: null, available: true, account: null, connected_by: null, connected_at: null, last_checked_at: null, last_error: null },
      { provider: "hubspot", status: null, available: false, account: null, connected_by: null, connected_at: null, last_checked_at: null, last_error: null },
    ]);
    render(await IntegrationsPage(noParams));
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDefined();
    expect(screen.getByText("Em espera")).toBeDefined();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
  });

  it("a connected calendar shows the account and offers verify and disconnect, never a token", async () => {
    listConnectionsMock.mockResolvedValue([
      { provider: "google_calendar", status: "connected", available: true, account: "corretora@example.com", connected_by: "a@example.com", connected_at: "2026-10-04T12:00:00Z", last_checked_at: "2026-10-04T12:00:00Z", last_error: null },
    ]);
    render(await IntegrationsPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ connected: "google_calendar" }) }));
    expect(screen.getByText("Conta: corretora@example.com")).toBeDefined();
    expect(screen.getByRole("button", { name: "Verificar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDefined();
    expect(screen.getByText("Google Agenda conectado.")).toBeDefined();
  });

});
