import type { Locale } from "@/i18n";

const envLocale = (import.meta as unknown as { env?: Record<string, unknown> }).env
  ?.VITE_DEFAULT_LOCALE;

const normalizeLocale = (value: unknown): Locale | null => {
  if (value === "en" || value === "ja") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("ja")) return "ja";
  }
  return null;
};

export const DEFAULT_LOCALE: Locale = normalizeLocale(envLocale) ?? "en";
