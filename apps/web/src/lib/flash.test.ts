import { describe, expect, it } from "vitest";

import { flashFor, withFlash } from "./flash";

describe("flash", () => {
  it("appends the key to a path, with or without a query", () => {
    expect(withFlash("/integrations", "checked")).toBe("/integrations?toast=checked");
    expect(withFlash("/x?a=1", "checked")).toBe("/x?a=1&toast=checked");
  });

  it("never renders an unknown key, only a generic error", () => {
    const flash = flashFor("<b>injected</b>");
    expect(flash.type).toBe("error");
    expect(JSON.stringify(flash)).not.toContain("injected");
  });
});
