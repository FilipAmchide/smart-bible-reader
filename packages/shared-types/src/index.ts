/**
 * Types partagés entre apps/api et apps/web.
 * Ce package n'a pas d'étape de build : il est consommé comme source TypeScript
 * directement (voir la config "paths" des tsconfig consommateurs).
 */

export type Role = "user" | "admin";

/** Langues d'interface. `ar` et `bas` sont modélisées dès la phase 1
 * (RTL / filière de traduction humaine) mais pas encore couvertes de contenu. */
export type Language = "fr" | "en" | "es" | "de" | "ar" | "bas";

/** Langues avec une couverture de traduction complète en phase 1. */
export const SUPPORTED_LANGUAGES: Language[] = ["fr", "en", "es", "de"];

/** Langues prévues mais dont le contenu arrive après la phase 1. */
export const PLANNED_LANGUAGES: Language[] = ["ar", "bas"];

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
  quietHoursStart: string;
  quietHoursEnd: string;
  weeklySummary: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  smsEnabled: false,
  emailEnabled: true,
  webPushEnabled: false,
  dailyReminderTime: "06:30",
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
}

export interface ReadingPlanProgress {
  chaptersRead: number;
  chaptersTotal: number;
  percent: number;
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
