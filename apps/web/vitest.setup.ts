import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without vitest globals, Testing Library cannot register its own cleanup.
afterEach(() => cleanup());

// jsdom has no matchMedia; shadcn's sidebar (useIsMobile) and next-themes read it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
