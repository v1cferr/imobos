import { afterEach, describe, expect, it, vi } from "vitest";

import { identityHash, logAuthEvent } from "./events";

describe("auth events", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pseudonymizes an email into a short, stable, case-insensitive hash", () => {
    const hash = identityHash("Ana@Example.com");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(identityHash(" ana@example.com ")).toBe(hash);
    expect(identityHash("bia@example.com")).not.toBe(hash);
    expect(identityHash(undefined)).toBeUndefined();
  });

  it("writes one JSON line with the event and never the raw email", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logAuthEvent("auth.login.success", { id: identityHash("ana@example.com"), skipped: undefined });
    expect(log).toHaveBeenCalledOnce();
    const line = String(log.mock.calls[0]?.[0]);
    const parsed = JSON.parse(line) as Record<string, string>;
    expect(parsed.event).toBe("auth.login.success");
    expect(parsed).not.toHaveProperty("skipped");
    expect(line).not.toContain("ana@example.com");
  });
});
