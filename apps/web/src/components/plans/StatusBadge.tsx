"use client";

import { useTranslations } from "next-intl";
import type { EffectiveEntryStatus, ReadingPlanStatus } from "@sbr/shared-types";

const PLAN_STYLES: Record<ReadingPlanStatus, string> = {
  active: "bg-accent/10 text-accent",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-slate-100 text-slate-500",
};

export function PlanStatusBadge({ status }: { status: ReadingPlanStatus }) {
  const t = useTranslations("plans.status");
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STYLES[status]}`}>{t(status)}</span>
  );
}

const ENTRY_STYLES: Record<EffectiveEntryStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  partial: "bg-amber-100 text-amber-700",
  complete: "bg-green-100 text-green-700",
  rest: "bg-slate-50 text-slate-400",
  missed: "bg-red-100 text-red-700",
};

export function EntryStatusBadge({ status }: { status: EffectiveEntryStatus }) {
  const t = useTranslations("plans.entryStatus");
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_STYLES[status]}`}>{t(status)}</span>
  );
}
