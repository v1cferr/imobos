import { describe, expect, it } from "vitest";

import { greeting } from "./greeting";

// Instants in UTC; São Paulo is UTC-3.
describe("greeting", () => {
  it("follows the broker's clock in São Paulo", () => {
    expect(greeting(new Date("2026-10-03T11:00:00Z"))).toBe("Bom dia"); // 08:00
    expect(greeting(new Date("2026-10-03T17:00:00Z"))).toBe("Boa tarde"); // 14:00
    expect(greeting(new Date("2026-10-03T23:30:00Z"))).toBe("Boa noite"); // 20:30
    expect(greeting(new Date("2026-10-04T06:00:00Z"))).toBe("Boa noite"); // 03:00
  });
});
