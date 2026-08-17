import type { StreakInfo } from "@sbr/shared-types";
import { addDaysUTC, formatDateOnly, parseDateOnly } from "../reading-plans/date-only.util";

/**
 * Série de lecture — calculée à partir des jours calendaires (pas des plans)
 * où au moins un chapitre a été lu, indépendamment du plan concerné : lire
 * une page de n'importe quel programme compte pour la série du jour.
 */
export function computeStreak(readDates: Iterable<string>, todayStr: string): StreakInfo {
  const uniqueSorted = [...new Set(readDates)].sort();

  let record = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of uniqueSorted) {
    run = previous && isNextDay(previous, date) ? run + 1 : 1;
    record = Math.max(record, run);
    previous = date;
  }

  const readSet = new Set(uniqueSorted);
  // La série courante démarre à aujourd'hui s'il est déjà lu, sinon on tolère
  // qu'aujourd'hui ne soit pas encore fait sans casser la série d'hier.
  let cursor = readSet.has(todayStr) ? todayStr : previousDay(todayStr);
  let current = 0;
  while (readSet.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  return { current, record };
}

function isNextDay(previous: string, current: string): boolean {
  return formatDateOnly(addDaysUTC(parseDateOnly(previous), 1)) === current;
}

function previousDay(dateStr: string): string {
  return formatDateOnly(addDaysUTC(parseDateOnly(dateStr), -1));
}
