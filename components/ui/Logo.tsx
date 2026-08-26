"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Light mode logo */}
      <img
        src="/Vector (2).svg"
        alt="Celeste"
        className={`${className} ${theme === "dark" ? "hidden" : "block"}`}
      />
      {/* Dark mode logo */}
      <img
        src="/Vector (3).svg"
        alt="Celeste"
        className={`${className} ${theme === "dark" ? "block" : "hidden"}`}
      />
    </>
  );
}
