/**
 * Dates de planning traitées en "date pure" (minuit UTC), volontairement
 * indépendantes du fuseau horaire du serveur ou de l'utilisateur : un plan
 * du 1er au 30 septembre doit compter exactement 30 jours partout. Le calage
 * sur le fuseau de l'utilisateur est un souci d'heure de rappel (phase 3),
 * pas de comptage de jours.
 */

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Date invalide (attendu AAAA-MM-JJ) : "${value}"`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) throw new Error(`Date invalide : "${value}"`);
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Nombre de jours dans l'intervalle [start, end], bornes incluses. */
export function diffDaysInclusive(start: Date, end: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
