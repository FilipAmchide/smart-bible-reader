"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { BibleVersionAdmin, Language } from "@sbr/shared-types";
import { SUPPORTED_LANGUAGES } from "@sbr/shared-types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError } from "@/lib/api-client";
import { localeLabels, type AppLocale } from "@/i18n/config";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

interface VersionForm {
  code: string;
  language: Language;
  name: string;
  provider: string;
  linkTemplate: string;
}

const EMPTY_FORM: VersionForm = { code: "", language: "fr", name: "", provider: "", linkTemplate: "" };

export default function AdminBibleVersionsPage() {
  const t = useTranslations("admin.bibleVersions");
  const tErrors = useTranslations("errors");
  usePageTitle(t("title"));

  const [versions, setVersions] = useState<BibleVersionAdmin[] | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<VersionForm>(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<VersionForm, "code" | "language">>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    api
      .adminListBibleVersions()
      .then(setVersions)
      .catch(() => setVersions([]));
  }

  useEffect(reload, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateBibleVersion(addForm);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? tErrors(err.message) : tErrors("genericError"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(version: BibleVersionAdmin) {
    setEditingCode(version.code);
    setEditForm({ name: version.name, provider: version.provider, linkTemplate: version.linkTemplate });
  }

  async function onSaveEdit(code: string) {
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateBibleVersion(code, editForm);
      setEditingCode(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? tErrors(err.message) : tErrors("genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(version: BibleVersionAdmin) {
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateBibleVersion(version.code, { active: !version.active });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? tErrors(err.message) : tErrors("genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          {t("add")}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showAddForm && (
        <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <label className="block text-start">
            <span className="mb-1 block text-xs font-medium text-ink">{t("code")}</span>
            <input
              value={addForm.code}
              onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-xs font-medium text-ink">{t("language")}</span>
            <select
              value={addForm.language}
              onChange={(e) => setAddForm({ ...addForm, language: e.target.value as Language })}
              className={INPUT_CLASS}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {localeLabels[l as AppLocale]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-xs font-medium text-ink">{t("name")}</span>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-xs font-medium text-ink">{t("provider")}</span>
            <input
              value={addForm.provider}
              onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-xs font-medium text-ink">{t("linkTemplate")}</span>
            <input
              value={addForm.linkTemplate}
              onChange={(e) => setAddForm({ ...addForm, linkTemplate: e.target.value })}
              required
              placeholder="https://.../{bookCode}.{chapter}"
              className={INPUT_CLASS}
            />
            <span className="mt-1 block text-xs text-slate-500">{t("linkTemplateHint")}</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {t("add")}
          </button>
        </form>
      )}

      {versions === null && <p className="text-center text-slate-500">…</p>}
      {versions?.length === 0 && <p className="text-center text-slate-500">{t("empty")}</p>}

      <ul className="space-y-3">
        {versions?.map((version) => (
          <li key={version.code} className="space-y-2 rounded-xl border border-slate-200 p-4">
            {editingCode === version.code ? (
              <div className="space-y-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={INPUT_CLASS}
                />
                <input
                  value={editForm.provider}
                  onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                  className={INPUT_CLASS}
                />
                <input
                  value={editForm.linkTemplate}
                  onChange={(e) => setEditForm({ ...editForm, linkTemplate: e.target.value })}
                  className={INPUT_CLASS}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onSaveEdit(version.code)}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
                  >
                    {t("saved")}
                  </button>
                  <button
                    onClick={() => setEditingCode(null)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">
                    {version.name} <span className="text-xs text-slate-400">({version.code})</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      version.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {version.active ? t("active") : t("inactive")}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {localeLabels[version.language as AppLocale]} · {version.provider}
                </p>
                <p className="truncate text-xs text-slate-400">{version.linkTemplate}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(version)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => toggleActive(version)}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
                  >
                    {version.active ? t("disable") : t("enable")}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
