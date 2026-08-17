"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { ReadingScopeType } from "@sbr/shared-types";
import { READING_SCOPE_TYPES } from "@sbr/shared-types";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError, type BibleBookView } from "@/lib/api-client";

export default function NewPlanPage() {
  const t = useTranslations();
  const router = useRouter();

  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<ReadingScopeType>("new_testament");
  const [books, setBooks] = useState<BibleBookView[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listBibleBooks("fr").then(setBooks).catch(() => setBooks([]));
  }, []);

  function toggleBook(code: string) {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (scopeType === "custom" && selectedCodes.length === 0) {
      setError(t("plans.create.pickBooks"));
      return;
    }
    setLoading(true);
    try {
      const plan = await api.createPlan({
        name: name || undefined,
        scopeType,
        bookCodes: scopeType === "custom" ? selectedCodes : undefined,
        startDate,
        endDate,
      });
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("plans.create.title")}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("plans.create.name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("plans.create.namePlaceholder")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("plans.create.scope")}</span>
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as ReadingScopeType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
          >
            {READING_SCOPE_TYPES.map((s) => (
              <option key={s} value={s}>
                {t(`plans.create.scopeOptions.${s}`)}
              </option>
            ))}
          </select>
        </label>

        {scopeType === "custom" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">
              {t("plans.create.pickBooks")}
              {" — "}
              {t("plans.create.booksSelected", { count: selectedCodes.length })}
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {books.map((book) => {
                const position = selectedCodes.indexOf(book.code);
                return (
                  <label
                    key={book.code}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={position !== -1}
                        onChange={() => toggleBook(book.code)}
                        className="h-4 w-4 accent-accent"
                      />
                      {book.name}
                    </span>
                    {position !== -1 && (
                      <span className="text-xs font-medium text-accent">{position + 1}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-ink">{t("plans.create.startDate")}</span>
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-ink">{t("plans.create.endDate")}</span>
            <input
              required
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("plans.create.submit")}
        </button>
      </form>
    </div>
  );
}
