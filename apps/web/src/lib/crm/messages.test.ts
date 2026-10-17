import { describe, expect, it } from "vitest";

import { fillTemplate, whatsappUrl } from "./messages";

describe("ready-made messages", () => {
  it("fills the client, the development and the broker", () => {
    const text = fillTemplate("Oi, {nome}! Aqui é a {corretora}. Sobre o {empreendimento}: {proxima_acao}", {
      client: { name: " Ana Paula Souza " },
      deal: { property: "Caminhos da Lapa", next_action: "Enviar tabela" },
      broker: "Maria Hickmann",
    });
    expect(text).toBe("Oi, Ana! Aqui é a Maria. Sobre o Caminhos da Lapa: Enviar tabela");
  });

  it("says imóvel when the deal names no development", () => {
    expect(fillTemplate("o {empreendimento}", { client: { name: "Ana" }, deal: null, broker: null })).toBe("o imóvel");
  });

  it("builds a click-to-chat link with the text encoded", () => {
    expect(whatsappUrl("+5511987654321", "Oi, Ana! Tudo bem?")).toBe(
      "https://wa.me/5511987654321?text=Oi%2C%20Ana!%20Tudo%20bem%3F",
    );
  });
});
