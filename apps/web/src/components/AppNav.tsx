"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { tokenStore } from "@/lib/api-client";

const TABS = [
  { href: "/dashboard", key: "dashboard", icon: "📊" },
  { href: "/plans", key: "plans", icon: "📖" },
  { href: "/profile", key: "profile", icon: "👤" },
] as const;

/** Barre de navigation basse, visible uniquement une fois connecté. */
export function AppNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!tokenStore.getAccess());
  }, [pathname]);

  if (!authed) return null;

  return (
    <nav className="sticky bottom-0 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-md sm:max-w-2xl">
        {TABS.map((tab) => {
          const active = pathname?.includes(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active ? "text-accent" : "text-slate-500"
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {tab.icon}
              </span>
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
