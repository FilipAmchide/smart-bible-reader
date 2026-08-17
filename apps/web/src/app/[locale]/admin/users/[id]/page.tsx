"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type { AdminUserDetail } from "@sbr/shared-types";
import { Link } from "@/i18n/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api-client";
import { PlanStatusBadge } from "@/components/plans/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";

export default function AdminUserDetailPage() {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const tNotifications = useTranslations("notifications");
  const params = useParams<{ id: string }>();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  usePageTitle(user?.fullName ?? t("title"));

  useEffect(() => {
    api
      .adminGetUser(params.id)
      .then(setUser)
      .catch(() => setUser(null));
  }, [params.id]);

  if (!user) {
    return <p className="text-center text-slate-500">{tCommon("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-slate-500">
        ← {t("detail.backToList")}
      </Link>

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("detail.identity")}
        </h2>
        <p className="font-medium text-ink">{user.fullName}</p>
        {user.email && <p className="text-sm text-slate-600">{user.email}</p>}
        {user.phone && <p className="text-sm text-slate-600">{user.phone}</p>}
        <p className="text-sm text-slate-600">
          {user.language.toUpperCase()} · {user.timezone} · {user.role}
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("detail.settings")}
        </h2>
        <p className="text-sm text-slate-600">
          {tNotifications("sms")}: {user.notificationSettings.smsEnabled ? "✓" : "—"} ·{" "}
          {tNotifications("email")}: {user.notificationSettings.emailEnabled ? "✓" : "—"} ·{" "}
          {tNotifications("webPush")}: {user.notificationSettings.webPushEnabled ? "✓" : "—"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("detail.plans")}
        </h2>
        {user.plans.length === 0 && <p className="text-sm text-slate-500">{t("detail.noPlans")}</p>}
        <ul className="space-y-3">
          {user.plans.map((plan) => (
            <li key={plan.id} className="space-y-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">{plan.name}</span>
                <PlanStatusBadge status={plan.status} />
              </div>
              <ProgressBar percent={plan.progress.percent} />
              <p className="text-xs text-slate-500">
                {plan.progress.chaptersRead} / {plan.progress.chaptersTotal}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
