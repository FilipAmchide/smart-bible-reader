import type { ReadingPlanSummary } from "@sbr/shared-types";
import { formatDateOnly } from "./date-only.util";
import type { ReadingLogDocument } from "./schemas/reading-log.schema";
import type { ReadingPlanDocument } from "./schemas/reading-plan.schema";

/**
 * Regroupe des `ReadingLog` par plan — étape commune à tout calcul de
 * progression (nombre de chapitres lus par plan). Extrait de
 * `DashboardService.getSummary` pour être réutilisé par la fiche utilisateur
 * de la console admin (§2.7) sans dupliquer la logique.
 */
export function buildLogsByPlan(logs: ReadingLogDocument[]): Map<string, number> {
  const logsByPlan = new Map<string, number>();
  for (const log of logs) {
    const key = log.planId.toString();
    logsByPlan.set(key, (logsByPlan.get(key) ?? 0) + 1);
  }
  return logsByPlan;
}

/** Vue résumée d'un plan (progression incluse) — même calcul quel que soit
 * l'appelant (dashboard personnel ou fiche admin). */
export function toReadingPlanSummary(plan: ReadingPlanDocument, chaptersRead: number): ReadingPlanSummary {
  return {
    id: plan.id,
    name: plan.name,
    scopeType: plan.scopeType,
    startDate: formatDateOnly(plan.startDate),
    endDate: formatDateOnly(plan.endDate),
    status: plan.status,
    progress: {
      chaptersRead,
      chaptersTotal: plan.totalChapters,
      percent: plan.totalChapters ? Math.round((chaptersRead / plan.totalChapters) * 100) : 0,
      readingTimeSeconds: plan.schedule.reduce((sum, entry) => sum + (entry.readingDurationSeconds ?? 0), 0),
    },
  };
}
