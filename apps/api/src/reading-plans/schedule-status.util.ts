import type { EffectiveEntryStatus, ScheduleEntryStatus } from "@sbr/shared-types";

/**
 * Dérive le statut affiché d'une entrée à partir de son statut persisté et
 * d'aujourd'hui — "missed" n'existe qu'ici, jamais en base (voir le type
 * ScheduleEntryStatus). Partagé entre ReadingPlansService (vue détaillée d'un
 * plan) et DashboardService (agrégats "jours respectés/manqués") pour que les
 * deux ne puissent pas diverger sur la définition d'un jour manqué.
 */
export function effectiveEntryStatus(
  entry: { status: ScheduleEntryStatus; date: Date },
  today: Date,
): EffectiveEntryStatus {
  if ((entry.status === "pending" || entry.status === "partial") && entry.date.getTime() < today.getTime()) {
    return "missed";
  }
  return entry.status;
}
