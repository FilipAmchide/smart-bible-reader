"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { NotificationSettings } from "@sbr/shared-types";
import { api, ApiError } from "@/lib/api-client";
import { disablePush, enablePush, isPushEnabled, isPushSupported } from "@/lib/web-push";

export function NotificationSettingsPanel({
  settings,
  onChange,
}: {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    isPushEnabled().then(setPushEnabled);
  }, []);

  function set<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await api.updateNotificationSettings(draft);
      onChange(updated.notificationSettings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? t(`errors.${err.message}`) : t("errors.genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePush() {
    setPushBusy(true);
    setError(null);
    try {
      if (pushEnabled) {
        await disablePush();
        setPushEnabled(false);
        set("webPushEnabled", false);
      } else {
        await enablePush();
        setPushEnabled(true);
        set("webPushEnabled", true);
      }
    } catch {
      setError(t("errors.genericError"));
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">{t("notifications.channels")}</p>
        <label className="flex items-center justify-between text-sm">
          {t("notifications.sms")}
          <input
            type="checkbox"
            checked={draft.smsEnabled}
            onChange={(e) => set("smsEnabled", e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          {t("notifications.email")}
          <input
            type="checkbox"
            checked={draft.emailEnabled}
            onChange={(e) => set("emailEnabled", e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>{t("notifications.webPush")}</span>
          {isPushSupported() ? (
            <button
              type="button"
              onClick={onTogglePush}
              disabled={pushBusy}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
            >
              {pushEnabled ? t("notifications.disablePush") : t("notifications.enablePush")}
            </button>
          ) : (
            <span className="text-xs text-slate-400">{t("notifications.pushUnsupported")}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-start">
          <span className="mb-1 block text-xs font-medium text-ink">{t("notifications.dailyReminderTime")}</span>
          <input
            type="time"
            value={draft.dailyReminderTime}
            onChange={(e) => set("dailyReminderTime", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block text-start">
          <span className="mb-1 block text-xs font-medium text-ink">{t("notifications.lateAlertTime")}</span>
          <input
            type="time"
            value={draft.lateAlertTime}
            onChange={(e) => set("lateAlertTime", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-ink">{t("notifications.quietHours")}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t("notifications.quietHoursFrom")}</span>
          <input
            type="time"
            value={draft.quietHoursStart}
            onChange={(e) => set("quietHoursStart", e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          />
          <span className="text-xs text-slate-500">{t("notifications.quietHoursTo")}</span>
          <input
            type="time"
            value={draft.quietHoursEnd}
            onChange={(e) => set("quietHoursEnd", e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>

      <label className="flex items-center justify-between text-sm">
        {t("notifications.weeklySummary")}
        <input
          type="checkbox"
          checked={draft.weeklySummary}
          onChange={(e) => set("weeklySummary", e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">{t("notifications.saved")}</p>}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {saving ? t("common.loading") : t("notifications.save")}
      </button>
    </div>
  );
}
