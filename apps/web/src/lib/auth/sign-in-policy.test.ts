import { describe, expect, it } from "vitest";

import { decideSignIn } from "./sign-in-policy";

const ALLOWED = "ana@example.com";
const LISTS = { admins: "admin@example.com", users: ALLOWED };

describe("decideSignIn", () => {
  it("lets the allowlisted Google identity in", () => {
    expect(
      decideSignIn(
        { provider: "google", profile: { email: "Ana@Example.com", email_verified: true } },
        LISTS,
      ),
    ).toEqual({ allowed: true, role: "user" });
  });

  it("lets an admin in with the admin role", () => {
    expect(
      decideSignIn(
        { provider: "google", profile: { email: "admin@example.com", email_verified: true } },
        LISTS,
      ),
    ).toEqual({ allowed: true, role: "admin" });
  });

  it("refuses any other Google account", () => {
    expect(
      decideSignIn(
        { provider: "google", profile: { email: "outra@example.com", email_verified: true } },
        LISTS,
      ),
    ).toEqual({ allowed: false, reason: "not_allowlisted" });
  });

  it("refuses an allowlisted address Google has not verified", () => {
    expect(
      decideSignIn({ provider: "google", profile: { email: ALLOWED, email_verified: false } }, LISTS),
    ).toEqual({ allowed: false, reason: "unverified_email" });
    expect(decideSignIn({ provider: "google", profile: { email: ALLOWED } }, LISTS)).toEqual({
      allowed: false,
      reason: "unverified_email",
    });
  });

  it("refuses any provider other than Google", () => {
    expect(
      decideSignIn({ provider: "github", profile: { email: ALLOWED, email_verified: true } }, LISTS),
    ).toEqual({ allowed: false, reason: "provider" });
  });

  it("refuses when there is no profile at all", () => {
    expect(decideSignIn({ provider: "google", profile: undefined }, LISTS)).toEqual({
      allowed: false,
      reason: "unverified_email",
    });
  });
});
