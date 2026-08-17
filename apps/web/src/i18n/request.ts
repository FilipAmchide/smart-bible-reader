import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import fr from "@sbr/locales/fr.json";
import en from "@sbr/locales/en.json";
import es from "@sbr/locales/es.json";
import de from "@sbr/locales/de.json";
import { locales, type AppLocale } from "./config";

// Imports statiques plutôt qu'un `import(`.../${locale}.json`)` dynamique :
// avec un alias tsconfig (pas un vrai module node_modules), le "context"
// d'import dynamique de webpack ne le résout pas de façon fiable côté
// Next.js/serveur ("Cannot find module './fr.json'"). Un import par langue
// est trivial à étendre le jour où ar/bas rejoignent `locales`.
const messagesByLocale: Record<AppLocale, typeof fr> = { fr, en, es, de };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (locales as readonly string[]).includes(requested ?? "")
    ? (requested as AppLocale)
    : undefined;

  if (!locale) notFound();

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
