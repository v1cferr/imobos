import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, updateUserMock, rejectUserMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  updateUserMock: vi.fn(),
  rejectUserMock: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/api/internal", () => ({ updateUser: updateUserMock, rejectUser: rejectUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { approve, disable, reject, setRole } from "./actions";

const ID = "3f2b6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("admin user actions", () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ email: "admin@example.com", role: "admin" });
    updateUserMock.mockReset();
    rejectUserMock.mockReset();
  });

  it("approves on behalf of the signed-in admin", async () => {
    await approve(form({ id: ID }));
    expect(updateUserMock).toHaveBeenCalledWith(ID, {
      actor: "admin@example.com",
      status: "approved",
    });
  });

  it("does nothing for someone who is not an admin", async () => {
    requireAdminMock.mockImplementation(async () => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(disable(form({ id: ID }))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(reject(form({ id: ID }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(rejectUserMock).not.toHaveBeenCalled();
  });

  it("refuses a malformed id or role before calling the api", async () => {
    await expect(approve(form({ id: "../../etc" }))).rejects.toThrow("invalid user id");
    await expect(setRole(form({ id: ID, role: "root" }))).rejects.toThrow("invalid role");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("changes the role and rejects pending requests", async () => {
    await setRole(form({ id: ID, role: "admin" }));
    expect(updateUserMock).toHaveBeenCalledWith(ID, { actor: "admin@example.com", role: "admin" });
    await reject(form({ id: ID }));
    expect(rejectUserMock).toHaveBeenCalledWith(ID);
  });
});
