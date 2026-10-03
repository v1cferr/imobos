import { describe, expect, it } from "vitest";

import { decideSignIn } from "./sign-in-policy";

const ALLOWED = "ana@example.com";

describe("decideSignIn", () => {
  it("lets the allowlisted Google identity in", () => {
    expect(
      decideSignIn(
        { provider: "google", profile: { email: "Ana@Example.com", email_verified: true } },
        ALLOWED,
      ),
    ).toEqual({ allowed: true });
  });

  it("refuses any other Google account", () => {
    expect(
      decideSignIn(
        { provider: "google", profile: { email: "outra@example.com", email_verified: true } },
        ALLOWED,
      ),
    ).toEqual({ allowed: false, reason: "not_allowlisted" });
  });

  it("refuses an allowlisted address Google has not verified", () => {
    expect(
      decideSignIn({ provider: "google", profile: { email: ALLOWED, email_verified: false } }, ALLOWED),
    ).toEqual({ allowed: false, reason: "unverified_email" });
    expect(decideSignIn({ provider: "google", profile: { email: ALLOWED } }, ALLOWED)).toEqual({
      allowed: false,
      reason: "unverified_email",
    });
  });

  it("refuses any provider other than Google", () => {
    expect(
      decideSignIn({ provider: "github", profile: { email: ALLOWED, email_verified: true } }, ALLOWED),
    ).toEqual({ allowed: false, reason: "provider" });
  });

  it("refuses when there is no profile at all", () => {
    expect(decideSignIn({ provider: "google", profile: undefined }, ALLOWED)).toEqual({
      allowed: false,
      reason: "unverified_email",
    });
  });
});
