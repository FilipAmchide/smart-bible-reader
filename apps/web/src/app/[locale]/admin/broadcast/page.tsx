"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { Language } from "@sbr/shared-types";
import { SUPPORTED_LANGUAGES } from "@sbr/shared-types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError } from "@/lib/api-client";
import { localeLabels, type AppLocale } from "@/i18n/config";

export default function AdminBroadcastPage() {
  const t = useTranslations("admin.broadcast");
  const tErrors = useTranslations("errors");
  usePageTitle(t("title"));

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState<Language | "">("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const { recipientCount } = await api.adminSendBroadcast({
        subject,
        body,
        language: language || undefined,
      });
      setResult(recipientCount);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? tErrors(err.message) : tErrors("genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 p-4">
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("subject")}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("body")}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("language")}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language | "")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
          >
            <option value="">{t("allLanguages")}</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {localeLabels[l as AppLocale]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result !== null && <p className="text-sm text-green-700">{t("sent", { count: result })}</p>}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {sending ? t("sending") : t("submit")}
        </button>
      </form>
    </div>
  );
}
