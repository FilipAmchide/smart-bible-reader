"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DashboardSummary } from "@sbr/shared-types";
import { Link, useRouter } from "@/i18n/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, tokenStore } from "@/lib/api-client";
import { PlanStatusBadge } from "@/components/plans/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDurationCompact } from "@/lib/format-duration";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  usePageTitle(t("dashboard.title"));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/login");
      return;
    }
    api.getDashboard().then(setSummary).catch(() => setSummary(null));
  }, [router]);

  if (!summary) {
    return <p className="text-center text-slate-500">{t("common.loading")}</p>;
  }

  const maxActivity = Math.max(1, ...summary.activity.map((p) => p.chaptersRead));
  const testamentTotal = summary.testamentSplit.oldTestament + summary.testamentSplit.newTestament || 1;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-ink">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={`${t("dashboard.streakCurrent")} (${t("dashboard.days")})`} value={summary.streak.current} />
        <StatCard label={`${t("dashboard.streakRecord")} (${t("dashboard.days")})`} value={summary.streak.record} />
        <StatCard label={t("dashboard.totalChaptersRead")} value={summary.totalChaptersRead} />
        <StatCard label={t("dashboard.daysComplete")} value={summary.daysComplete} />
        <StatCard
          label={t("dashboard.totalReadingTime")}
          value={summary.totalReadingTimeSeconds > 0 ? formatDurationCompact(summary.totalReadingTimeSeconds) : "—"}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.activity")}</h2>
        <div className="flex h-24 items-end gap-[2px] rounded-xl border border-slate-200 p-3">
          {summary.activity.map((point) => (
            <div
              key={point.date}
              title={`${point.date} : ${point.chaptersRead}`}
              className="flex-1 rounded-sm bg-accent/70"
              style={{ height: `${Math.max(4, (point.chaptersRead / maxActivity) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{summary.activity[0]?.date}</span>
          <span>{summary.activity[summary.activity.length - 1]?.date}</span>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("dashboard.testamentSplit")}
        </h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-accent"
            style={{ width: `${(summary.testamentSplit.oldTestament / testamentTotal) * 100}%` }}
          />
          <div
            className="h-full bg-gold"
            style={{ width: `${(summary.testamentSplit.newTestament / testamentTotal) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {t("bible.oldTestament")}: {summary.testamentSplit.oldTestament} · {t("bible.newTestament")}:{" "}
          {summary.testamentSplit.newTestament}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.activePlans")}
          </h2>
          <Link href="/plans/new" className="text-sm text-accent">
            + {t("plans.newPlan")}
          </Link>
        </div>
        {summary.activePlans.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-slate-500">{t("dashboard.noPlans")}</p>
            <Link href="/plans/new" className="inline-block rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
              {t("dashboard.createFirstPlan")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {summary.activePlans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/plans/${plan.id}`}
                  className="block space-y-2 rounded-xl border border-slate-200 p-4 hover:border-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{plan.name}</span>
                    <PlanStatusBadge status={plan.status} />
                  </div>
                  <ProgressBar percent={plan.progress.percent} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary.pastPlans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.pastPlans")}
          </h2>
          <ul className="space-y-2">
            {summary.pastPlans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/plans/${plan.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="text-ink">{plan.name}</span>
                  <PlanStatusBadge status={plan.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
