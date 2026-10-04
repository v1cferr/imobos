import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { authorizeUrl, cookieName, newFlow, packFlow, sameState, SCOPES, unpackFlow } from "./google-oauth";

describe("google oauth helpers", () => {
  it("derives the S256 challenge from a fresh random verifier", () => {
    const a = newFlow();
    const b = newFlow();
    expect(a.state).not.toBe(b.state);
    expect(a.verifier.length).toBeGreaterThanOrEqual(43);
    expect(a.challenge).toBe(createHash("sha256").update(a.verifier).digest("base64url"));
  });

  it("asks Google for offline, read-only calendar access with PKCE and state", () => {
    const url = new URL(
      authorizeUrl({ clientId: "cid", redirectUri: "https://x/cb", state: "st", challenge: "ch" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = url.searchParams;
    expect(p.get("scope")).toBe(SCOPES.join(" "));
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("access_type")).toBe("offline");
    expect(p.get("state")).toBe("st");
    expect(p.get("scope")).not.toContain("calendar ");
  });

  it("round-trips the flow cookie and rejects anything malformed", () => {
    expect(unpackFlow(packFlow("s", "v"))).toEqual({ state: "s", verifier: "v" });
    expect(unpackFlow(undefined)).toBeNull();
    expect(unpackFlow("only")).toBeNull();
    expect(unpackFlow("a.b.c")).toBeNull();
  });

  it("compares state in constant time and refuses mismatches", () => {
    expect(sameState("abc", "abc")).toBe(true);
    expect(sameState("abc", "abd")).toBe(false);
    expect(sameState("abc", "ab")).toBe(false);
    expect(sameState("abc", null)).toBe(false);
  });

  it("uses the __Host- prefix only over HTTPS", () => {
    expect(cookieName(true)).toMatch(/^__Host-/);
    expect(cookieName(false)).not.toMatch(/^__Host-/);
  });
});
