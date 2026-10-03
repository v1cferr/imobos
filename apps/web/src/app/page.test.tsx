import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("asks the daily question the dashboard will answer", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "O que preciso fazer hoje?" }),
    ).toBeDefined();
  });
});
