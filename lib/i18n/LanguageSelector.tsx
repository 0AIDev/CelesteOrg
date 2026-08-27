"use client";

import { useState, useRef, useEffect } from "react";
import { CircleFlag } from "react-circle-flags";
import { useLanguage } from "./LanguageProvider";
import { localeLabels, type Locale } from "./translations";

const LOCALES: { code: Locale; country: string }[] = [
  { code: "en", country: "us" },
  { code: "it", country: "it" },
  { code: "es", country: "es" },
  { code: "ja", country: "jp" },
  { code: "fr", country: "fr" },
  { code: "de", country: "de" },
];

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#161616] dark:text-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] ${
          compact ? "h-8 px-2" : "h-9 px-3"
        }`}
      >
        <CircleFlag countryCode={current.country} className="h-4 w-4" />
        {!compact && <span className="hidden sm:inline">{localeLabels[locale]}</span>}
        <svg
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a1a]">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.06)] ${
                locale === l.code
                  ? "bg-gray-100 font-medium text-gray-900 dark:bg-[rgba(255,255,255,0.08)] dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <CircleFlag countryCode={l.country} className="h-5 w-5 shrink-0" />
              <span>{localeLabels[l.code]}</span>
              {locale === l.code && (
                <svg
                  className="ml-auto h-4 w-4 shrink-0 text-gray-900 dark:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
