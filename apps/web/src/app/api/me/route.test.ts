import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock } = vi.hoisted(() => ({ getCurrentUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

import { GET } from "./route";

describe("GET /api/me", () => {
  beforeEach(() => getCurrentUserMock.mockReset());

  it("answers 401 without a valid session", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("answers the name and picture, never the email, for the signed-in user", async () => {
    getCurrentUserMock.mockResolvedValue({ name: "Ana", email: "ana@example.com", image: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Ana", image: null });
  });
});
