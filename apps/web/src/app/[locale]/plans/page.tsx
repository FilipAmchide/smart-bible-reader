"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReadingPlanSummary } from "@sbr/shared-types";
import { Link, useRouter } from "@/i18n/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, tokenStore } from "@/lib/api-client";
import { PlanStatusBadge } from "@/components/plans/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDurationCompact } from "@/lib/format-duration";

export default function PlansListPage() {
  const t = useTranslations();
  const router = useRouter();
  usePageTitle(t("plans.title"));
  const [plans, setPlans] = useState<ReadingPlanSummary[] | null>(null);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/login");
      return;
    }
    api
      .listPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{t("plans.title")}</h1>
        <Link href="/plans/new" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
          {t("plans.newPlan")}
        </Link>
      </div>

      {plans === null && <p className="text-center text-slate-500">{t("common.loading")}</p>}

      {plans?.length === 0 && (
        <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-slate-500">{t("plans.empty")}</p>
          <Link href="/plans/new" className="inline-block rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            {t("plans.newPlan")}
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {plans?.map((plan) => (
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
              <p className="text-xs text-slate-500">
                {t("plans.chaptersOf", { read: plan.progress.chaptersRead, total: plan.progress.chaptersTotal })}
                {plan.progress.readingTimeSeconds > 0 && (
                  <>
                    {" · "}
                    {t("plans.timeSpent", { duration: formatDurationCompact(plan.progress.readingTimeSeconds) })}
                  </>
                )}
                {" · "}
                {plan.startDate} → {plan.endDate}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
