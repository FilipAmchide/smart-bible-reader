"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, type AppLocale } from "@/i18n/config";

/**
 * Change la langue en remplaçant le segment de locale dans l'URL courante,
 * pour rester sur le même écran (ex. /fr/profile -> /en/profile).
 */
export function LanguageSwitcher({ current }: { current: AppLocale }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(locale: AppLocale) {
    const segments = pathname.split("/");
    segments[1] = locale;
    router.push(segments.join("/"));
  }

  return (
    <select
      aria-label="Langue"
      value={current}
      onChange={(e) => switchTo(e.target.value as AppLocale)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-ink"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeLabels[locale]}
        </option>
      ))}
    </select>
  );
}
