"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";
import { flashFor } from "@/lib/flash";

/** Shows the ?toast=<key> left by a redirect, once, then removes it from the URL. */
export function FlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shown = useRef<string | null>(null);
  const key = params.get("toast");

  useEffect(() => {
    if (!key || shown.current === key) return;
    shown.current = key; // React's development double-run must not show it twice
    const { type, title, description } = flashFor(key);
    toast.add({ type, title, description });
    const rest = new URLSearchParams(params);
    rest.delete("toast");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [key, params, pathname, router]);

  return null;
}
