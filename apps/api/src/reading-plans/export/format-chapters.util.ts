import type { ChapterView } from "@sbr/shared-types";

/** Regroupe une liste de chapitres dépliés en tranches lisibles, ex.
 * [PSA1,PSA2,PSA3,PRO1] -> "PSA 1-3, PRO 1" — pour l'affichage export uniquement. */
export function summarizeChapters(chapters: ChapterView[]): string {
  const segments: string[] = [];
  let currentBook: string | null = null;
  let from = 0;
  let to = 0;

  const flush = () => {
    if (currentBook === null) return;
    segments.push(from === to ? `${currentBook} ${from}` : `${currentBook} ${from}-${to}`);
  };

  for (const ch of chapters) {
    if (ch.bookCode === currentBook && ch.chapter === to + 1) {
      to = ch.chapter;
    } else {
      flush();
      currentBook = ch.bookCode;
      from = ch.chapter;
      to = ch.chapter;
    }
  }
  flush();

  return segments.join(", ");
}

/** Nom de fichier sûr, sans accents ni caractères spéciaux, longueur raisonnable. */
export function slugifyFilename(text: string): string {
  const ascii = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques combinants laissés par la NFD (é -> e + ´)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (ascii || "plan-de-lecture").slice(0, 60);
}

/** "HH:MM" ou "MM min" pour un temps de lecture cumulé en secondes. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}
