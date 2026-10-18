import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("installs as its own app that opens on Hoje, with Android icons including a maskable one", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/today");
    expect(m.icons?.map((i) => i.sizes)).toContain("512x512");
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });
});
