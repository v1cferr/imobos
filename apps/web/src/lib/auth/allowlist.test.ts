import { describe, expect, it } from "vitest";

import { parseAllowlist, roleFor } from "./allowlist";

const LISTS = { admins: "admin@example.com", users: "ana@example.com" };

describe("allowlist", () => {
  it("parses a comma-separated list, trimming and lowercasing", () => {
    expect([...parseAllowlist(" Ana@Example.com , bia@example.com,, ")]).toEqual([
      "ana@example.com",
      "bia@example.com",
    ]);
  });

  it("gives admins and regular users their role, regardless of case and whitespace", () => {
    expect(roleFor(" ADMIN@example.com ", LISTS)).toBe("admin");
    expect(roleFor("Ana@Example.com", LISTS)).toBe("user");
  });

  it("prefers admin when an email is on both lists", () => {
    expect(roleFor("ana@example.com", { admins: "ana@example.com", users: "ana@example.com" })).toBe(
      "admin",
    );
  });

  it("gives no role to an email on neither list", () => {
    expect(roleFor("intruso@example.com", LISTS)).toBeNull();
  });

  it("fails closed when both lists are empty or missing", () => {
    expect(roleFor("ana@example.com", { admins: "", users: "" })).toBeNull();
    expect(roleFor("ana@example.com", {})).toBeNull();
  });

  it("works with only admins configured, as in the first deploy", () => {
    expect(roleFor("admin@example.com", { admins: "admin@example.com" })).toBe("admin");
    expect(roleFor("ana@example.com", { admins: "admin@example.com" })).toBeNull();
  });

  it("rejects values that are not emails and never matches substrings", () => {
    expect(roleFor(undefined, LISTS)).toBeNull();
    expect(roleFor("", LISTS)).toBeNull();
    expect(roleFor(42, LISTS)).toBeNull();
    expect(roleFor("xana@example.com", LISTS)).toBeNull();
    expect(roleFor("ana@example.co", LISTS)).toBeNull();
  });
});
