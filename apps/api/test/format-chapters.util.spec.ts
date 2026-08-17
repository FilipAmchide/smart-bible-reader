import { formatDuration, slugifyFilename, summarizeChapters } from "../src/reading-plans/export/format-chapters.util";
import type { ChapterView } from "@sbr/shared-types";

function unit(bookCode: string, chapter: number): ChapterView {
  return { bookCode, chapter, read: false, readingUrl: null };
}

describe("summarizeChapters", () => {
  it("regroupe des chapitres consécutifs d'un même livre en une tranche", () => {
    expect(summarizeChapters([unit("PSA", 1), unit("PSA", 2), unit("PSA", 3)])).toBe("PSA 1-3");
  });

  it("sépare les livres différents et les ruptures de séquence", () => {
    const chapters = [unit("PSA", 1), unit("PSA", 2), unit("PRO", 1), unit("PSA", 5)];
    expect(summarizeChapters(chapters)).toBe("PSA 1-2, PRO 1, PSA 5");
  });

  it("renvoie une chaîne vide pour une liste vide", () => {
    expect(summarizeChapters([])).toBe("");
  });

  it("un chapitre isolé s'affiche sans tiret", () => {
    expect(summarizeChapters([unit("OBA", 1)])).toBe("OBA 1");
  });
});

describe("formatDuration", () => {
  it("affiche des minutes en dessous d'une heure", () => {
    expect(formatDuration(15 * 60)).toBe("15 min");
  });

  it("affiche heures et minutes au-delà d'une heure", () => {
    expect(formatDuration(90 * 60)).toBe("1h30");
  });

  it("renvoie une chaîne vide pour une durée nulle ou négative", () => {
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });
});

describe("slugifyFilename", () => {
  it("retire les accents et remplace les espaces par des tirets", () => {
    expect(slugifyFilename("Été 2026 — Nouveau Testament")).toBe("ete-2026-nouveau-testament");
  });

  it("retombe sur une valeur par défaut si rien n'est translittérable", () => {
    expect(slugifyFilename("خطة قراءة")).toBe("plan-de-lecture");
  });
});
