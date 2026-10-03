import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, signOutMock } = vi.hoisted(() => ({ signInMock: vi.fn(), signOutMock: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: signInMock, signOut: signOutMock }));

import { logout } from "./(app)/actions";
import { signInWithGoogle } from "./login/actions";

describe("auth server actions", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
  });

  it("starts Google sign-in with a fixed, same-origin landing page", async () => {
    await signInWithGoogle();
    expect(signInMock).toHaveBeenCalledWith("google", { redirectTo: "/today" });
  });

  it("logs out and sends the user back to /login", async () => {
    await logout();
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
