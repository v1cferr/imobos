import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));

import PrivacyPage from "./page";

describe("/privacidade", () => {
  it("renders without touching the session, since it is public", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeDefined();
    expect(screen.getByText(/não dá acesso/)).toBeDefined();
    expect(authMock).not.toHaveBeenCalled();
  });
});
