import { describe, expect, it } from "vitest";

import { isAllowedEmail, parseAllowlist } from "./allowlist";

describe("allowlist", () => {
  it("parses a comma-separated list, trimming and lowercasing", () => {
    expect([...parseAllowlist(" Ana@Example.com , bia@example.com,, ")]).toEqual([
      "ana@example.com",
      "bia@example.com",
    ]);
  });

  it("accepts a listed email regardless of case and whitespace", () => {
    expect(isAllowedEmail(" ANA@example.com ", "ana@example.com")).toBe(true);
  });

  it("rejects an email that is not listed", () => {
    expect(isAllowedEmail("intruso@example.com", "ana@example.com")).toBe(false);
  });

  it("fails closed when the list is empty or missing", () => {
    expect(isAllowedEmail("ana@example.com", "")).toBe(false);
    expect(isAllowedEmail("ana@example.com", undefined)).toBe(false);
  });

  it("rejects values that are not emails", () => {
    expect(isAllowedEmail(undefined, "ana@example.com")).toBe(false);
    expect(isAllowedEmail("", "ana@example.com")).toBe(false);
    expect(isAllowedEmail(42, "ana@example.com")).toBe(false);
  });

  it("does not match on substrings", () => {
    expect(isAllowedEmail("ana@example.co", "ana@example.com")).toBe(false);
    expect(isAllowedEmail("xana@example.com", "ana@example.com")).toBe(false);
  });
});
