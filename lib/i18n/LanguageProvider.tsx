"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, type Locale, type TranslationKeys } from "./translations";

const STORAGE_KEY = "celeste-locale";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// Detect browser language
function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const lang = navigator.language?.split("-")[0]?.toLowerCase() ?? "en";
  const supported: Locale[] = ["en", "it", "es", "ja", "fr", "de"];
  return supported.includes(lang as Locale) ? (lang as Locale) : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Initialize from localStorage or browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && translations[saved]) {
        setLocaleState(saved);
      } else {
        setLocaleState(detectBrowserLocale());
      }
    } catch {
      setLocaleState(detectBrowserLocale());
    }
  }, []);

  // Listen for browser language changes
  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          setLocaleState(detectBrowserLocale());
        }
      } catch { /* ignore */ }
    };
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", handler);
    return () => mq?.removeEventListener?.("change", handler);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: keyof TranslationKeys, params?: Record<string, string>) => {
      let text = translations[locale]?.[key] ?? translations.en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        });
      }
      return text;
    },
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
