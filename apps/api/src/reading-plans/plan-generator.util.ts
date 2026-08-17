import { BadRequestException } from "@nestjs/common";
import { bibleBooks } from "@sbr/bible-data";
import type { BibleBook, ChapterRange, ReadingScopeType } from "@sbr/shared-types";
import { addDaysUTC, diffDaysInclusive, formatDateOnly } from "./date-only.util";

/** Unité atomique de planification : un chapitre précis d'un livre précis. */
export interface ChapterUnit {
  bookCode: string;
  chapter: number;
}

export interface GeneratedDay {
  date: string; // "YYYY-MM-DD"
  chapters: ChapterRange[];
}

/**
 * Résout un périmètre de lecture en liste de livres, dans l'ordre où ils
 * seront lus. Pour "custom", l'ordre fourni par l'utilisateur est respecté
 * tel quel — c'est le levier de flexibilité demandé (§2.4) sans complexifier
 * l'API d'un champ de réordonnancement séparé.
 */
export function resolveScopeBooks(scopeType: ReadingScopeType, customCodes?: string[]): BibleBook[] {
  switch (scopeType) {
    case "full_bible":
      return bibleBooks;
    case "old_testament":
      return bibleBooks.filter((b) => b.testament === "AT");
    case "new_testament":
      return bibleBooks.filter((b) => b.testament === "NT");
    case "prophets":
      return bibleBooks.filter((b) => b.category === "major_prophets" || b.category === "minor_prophets");
    case "psalms":
      return bibleBooks.filter((b) => b.code === "PSA");
    case "proverbs":
      return bibleBooks.filter((b) => b.code === "PRO");
    case "custom": {
      if (!customCodes || customCodes.length === 0) {
        throw new BadRequestException("Sélectionnez au moins un livre pour une sélection libre.");
      }
      const byCode = new Map(bibleBooks.map((b) => [b.code, b]));
      return customCodes.map((raw) => {
        const code = raw.toUpperCase();
        const book = byCode.get(code);
        if (!book) throw new BadRequestException(`Livre inconnu : "${raw}".`);
        return book;
      });
    }
    default:
      throw new BadRequestException(`Périmètre de lecture inconnu : "${scopeType}".`);
  }
}

export function buildChapterUnits(books: BibleBook[]): ChapterUnit[] {
  const units: ChapterUnit[] = [];
  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
      units.push({ bookCode: book.code, chapter });
    }
  }
  return units;
}

/**
 * Répartition au plus grand reste, étalée uniformément sur l'intervalle
 * (méthode de Bresenham) : le jour i reçoit un chapitre "en plus" ssi
 * floor((i+1)·reste/joursTotal) > floor(i·reste/joursTotal). Sur `joursTotal`
 * jours, exactement `reste` d'entre eux reçoivent l'unité supplémentaire,
 * régulièrement espacés — jamais tous groupés en fin d'intervalle. La même
 * formule couvre aussi bien le cas "plus de chapitres que de jours" (reste
 * de chapitres en trop) que l'inverse (reste de jours de repos), sans
 * cas particulier : quand base=0, `reste` jours reçoivent 1 chapitre et les
 * autres 0.
 */
function extraUnitFlags(totalDays: number, remainder: number): boolean[] {
  const flags: boolean[] = [];
  for (let day = 0; day < totalDays; day++) {
    const before = Math.floor((day * remainder) / totalDays);
    const after = Math.floor(((day + 1) * remainder) / totalDays);
    flags.push(after > before);
  }
  return flags;
}

/** Regroupe une suite d'unités en tranches compactes {bookCode, from, to}. */
function groupIntoRanges(units: ChapterUnit[]): ChapterRange[] {
  const ranges: ChapterRange[] = [];
  for (const unit of units) {
    const last = ranges[ranges.length - 1];
    if (last && last.bookCode === unit.bookCode && last.chapterTo + 1 === unit.chapter) {
      last.chapterTo = unit.chapter;
    } else {
      ranges.push({ bookCode: unit.bookCode, chapterFrom: unit.chapter, chapterTo: unit.chapter });
    }
  }
  return ranges;
}

export function buildSchedule(units: ChapterUnit[], startDate: Date, endDate: Date): GeneratedDay[] {
  const totalDays = diffDaysInclusive(startDate, endDate);
  if (totalDays < 1) {
    throw new BadRequestException("La date de fin doit être postérieure ou égale à la date de début.");
  }

  const base = Math.floor(units.length / totalDays);
  const remainder = units.length % totalDays;
  const extraFlags = extraUnitFlags(totalDays, remainder);

  const days: GeneratedDay[] = [];
  let cursor = 0;
  for (let i = 0; i < totalDays; i++) {
    const count = base + (extraFlags[i] ? 1 : 0);
    const slice = units.slice(cursor, cursor + count);
    cursor += count;
    days.push({ date: formatDateOnly(addDaysUTC(startDate, i)), chapters: groupIntoRanges(slice) });
  }
  return days;
}

/** Déplie une tranche compacte en unités individuelles, dans l'ordre. */
export function expandRange(range: ChapterRange): ChapterUnit[] {
  const units: ChapterUnit[] = [];
  for (let chapter = range.chapterFrom; chapter <= range.chapterTo; chapter++) {
    units.push({ bookCode: range.bookCode, chapter });
  }
  return units;
}

export function chapterKey(unit: ChapterUnit): string {
  return `${unit.bookCode}:${unit.chapter}`;
}
