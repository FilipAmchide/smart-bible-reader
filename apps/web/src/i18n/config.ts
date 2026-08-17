/**
 * Langues routables. `bas` est modélisée côté @sbr/shared-types (filière de
 * traduction humaine dédiée, §07 du cahier des charges) mais n'a pas encore
 * de fichier de messages — à ajouter ici quand son contenu est prêt, avec son
 * propre fichier dans packages/locales/src.
 */
export const locales = ["fr", "en", "es", "de", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fr";

export const localeLabels: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
};
