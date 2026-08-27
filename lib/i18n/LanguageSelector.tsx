"use client";

import { useLanguage } from "./LanguageProvider";
import { localeLabels, localeFlags, type Locale } from "./translations";

const LOCALES: Locale[] = ["en", "it", "es", "ja", "fr", "de"];

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-gray-900 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#161616] dark:text-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] ${
        compact ? "h-8 px-2 py-0 text-[12px]" : "h-9 px-3 py-1.5"
      }`}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {localeFlags[l]} {localeLabels[l]}
        </option>
      ))}
    </select>
  );
}
