import type { NotificationSettings, NotificationType } from "@sbr/shared-types";

/**
 * Détermine quels rappels programmés sont dus à l'instant présent. Fonctions
 * pures, sans horloge ni base de données — testées avec des dates figées
 * plutôt qu'en attendant qu'un vrai cron se déclenche (voir
 * notifications-scheduler.service.ts pour l'orchestration réelle).
 */

export interface LocalTimeParts {
  hh: number;
  mm: number;
  /** 0 = dimanche … 6 = samedi (aligné sur Date#getDay()). */
  weekday: number;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Heure/minute/jour de semaine *locaux* de `date` dans le fuseau `timeZone`. */
export function localTimeParts(date: Date, timeZone: string): LocalTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hh: parseInt(get("hour"), 10) % 24, // Intl renvoie parfois "24" à minuit pile
    mm: parseInt(get("minute"), 10),
    weekday: WEEKDAY_NAMES.indexOf(get("weekday")),
  };
}

function toMinutes(hh: number, mm: number): number {
  return hh * 60 + mm;
}

function parseTime(value: string): { hh: number; mm: number } {
  const [hh, mm] = value.split(":").map(Number);
  return { hh, mm };
}

/** current ∈ [target, target + windowMinutes), en gérant le passage de minuit. */
export function isWithinWindow(current: LocalTimeParts, target: string, windowMinutes: number): boolean {
  const t = parseTime(target);
  const cur = toMinutes(current.hh, current.mm);
  const start = toMinutes(t.hh, t.mm);
  const end = (start + windowMinutes) % (24 * 60);
  return end > start ? cur >= start && cur < end : cur >= start || cur < end;
}

/** Plage calme, typiquement nocturne (ex. 21:00–06:00, traverse minuit). */
export function isWithinQuietHours(current: LocalTimeParts, quietStart: string, quietEnd: string): boolean {
  const s = parseTime(quietStart);
  const e = parseTime(quietEnd);
  const cur = toMinutes(current.hh, current.mm);
  const start = toMinutes(s.hh, s.mm);
  const end = toMinutes(e.hh, e.mm);
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

export type TodayEntryState = "none" | "incomplete" | "complete";

export interface DueCheckInput {
  now: Date;
  timezone: string;
  settings: Pick<
    NotificationSettings,
    "dailyReminderTime" | "lateAlertTime" | "quietHoursStart" | "quietHoursEnd" | "weeklySummary"
  >;
  /** État de la lecture du jour, tous plans actifs confondus. */
  todayEntryState: TodayEntryState;
  alreadySentToday: Set<NotificationType>;
  alreadySentThisWeek: Set<NotificationType>;
  windowMinutes: number;
  /** Créneau fixe du résumé hebdomadaire — non paramétrable par l'utilisateur (juste le booléen l'est). */
  weeklySummaryDay?: number;
  weeklySummaryTime?: string;
}

export function computeDueNotificationTypes(input: DueCheckInput): NotificationType[] {
  const local = localTimeParts(input.now, input.timezone);
  const { settings, todayEntryState, alreadySentToday, alreadySentThisWeek, windowMinutes } = input;
  const due: NotificationType[] = [];

  const inQuietHours = isWithinQuietHours(local, settings.quietHoursStart, settings.quietHoursEnd);

  if (
    todayEntryState === "incomplete" &&
    !inQuietHours &&
    !alreadySentToday.has("daily_reminder") &&
    isWithinWindow(local, settings.dailyReminderTime, windowMinutes)
  ) {
    due.push("daily_reminder");
  }

  // L'alerte de retard signale un oubli réel : elle sort volontairement des
  // heures calmes (contrairement au rappel, qui est un simple coup de pouce).
  if (
    todayEntryState === "incomplete" &&
    !alreadySentToday.has("late_alert") &&
    isWithinWindow(local, settings.lateAlertTime, windowMinutes)
  ) {
    due.push("late_alert");
  }

  const weeklySummaryDay = input.weeklySummaryDay ?? 0; // dimanche
  const weeklySummaryTime = input.weeklySummaryTime ?? "18:00";
  if (
    settings.weeklySummary &&
    !inQuietHours &&
    local.weekday === weeklySummaryDay &&
    !alreadySentThisWeek.has("weekly_summary") &&
    isWithinWindow(local, weeklySummaryTime, windowMinutes)
  ) {
    due.push("weekly_summary");
  }

  return due;
}
