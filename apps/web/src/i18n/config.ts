/**
 * Langues routables en phase 1. `ar` et `bas` sont modélisées côté
 * @sbr/shared-types (RTL, filière de traduction dédiée) mais n'ont pas encore
 * de fichier de messages — les ajouter ici quand leur contenu est prêt,
 * chacune avec son propre fichier dans packages/locales/src.
 */
export const locales = ["fr", "en", "es", "de"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fr";

export const localeLabels: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
};
