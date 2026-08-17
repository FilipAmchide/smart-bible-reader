"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { BibleVersion, UserProfile } from "@sbr/shared-types";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError, tokenStore } from "@/lib/api-client";
import { locales, localeLabels, type AppLocale } from "@/i18n/config";
import { TwoFactorPanel } from "@/components/profile/TwoFactorPanel";
import { NotificationSettingsPanel } from "@/components/profile/NotificationSettingsPanel";

export default function ProfilePage() {
  const t = useTranslations();
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState<AppLocale>("fr");
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [preferredVersionCode, setPreferredVersionCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((profile) => {
        setUser(profile);
        setFullName(profile.fullName);
        setPreferredVersionCode(profile.preferredVersionCode ?? "");
        if ((locales as readonly string[]).includes(profile.language)) {
          setLanguage(profile.language as AppLocale);
        }
      })
      .catch(() => {
        tokenStore.clear();
        router.replace("/login");
      });
    api.listBibleVersions().then(setVersions).catch(() => setVersions([]));
  }, [router]);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await api.updateProfile({
        fullName,
        language,
        preferredVersionCode: preferredVersionCode || undefined,
      });
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    tokenStore.clear();
    router.push("/login");
  }

  if (!user) {
    return <p className="text-center text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{t("profile.title")}</h1>
        <button onClick={onLogout} className="text-sm text-slate-500">
          {t("nav.logout")}
        </button>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("profile.identity")}
        </h2>
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("profile.fullName")}</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        {user.email && (
          <p className="text-sm text-slate-600">
            {t("profile.email")}: <span className="text-ink">{user.email}</span>
          </p>
        )}
        {user.phone && (
          <p className="text-sm text-slate-600">
            {t("profile.phone")}: <span className="text-ink">{user.phone}</span>
          </p>
        )}
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("profile.language")}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppLocale)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeLabels[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-start">
          <span className="mb-1 block text-sm font-medium text-ink">{t("profile.preferredVersion")}</span>
          <select
            value={preferredVersionCode}
            onChange={(e) => setPreferredVersionCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-ink"
          >
            <option value="">—</option>
            {versions.map((v) => (
              <option key={v.code} value={v.code}>
                {v.name} ({v.language})
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-600">
          {t("profile.timezone")}: <span className="text-ink">{user.timezone}</span>
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">{t("profile.saved")}</p>}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("profile.saveChanges")}
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("profile.security")}
        </h2>
        <TwoFactorPanel user={user} onChange={setUser} />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("notifications.title")}
        </h2>
        <NotificationSettingsPanel
          settings={user.notificationSettings}
          onChange={(notificationSettings) => setUser({ ...user, notificationSettings })}
        />
      </section>
    </div>
  );
}
