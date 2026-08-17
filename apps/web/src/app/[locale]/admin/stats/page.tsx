"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlatformStats } from "@sbr/shared-types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api-client";
import { ProgressBar } from "@/components/ProgressBar";

export default function AdminStatsPage() {
  const t = useTranslations("admin.stats");
  const tCommon = useTranslations("common");
  const tScope = useTranslations("plans.create.scopeOptions");
  usePageTitle(t("title"));

  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api
      .adminGetStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <p className="text-center text-slate-500">{tCommon("loading")}</p>;
  }

  const scopeEntries = Object.entries(stats.plansByScope) as Array<[string, number]>;
  const maxScopeCount = Math.max(1, ...scopeEntries.map(([, count]) => count));
  const notificationEntries = Object.entries(stats.notificationsByChannel) as Array<
    [string, { sent: number; failed: number }]
  >;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{t("totalUsers")}</p>
          <p className="text-2xl font-semibold text-ink">{stats.totalUsers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{t("activeUsers")}</p>
          <p className="text-2xl font-semibold text-ink">{stats.activeUsers30d}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{t("totalPlans")}</p>
          <p className="text-2xl font-semibold text-ink">{stats.totalPlans}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{t("avgCompletion")}</p>
          <p className="text-2xl font-semibold text-ink">{stats.averageCompletionPercent}%</p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("plansByScope")}
        </h2>
        <div className="space-y-2">
          {scopeEntries.map(([scope, count]) => (
            <div key={scope} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{tScope(scope)}</span>
                <span>{count}</span>
              </div>
              <ProgressBar percent={(count / maxScopeCount) * 100} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("notifications")}
        </h2>
        <ul className="space-y-1 text-sm text-slate-600">
          {notificationEntries.map(([channel, counts]) => (
            <li key={channel}>
              {channel} — {t("sent")}: {counts.sent} · {t("failed")}: {counts.failed}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
