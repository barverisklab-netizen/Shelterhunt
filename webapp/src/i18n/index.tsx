import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "@/assets/locales/en.json";
import ja from "@/assets/locales/ja.json";
import { DEFAULT_LOCALE } from "@/config/i18n";

export type Locale = "en" | "ja";

type Messages = Record<string, string | Messages>;

type TranslateOptions = {
  fallback?: string;
  replacements?: Record<string, string | number>;
};

interface I18nContextValue {
  locale: Locale;
  defaultLocale: Locale;
  setLocale: (locale: Locale) => void;
  setDefaultLocale: (locale: Locale) => void;
  t: (key: string, options?: TranslateOptions) => string;
}

const translations: Record<Locale, Messages> = {
  en,
  ja,
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "shelterhunt.locale";
const STORAGE_DEFAULT_KEY = "shelterhunt.defaultLocale";

const getFromPath = (messages: Messages, key: string): string | Messages | undefined => {
  return key.split(".").reduce<Messages | string | undefined>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return acc[part] as Messages | string;
    }
    return undefined;
  }, messages);
};

const format = (value: string, replacements?: Record<string, string | number>) => {
  if (!replacements) return value;
  return value.replace(/\{(\w+)\}/g, (_, token) =>
    Object.prototype.hasOwnProperty.call(replacements, token)
      ? String(replacements[token])
      : `{${token}}`,
  );
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Env-provided default locale is authoritative for initial load.
  const [defaultLocale, setDefaultLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  }, [locale]);

  // Respect env-configured default on mount by syncing state + storage.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLocaleState(DEFAULT_LOCALE);
      setDefaultLocaleState(DEFAULT_LOCALE);
      window.localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
      window.localStorage.setItem(STORAGE_DEFAULT_KEY, DEFAULT_LOCALE);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, options?: TranslateOptions) => {
      const fallback = options?.fallback ?? key;
      const replacements = options?.replacements;

      const localized = getFromPath(translations[locale], key);
      const fallbackMessage = getFromPath(translations.en, key);

      const resolved =
        typeof localized === "string"
          ? localized
          : typeof fallbackMessage === "string"
            ? fallbackMessage
            : fallback;

      return format(resolved, replacements);
    };

    const setLocale = (next: Locale) => {
      console.log("[i18n] setLocale called", { next });
      setLocaleState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    };

    const setDefaultLocale = (next: Locale) => {
      setDefaultLocaleState(next);
      setLocale(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_DEFAULT_KEY, next);
      }
    };

    return { locale, defaultLocale, setLocale, setDefaultLocale, t };
  }, [defaultLocale, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export const localeOptions: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];
