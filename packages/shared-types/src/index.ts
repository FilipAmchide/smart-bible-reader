/**
 * Types partagés entre apps/api et apps/web.
 * Ce package n'a pas d'étape de build : il est consommé comme source TypeScript
 * directement (voir la config "paths" des tsconfig consommateurs).
 */

export type Role = "user" | "admin";

/** Langues d'interface. `bas` est modélisée dès la phase 1 (filière de
 * traduction humaine dédiée, §07 du cahier des charges) mais pas encore
 * couverte de contenu — voir PLANNED_LANGUAGES. */
export type Language = "fr" | "en" | "es" | "de" | "ar" | "bas";

/** Langues avec une couverture de traduction complète, routables dans l'app. */
export const SUPPORTED_LANGUAGES: Language[] = ["fr", "en", "es", "de", "ar"];

/** Langues prévues mais dont le contenu arrive plus tard (traduction humaine requise). */
export const PLANNED_LANGUAGES: Language[] = ["bas"];

export const RTL_LANGUAGES: Language[] = ["ar"];

export type Testament = "AT" | "NT";

export type BookCategory =
  | "law"
  | "history_ot"
  | "wisdom"
  | "major_prophets"
  | "minor_prophets"
  | "gospel"
  | "history_nt"
  | "pauline_epistles"
  | "general_epistles"
  | "apocalyptic";

/** Noms traduits d'un livre biblique — une clé par langue couverte en phase 1. */
export interface BibleBookNames {
  fr: string;
  en: string;
  es: string;
  de: string;
}

export interface BibleBook {
  /** Code canonique USFM à 3 caractères (ex. "GEN", "1CO"). */
  code: string;
  names: BibleBookNames;
  testament: Testament;
  category: BookCategory;
  chapterCount: number;
  /** Position 1-66 dans l'ordre canonique protestant. */
  canonicalOrder: number;
}

export interface NotificationSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  webPushEnabled: boolean;
  /** Format "HH:mm", interprété dans le fuseau horaire de l'utilisateur. */
  dailyReminderTime: string;
  /** Heure limite au-delà de laquelle une lecture du jour non marquée déclenche une alerte de retard. */
  lateAlertTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  weeklySummary: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  smsEnabled: false,
  emailEnabled: true,
  webPushEnabled: false,
  dailyReminderTime: "06:30",
  lateAlertTime: "20:00",
  quietHoursStart: "21:00",
  quietHoursEnd: "06:00",
  weeklySummary: true,
};

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: Role;
  language: Language;
  timezone: string;
  twoFAEnabled: boolean;
  /** Code d'une BibleVersion — détermine le fournisseur des liens de lecture externes (§2.4). */
  preferredVersionCode?: string;
  notificationSettings: NotificationSettings;
  createdAt: string;
}

export type OtpPurpose = "login" | "verify_identifier";

export type IdentifierKind = "email" | "phone";

export function detectIdentifierKind(identifier: string): IdentifierKind {
  return identifier.includes("@") ? "email" : "phone";
}

// ---------------------------------------------------------------------------
// Planification de lecture (phase 2)
// ---------------------------------------------------------------------------

/** Périmètre d'un plan de lecture — "custom" s'accompagne d'une liste de codes livre. */
export type ReadingScopeType =
  | "full_bible"
  | "old_testament"
  | "new_testament"
  | "prophets"
  | "psalms"
  | "proverbs"
  | "custom";

export const READING_SCOPE_TYPES: ReadingScopeType[] = [
  "full_bible",
  "old_testament",
  "new_testament",
  "prophets",
  "psalms",
  "proverbs",
  "custom",
];

export type ReadingPlanStatus = "active" | "completed" | "abandoned";

/** Statut persisté d'une entrée de planning. "missed" n'est jamais stocké : il
 * est dérivé à la lecture, en comparant la date à aujourd'hui (voir l'API). */
export type ScheduleEntryStatus = "pending" | "partial" | "complete" | "rest";
export type EffectiveEntryStatus = ScheduleEntryStatus | "missed";

/** Un chapitre n'est jamais scindé : l'unité atomique de planification. */
export interface ChapterRange {
  bookCode: string;
  chapterFrom: number;
  chapterTo: number;
}

export interface BibleVersion {
  code: string;
  language: Language;
  name: string;
  provider: string;
  /** Gabarit avec les jetons {bookCode} et {chapter}, ex. ".../{bookCode}.{chapter}.S21". */
  linkTemplate: string;
}

/** Vue API d'un chapitre individuel au sein d'une entrée de planning — dépliée
 * à partir des ChapterRange compacts stockés en base, jamais persistée telle quelle. */
export interface ChapterView {
  bookCode: string;
  chapter: number;
  read: boolean;
  /** null si l'utilisateur n'a ni version préférée ni langue couverte par une version. */
  readingUrl: string | null;
}

export interface ScheduleEntryView {
  date: string; // "YYYY-MM-DD"
  status: EffectiveEntryStatus;
  chapters: ChapterView[];
  /** Temps de lecture cumulé pour ce jour (0 si jamais renseigné). Toujours une saisie
   * manuelle de l'utilisateur — "j'ai mis XX minutes/heures" après coup — jamais mesuré
   * automatiquement : SBR ne contrôle pas la page de lecture externe (§2.4) et ne peut
   * donc pas savoir quand la lecture a réellement commencé ou fini (voir
   * ReadingDurationInput côté web). */
  readingDurationSeconds: number;
}

export interface ReadingPlanProgress {
  chaptersRead: number;
  chaptersTotal: number;
  percent: number;
  /** Somme des temps de lecture déclarés sur l'ensemble du plan (voir ScheduleEntryView). */
  readingTimeSeconds: number;
}

export interface ReadingPlanSummary {
  id: string;
  name: string;
  scopeType: ReadingScopeType;
  startDate: string;
  endDate: string;
  status: ReadingPlanStatus;
  progress: ReadingPlanProgress;
}

export interface ReadingPlanDetail extends ReadingPlanSummary {
  bookCodes: string[];
  schedule: ScheduleEntryView[];
}

// ---------------------------------------------------------------------------
// Dashboard & séries (phase 3)
// ---------------------------------------------------------------------------

export interface StreakInfo {
  /** Jours consécutifs jusqu'à aujourd'hui inclus (ou hier si rien lu aujourd'hui). */
  current: number;
  /** Record personnel, toutes périodes confondues. */
  record: number;
}

export interface TestamentSplit {
  oldTestament: number;
  newTestament: number;
}

export interface DashboardActivityPoint {
  date: string; // "YYYY-MM-DD"
  chaptersRead: number;
}

export interface DashboardSummary {
  streak: StreakInfo;
  totalChaptersRead: number;
  /** Somme des temps de lecture déclarés (0 si l'utilisateur n'a jamais renseigné de durée). */
  totalReadingTimeSeconds: number;
  /** Entrées de planning, tous plans confondus, par statut effectif. */
  daysComplete: number;
  daysMissed: number;
  daysPartial: number;
  testamentSplit: TestamentSplit;
  /** Activité des 30 derniers jours, un point par jour (0 inclus). */
  activity: DashboardActivityPoint[];
  activePlans: ReadingPlanSummary[];
  pastPlans: ReadingPlanSummary[];
}

// ---------------------------------------------------------------------------
// Notifications sortantes (phase 3)
// ---------------------------------------------------------------------------

export type NotificationChannel = "sms" | "email" | "web_push";

export type NotificationType =
  | "daily_reminder"
  | "late_alert"
  | "weekly_summary"
  | "milestone"
  | "broadcast";

/** Abonnement Web Push tel que renvoyé par `PushSubscription.toJSON()` côté navigateur. */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
