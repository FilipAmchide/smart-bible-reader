"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AdminUserSummary, Language, NotificationChannel } from "@sbr/shared-types";
import { SUPPORTED_LANGUAGES } from "@sbr/shared-types";
import { Link } from "@/i18n/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api-client";
import { localeLabels, type AppLocale } from "@/i18n/config";
import { PaginationControls } from "@/components/admin/PaginationControls";

const PAGE_SIZE = 20;
const CHANNELS: NotificationChannel[] = ["sms", "email", "web_push"];

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const tChannels = useTranslations("notifications");
  usePageTitle(t("title"));

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language | "">("");
  const [channel, setChannel] = useState<NotificationChannel | "">("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: AdminUserSummary[]; total: number } | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .adminListUsers({
          search: search || undefined,
          language: language || undefined,
          notificationChannel: channel || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
        .then(setResult)
        .catch(() => setResult({ items: [], total: 0 }));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, language, channel, page]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={t("search")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex gap-3">
          <select
            value={language}
            onChange={(e) => {
              setPage(1);
              setLanguage(e.target.value as Language | "");
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          >
            <option value="">{t("allLanguages")}</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {localeLabels[l as AppLocale]}
              </option>
            ))}
          </select>
          <select
            value={channel}
            onChange={(e) => {
              setPage(1);
              setChannel(e.target.value as NotificationChannel | "");
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          >
            <option value="">{t("allChannels")}</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {tChannels(c === "web_push" ? "webPush" : c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result === null && <p className="text-center text-slate-500">…</p>}
      {result?.items.length === 0 && <p className="text-center text-slate-500">{t("empty")}</p>}

      <ul className="space-y-3">
        {result?.items.map((user) => (
          <li key={user.id}>
            <Link
              href={`/admin/users/${user.id}`}
              className="block space-y-1 rounded-xl border border-slate-200 p-4 hover:border-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">{user.fullName}</span>
                {user.role === "admin" && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{user.email ?? user.phone}</p>
              <p className="text-xs text-slate-500">
                {t("activePlans")}: {user.activePlanCount} · {t("lastRead")}:{" "}
                {user.lastReadAt ? user.lastReadAt.slice(0, 10) : t("never")}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {result && (
        <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.total} onChange={setPage} />
      )}
    </div>
  );
}
