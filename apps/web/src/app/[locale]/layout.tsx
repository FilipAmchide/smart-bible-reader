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
              <span className="font-semibold text-accent">{t("appName")}</span>
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
