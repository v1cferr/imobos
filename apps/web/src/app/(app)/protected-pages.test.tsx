import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));
vi.mock("./actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));

import CalendarPage from "./calendar/page";
import ConversationsPage from "./conversations/page";
import IntegrationsPage from "./integrations/page";
import AppLayout from "./layout";
import LeadsPage from "./leads/page";
import SettingsPage from "./settings/page";
import TodayPage from "./today/page";

const USER = { name: "Ana Paula", email: "ana@example.com", image: null };
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
