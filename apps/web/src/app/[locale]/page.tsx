"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { tokenStore } from "@/lib/api-client";

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();

  useEffect(() => {
    if (tokenStore.getAccess()) router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink">{t("common.appName")}</h1>
        <p className="text-slate-600">{t("common.tagline")}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-accent px-4 py-2.5 text-center font-medium text-white"
        >
          {t("auth.register.title")}
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-center font-medium text-ink"
        >
          {t("auth.login.title")}
        </Link>
      </div>
    </div>
  );
}
