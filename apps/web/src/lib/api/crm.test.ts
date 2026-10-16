import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "./crm";

const answer = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("CRM api client", () => {
  beforeEach(() => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:8000");
    vi.stubEnv("INTERNAL_API_TOKEN", "t");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("turns the api's refusals into problems the form can show", async () => {
    vi.stubGlobal("fetch", answer(409, { detail: { code: "duplicate_phone", client_id: "abc" } }));
    expect(await createClient({ name: "A", actor: "a@example.com" })).toEqual({
      ok: false,
      problem: "duplicate_phone",
      clientId: "abc",
    });
    vi.stubGlobal("fetch", answer(422, { detail: "invalid_phone" }));
    expect(await createClient({ name: "A", actor: "a@example.com" })).toEqual({ ok: false, problem: "invalid_phone" });
  });

  it("throws on validation it does not expect, instead of showing it", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: [{ loc: ["body", "name"] }] }));
    await expect(createClient({ name: "", actor: "a@example.com" })).rejects.toThrow("422");
  });

  it("sends the internal token and returns the created client", async () => {
    const fetchMock = answer(201, { id: "c1" });
    vi.stubGlobal("fetch", fetchMock);
    const result = await createClient({ name: "A", actor: "a@example.com" });
    expect(result).toEqual({ ok: true, value: { id: "c1" } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api:8000/internal/crm/clients");
    expect((init.headers as Record<string, string>)["x-internal-token"]).toBe("t");
  });
});
