"use client";

import { useRef, type ReactNode } from "react";

/**
 * Custom file-upload control. The native <input type="file"> stays in the DOM
 * (the OS file dialog is unavoidable) but is hidden and driven by a styled
 * trigger — no native browser chrome is ever visible.
 */
export function FileUpload({
  onFile,
  accept,
  children,
  disabled,
}: {
  onFile: (f: File) => void;
  accept?: string;
  children: (open: () => void) => ReactNode;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      {children(() => {
        if (!disabled) ref.current?.click();
      })}
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
