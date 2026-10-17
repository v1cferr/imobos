import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, requireAdminMock, listUsersMock, listConnectionsMock, getTodayMock, getAgendaMock } = vi.hoisted(() => ({
  getTodayMock: vi.fn(),
  getAgendaMock: vi.fn(),
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
vi.mock("@/lib/api/crm", () => ({ listClients: vi.fn(), getClient: vi.fn(), listBoard: vi.fn(), getToday: getTodayMock, getAgenda: getAgendaMock }));
vi.mock("./today/actions", () => ({ doneAction: vi.fn(), postponeAction: vi.fn() }));
vi.mock("./clients/actions", () => ({
  createClientAction: vi.fn(),
  updateClientAction: vi.fn(),
  deleteClientAction: vi.fn(),
  openDealAction: vi.fn(),
  updateDealAction: vi.fn(),
  addActivityAction: vi.fn(),
}));
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
import IntegrationsPage from "./integrations/page";
import AppLayout from "./layout";
import ClientPage from "./clients/[id]/page";
import EditClientPage from "./clients/[id]/edit/page";
import NewClientPage from "./clients/new/page";
import ClientsPage from "./clients/page";
import FunnelsPage from "./funnels/page";
import SettingsPage from "./settings/page";
import TodayPage from "./today/page";

const USER = { name: "Ana Paula", email: "ana@example.com", image: null, role: "user" as const };
const noParams = { params: Promise.resolve({}), searchParams: Promise.resolve({}) };
const withId = { params: Promise.resolve({ id: "3f2b6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b" }), searchParams: Promise.resolve({}) };
const PAGES = {
  TodayPage,
  ClientsPage: () => ClientsPage(noParams),
  NewClientPage: () => NewClientPage(noParams),
  ClientPage: () => ClientPage(withId),
  EditClientPage: () => EditClientPage(withId),
  FunnelsPage: () => FunnelsPage(noParams),
  CalendarPage,
  IntegrationsPage,
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
    for (const label of ["Hoje", "Clientes", "Funis", "Agenda", "Integrações", "Configurações"]) {
      expect(screen.getByRole("link", { name: label })).toBeDefined();
    }
    expect(screen.getByRole("link", { name: "Hoje" }).hasAttribute("data-active")).toBe(true);
    expect(screen.getByRole("link", { name: "Clientes" }).hasAttribute("data-active")).toBe(false);
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

  it("today lists what is late with a one-tap done, and says when the calendar is not connected", async () => {
    const deal = {
      id: "d1", client_id: "c1", pipeline: "sales", stage: "visit_scheduled", property: "Caminhos da Lapa",
      value: null, next_action: "Confirmar visita", next_action_due: "2026-10-16T13:00:00Z", objections: null,
      lost_reason: null, created_at: "2026-10-10T12:00:00Z", updated_at: "2026-10-10T12:00:00Z", closed_at: null,
      client_name: "João Silva", client_phone: null,
    };
    getTodayMock.mockResolvedValue({
      now: "2026-10-17T13:00:00Z",
      items: [{ reason: "overdue", deal, last_contact_at: null }],
      events: [],
      calendar: "not_connected",
    });
    render(await TodayPage());
    expect(screen.getByRole("heading", { level: 1, name: "O que preciso fazer hoje?" })).toBeDefined();
    expect(screen.getByRole("link", { name: "João Silva" })).toBeDefined();
    expect(screen.getByText(/Confirmar visita · era para 16\/10/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Feito" })).toBeDefined();
    expect(screen.getByText(/Conecte a Google Agenda/)).toBeDefined();
  });

  it("the agenda groups the week by São Paulo day, all-day events included", async () => {
    getAgendaMock.mockResolvedValue({
      now: "2026-10-17T13:00:00Z",
      calendar: "ok",
      events: [
        { title: "Visita Lapa", start: "2026-10-18T01:30:00Z", end: null, all_day: false, location: null, link: null, client_id: null, client_name: null },
        { title: "Plantão", start: "2026-10-19T00:00:00Z", end: null, all_day: true, location: null, link: null, client_id: null, client_name: null },
      ],
    });
    render(await CalendarPage());
    // 22:30 of the 17th in São Paulo, although it is already the 18th in UTC.
    const today = screen.getByRole("region", { name: "Hoje" });
    expect(today.textContent).toContain("Visita Lapa");
    expect(screen.getByRole("region", { name: "Amanhã" }).textContent).toContain("Nada marcado.");
    expect(screen.getByText("Plantão")).toBeDefined();
  });

  it("today with nothing pending says so", async () => {
    getTodayMock.mockResolvedValue({ now: "2026-10-17T13:00:00Z", items: [], events: [], calendar: "ok" });
    render(await TodayPage());
    expect(screen.getByText("Tudo em dia")).toBeDefined();
    expect(screen.getByText("Nada na agenda hoje.")).toBeDefined();
  });

  it("integrations shows the calendar state and the Chatwoot channels", async () => {
    listConnectionsMock.mockResolvedValue([
      { provider: "google_calendar", status: null, available: true, account: null, connected_by: null, connected_at: null, last_checked_at: null, last_error: null },
    ]);
    render(await IntegrationsPage());
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDefined();
    expect(screen.getAllByText("Em breve")).toHaveLength(4);
  });

  it("a connected calendar shows the account and offers verify and disconnect, never a token", async () => {
    listConnectionsMock.mockResolvedValue([
      { provider: "google_calendar", status: "connected", available: true, account: "corretora@example.com", connected_by: "a@example.com", connected_at: "2026-10-04T12:00:00Z", last_checked_at: "2026-10-04T12:00:00Z", last_error: null },
    ]);
    render(await IntegrationsPage());
    expect(screen.getByText("Conta: corretora@example.com")).toBeDefined();
    expect(screen.getByRole("button", { name: "Verificar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDefined();
  });

});
