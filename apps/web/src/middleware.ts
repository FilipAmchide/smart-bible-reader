import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  // Toutes les routes sauf assets Next.js, fichiers statiques et l'API (apps/api est un service séparé).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
