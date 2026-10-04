import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock, addMock, params } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  addMock: vi.fn(),
  params: { current: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => params.current,
  usePathname: () => "/integrations",
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { add: addMock } }));

import { FlashToast } from "./flash-toast";

describe("FlashToast", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    addMock.mockReset();
  });

  it("shows the toast for the key once and removes it from the URL, keeping other params", () => {
    params.current = new URLSearchParams("tab=a&toast=disconnected");
    const { rerender } = render(<FlashToast />);
    rerender(<FlashToast />);
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ type: "info", title: "Desconectado" }));
    expect(replaceMock).toHaveBeenCalledWith("/integrations?tab=a", { scroll: false });
  });

  it("does nothing without a key", () => {
    params.current = new URLSearchParams();
    render(<FlashToast />);
    expect(addMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
