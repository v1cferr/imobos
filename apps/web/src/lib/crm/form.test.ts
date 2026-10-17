import { describe, expect, it } from "vitest";

import { clientFields, localDateTime, money, toLocalInput, tomorrowOf } from "./form";
import { formatPhone, stageLabel } from "./labels";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("CRM forms", () => {
  it("reads Brazilian money without floats", () => {
    expect(money(form({ v: "R$ 350.000" }), "v")).toBe("350000");
    expect(money(form({ v: "2.500,50" }), "v")).toBe("2500.50");
    expect(money(form({ v: "abc" }), "v")).toBeNull();
    expect(money(form({ v: "" }), "v")).toBeNull();
  });

  it("treats the date-time picker as São Paulo time, both ways", () => {
    const iso = localDateTime(form({ d: "2026-10-20T14:00" }), "d");
    expect(iso).toBe("2026-10-20T14:00:00-03:00");
    expect(toLocalInput("2026-10-20T17:00:00Z")).toBe("2026-10-20T14:00");
    expect(localDateTime(form({ d: "amanhã" }), "d")).toBeNull();
  });

  it("turns empty fields into null so the api clears them, and reads yes/no/unknown", () => {
    const fields = clientFields(form({ name: " Ana ", region: "", bedrooms: "3", pets: "no", financing: "" }));
    expect(fields.name).toBe("Ana");
    expect(fields.region).toBeNull();
    expect(fields.bedrooms).toBe(3);
    expect(fields.pets).toBe(false);
    expect(fields.financing).toBeNull();
    expect(fields.purpose).toBeNull();
  });

  it("postpones to the same time tomorrow, or 9:00 tomorrow in São Paulo", () => {
    expect(tomorrowOf("2026-10-17T17:00:00.000Z")).toBe("2026-10-18T17:00:00.000Z");
    // 23:30 on the 17th in São Paulo is already the 18th in UTC; tomorrow is still the 18th there.
    expect(tomorrowOf(null, new Date("2026-10-18T02:30:00Z"))).toBe("2026-10-18T09:00:00-03:00");
  });

  it("shows phones and stages in her words", () => {
    expect(formatPhone("+5511987654321")).toBe("(11) 98765-4321");
    expect(formatPhone(null)).toBe("");
    expect(stageLabel("won", "sales")).toBe("Venda fechada");
    expect(stageLabel("won", "rental")).toBe("Contrato assinado");
  });
});
