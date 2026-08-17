"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReadingPlanDetail } from "@sbr/shared-types";
import { Link, useRouter } from "@/i18n/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, tokenStore } from "@/lib/api-client";
import { EntryStatusBadge, PlanStatusBadge } from "@/components/plans/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ReadingDurationInput } from "@/components/plans/ReadingDurationInput";
import { formatDurationCompact } from "@/lib/format-duration";

export default function PlanDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const [plan, setPlan] = useState<ReadingPlanDetail | null>(null);
  usePageTitle(plan?.name ?? t("plans.title"));
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [pendingChapter, setPendingChapter] = useState<string | null>(null);
  const [savingDuration, setSavingDuration] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/login");
      return;
    }
    api
      .getPlan(planId)
      .then(setPlan)
      .catch((err) => setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError")));
  }, [planId, router, t]);

  async function onMarkRead(date: string, bookCode: string, chapter: number) {
    const key = `${date}:${bookCode}:${chapter}`;
    setPendingChapter(key);
    try {
      const updated = await api.markRead(planId, date, [{ bookCode, chapter }]);
      setPlan(updated);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setPendingChapter(null);
    }
  }

  async function onSaveDuration(date: string, seconds: number) {
    setSavingDuration(true);
    try {
      const updated = await api.markRead(planId, date, undefined, seconds);
      setPlan(updated);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setSavingDuration(false);
    }
  }

  async function onRecalculate() {
    setRecalculating(true);
    setError(null);
    try {
      const updated = await api.recalculatePlan(planId);
      setPlan(updated);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setRecalculating(false);
    }
  }

  async function onExport(format: "pdf" | "xlsx") {
    if (!plan) return;
    setExporting(format);
    setError(null);
    try {
      const filename = `${plan.name || "plan"}.${format}`;
      if (format === "pdf") await api.exportPlanPdf(planId, filename);
      else await api.exportPlanXlsx(planId, filename);
    } catch {
      setError(t("errors.genericError"));
    } finally {
      setExporting(null);
    }
  }

  if (!plan) {
    return <p className="text-center text-slate-500">{error ?? t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/plans" className="text-sm text-accent">
        ← {t("plans.backToList")}
      </Link>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-ink">{plan.name}</h1>
          <PlanStatusBadge status={plan.status} />
        </div>
        <ProgressBar percent={plan.progress.percent} />
        <p className="text-sm text-slate-600">
          {t("plans.chaptersOf", { read: plan.progress.chaptersRead, total: plan.progress.chaptersTotal })}
          {" · "}
          {t("plans.progress", { percent: plan.progress.percent })}
          {plan.progress.readingTimeSeconds > 0 && (
            <>
              {" · "}
              {t("plans.timeSpent", { duration: formatDurationCompact(plan.progress.readingTimeSeconds) })}
            </>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onExport("pdf")}
          disabled={exporting !== null}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-ink disabled:opacity-50"
        >
          {exporting === "pdf" ? t("plans.export.downloading") : t("plans.export.pdf")}
        </button>
        <button
          onClick={() => onExport("xlsx")}
          disabled={exporting !== null}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-ink disabled:opacity-50"
        >
          {exporting === "xlsx" ? t("plans.export.downloading") : t("plans.export.xlsx")}
        </button>
      </div>

      <button
        onClick={onRecalculate}
        disabled={recalculating}
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
      >
        {recalculating ? t("plans.recalculating") : t("plans.recalculate")}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {plan.schedule.map((entry) => {
          const isToday = entry.date === todayStr;
          return (
            <li key={entry.date}>
              <details open={isToday || entry.status === "missed" || entry.status === "partial"}>
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {entry.date}
                    {isToday && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                        {t("plans.today")}
                      </span>
                    )}
                    {entry.readingDurationSeconds > 0 && (
                      <span className="text-xs text-slate-400">
                        ⏱ {formatDurationCompact(entry.readingDurationSeconds)}
                      </span>
                    )}
                  </span>
                  <EntryStatusBadge status={entry.status} />
                </summary>
                {entry.chapters.length === 0 ? (
                  <p className="px-4 pb-3 text-sm text-slate-400">{t("plans.entryStatus.rest")}</p>
                ) : (
                  <div className="space-y-3 px-4 pb-3">
                    <ul className="space-y-1">
                      {entry.chapters.map((ch) => {
                        const key = `${entry.date}:${ch.bookCode}:${ch.chapter}`;
                        return (
                          <li key={key} className="flex items-center justify-between gap-2 py-1 text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={ch.read}
                                disabled={ch.read || pendingChapter === key}
                                onChange={() => onMarkRead(entry.date, ch.bookCode, ch.chapter)}
                                className="h-4 w-4 accent-accent"
                              />
                              <span className={ch.read ? "text-slate-400 line-through" : "text-ink"}>
                                {ch.bookCode} {ch.chapter}
                              </span>
                            </label>
                            {ch.readingUrl && (
                              <a
                                href={ch.readingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-accent"
                              >
                                {t("plans.readOnline")}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {isToday && (
                      <ReadingDurationInput
                        saving={savingDuration}
                        onSave={(seconds) => onSaveDuration(entry.date, seconds)}
                      />
                    )}
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
