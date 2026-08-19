import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { RTL_LANGUAGES, type Language } from "@sbr/shared-types";
import { locales, type AppLocale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppNav } from "@/components/AppNav";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Titre par défaut (onglet du navigateur avant hydratation, moteurs de
 * recherche, aperçus de partage). Toutes les pages sont des composants client
 * (voir plus bas) et affinent ensuite ce titre elles-mêmes via usePageTitle —
 * le `template` ici ne s'applique qu'aux éventuelles pages qui exporteraient
 * un jour leur propre `metadata.title` côté serveur.
 */
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "common" });
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}

// Séparé de generateMetadata depuis Next 14 (avertissement de dépréciation
// sinon) : couleur de la barre d'adresse mobile / de la barre de statut PWA.
export const viewport: Viewport = {
  themeColor: "#2f5c9e",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!(locales as readonly string[]).includes(locale)) notFound();

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });
  // L'arabe (RTL) est routable ; bas ne l'est pas encore (§07 du cahier des
  // charges) — cette bascule reste correcte le jour où son contenu est prêt.
  const dir = RTL_LANGUAGES.includes(locale as Language) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body className="flex min-h-screen flex-col bg-white text-ink antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="border-b border-slate-200">
            <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:max-w-2xl">
              <span className="flex items-center gap-2 font-semibold text-accent">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG statique, next/image n'apporte rien ici */}
                <img src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
                {t("appName")}
              </span>
              <LanguageSwitcher current={locale as AppLocale} />
            </div>
          </header>
          <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">{children}</main>
          <AppNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
