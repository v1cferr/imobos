import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInUserMock } = vi.hoisted(() => ({ signInUserMock: vi.fn() }));
vi.mock("@/lib/api/internal", () => ({ signInUser: signInUserMock }));

import { decideSignIn } from "./sign-in-policy";

const verified = { email: "ana@example.com", email_verified: true, name: "Ana", sub: "g-1" };

describe("decideSignIn", () => {
  beforeEach(() => {
    signInUserMock.mockReset();
  });

  it("lets an approved user in", async () => {
    signInUserMock.mockResolvedValue({ outcome: "approved", role: "user" });
    await expect(decideSignIn({ provider: "google", profile: verified })).resolves.toEqual({
      allowed: true,
    });
    expect(signInUserMock).toHaveBeenCalledWith({
      email: "ana@example.com",
      name: "Ana",
      googleSub: "g-1",
    });
  });

  it("turns an unknown account into a pending request, not a session", async () => {
    signInUserMock.mockResolvedValue({ outcome: "pending", role: "user" });
    await expect(decideSignIn({ provider: "google", profile: verified })).resolves.toEqual({
      allowed: "pending",
    });
  });

  it.each(["disabled", "closed", "full", "conflict"] as const)(
    "refuses when the api answers %s",
    async (outcome) => {
      signInUserMock.mockResolvedValue({ outcome, role: null });
      await expect(decideSignIn({ provider: "google", profile: verified })).resolves.toEqual({
        allowed: false,
        reason: outcome,
      });
    },
  );

  it("never asks the api about an unverified email, a missing sub or another provider", async () => {
    await expect(
      decideSignIn({ provider: "google", profile: { ...verified, email_verified: false } }),
    ).resolves.toEqual({ allowed: false, reason: "unverified_email" });
    await expect(
      decideSignIn({ provider: "google", profile: { ...verified, sub: "" } }),
    ).resolves.toEqual({ allowed: false, reason: "unverified_email" });
    await expect(decideSignIn({ provider: "github", profile: verified })).resolves.toEqual({
      allowed: false,
      reason: "provider",
    });
    await expect(decideSignIn({ provider: "google", profile: undefined })).resolves.toEqual({
      allowed: false,
      reason: "unverified_email",
    });
    expect(signInUserMock).not.toHaveBeenCalled();
  });
});
