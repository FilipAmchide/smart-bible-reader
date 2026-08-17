"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, tokenStore } from "@/lib/api-client";

const ADMIN_TABS = [
  { href: "/admin/users", key: "users" },
  { href: "/admin/stats", key: "stats" },
  { href: "/admin/broadcast", key: "broadcast" },
  { href: "/admin/bible-versions", key: "bibleVersions" },
  { href: "/admin/audit-log", key: "auditLog" },
] as const;

/**
 * Garde de section + nav d'onglets pour toute la console admin (§2.7). Étend
 * le pattern token-guard répété sur chaque page existante (voir dashboard/
 * plans/profile) avec une vérification de rôle : aucune autre page de l'app
 * ne lit `role` côté client aujourd'hui, c'est la première.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((profile) => setStatus(profile.role === "admin" ? "allowed" : "denied"))
      .catch(() => {
        tokenStore.clear();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (status === "denied") router.replace("/dashboard");
  }, [status, router]);

  if (status !== "allowed") {
    return <p className="text-center text-slate-500">{tCommon("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 overflow-x-auto border-b border-slate-200 pb-2 text-sm font-medium">
        {ADMIN_TABS.map((tab) => {
          const active = pathname?.includes(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap pb-1 ${
                active ? "border-b-2 border-accent text-accent" : "text-slate-500"
              }`}
            >
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
