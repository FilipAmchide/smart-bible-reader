"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Saisie manuelle, pas un chronomètre : l'utilisateur indique combien de
 * temps ça lui a pris, après coup — il peut très bien commencer à lire,
 * s'interrompre, revenir plus tard. Aucune tentative de mesurer ça
 * automatiquement (voir la note sur ScheduleEntryView côté API).
 */
export function ReadingDurationInput({
  onSave,
  saving,
}: {
  onSave: (seconds: number) => Promise<void>;
  saving: boolean;
}) {
  const t = useTranslations("plans.duration");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saved, setSaved] = useState(false);

  const totalSeconds = (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60;

  async function handleSave() {
    if (totalSeconds === 0) return;
    await onSave(totalSeconds);
    setHours("");
    setMinutes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-medium text-slate-500">{t("label")}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        placeholder="0"
        className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-sm text-ink"
      />
      <span className="text-xs text-slate-500">{t("hours")}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        placeholder="0"
        className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-sm text-ink"
      />
      <span className="text-xs text-slate-500">{t("minutes")}</span>
      <button
        type="button"
        onClick={handleSave}
        disabled={totalSeconds === 0 || saving}
        className="ms-auto rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {saved ? t("saved") : t("save")}
      </button>
    </div>
  );
}
