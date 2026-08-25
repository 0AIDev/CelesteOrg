"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write a single query-string param without losing the others.
 * Returns [value, setValue]; setValue(null) removes the param.
 */
export function useUrlParam(key: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(key);

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === null || next === "") params.delete(key);
      else params.set(key, next);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [key, pathname, router, searchParams],
  );

  return [value, setValue] as const;
}
