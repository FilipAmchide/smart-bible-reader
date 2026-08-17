import {
  buildChapterUnits,
  buildSchedule,
  chapterKey,
  expandRange,
  resolveScopeBooks,
  type ChapterUnit,
} from "../src/reading-plans/plan-generator.util";
import { parseDateOnly } from "../src/reading-plans/date-only.util";

function unitsFor(scope: Parameters<typeof resolveScopeBooks>[0], custom?: string[]): ChapterUnit[] {
  return buildChapterUnits(resolveScopeBooks(scope, custom));
}

function totalChapters(days: ReturnType<typeof buildSchedule>): number {
  return days.reduce(
    (sum, d) => sum + d.chapters.reduce((s, r) => s + (r.chapterTo - r.chapterFrom + 1), 0),
    0,
  );
}

describe("resolveScopeBooks", () => {
  it("résout les périmètres prédéfinis avec les bons décomptes de livres", () => {
    expect(resolveScopeBooks("full_bible")).toHaveLength(66);
    expect(resolveScopeBooks("old_testament")).toHaveLength(39);
    expect(resolveScopeBooks("new_testament")).toHaveLength(27);
    expect(resolveScopeBooks("psalms").map((b) => b.code)).toEqual(["PSA"]);
    expect(resolveScopeBooks("proverbs").map((b) => b.code)).toEqual(["PRO"]);
    // 5 majeurs + 12 mineurs
    expect(resolveScopeBooks("prophets")).toHaveLength(17);
  });

  it("respecte l'ordre fourni par l'utilisateur pour une sélection libre", () => {
    const books = resolveScopeBooks("custom", ["PSA", "GEN", "PRO"]);
    expect(books.map((b) => b.code)).toEqual(["PSA", "GEN", "PRO"]);
  });

  it("rejette une sélection libre vide ou un code inconnu", () => {
    expect(() => resolveScopeBooks("custom", [])).toThrow();
    expect(() => resolveScopeBooks("custom", ["XXX"])).toThrow();
  });
});

describe("buildSchedule", () => {
  it("répartit sans reste quand le compte tombe juste (Psaumes, 150 chapitres / 30 jours)", () => {
    const units = unitsFor("psalms");
    const days = buildSchedule(units, parseDateOnly("2026-09-01"), parseDateOnly("2026-09-30"));
    expect(days).toHaveLength(30);
    days.forEach((d) => {
      const count = d.chapters.reduce((s, r) => s + (r.chapterTo - r.chapterFrom + 1), 0);
      expect(count).toBe(5);
    });
    expect(totalChapters(days)).toBe(150);
  });

  it("étale le reste sur l'intervalle plutôt que de l'empiler en fin de plan", () => {
    // 7 chapitres sur 5 jours : base=1, reste=2 -> deux jours à 2 chapitres,
    // trois jours à 1 — et les deux jours à 2 ne doivent pas être adjacents
    // en fin d'intervalle (empilement classique d'un algorithme naïf).
    const units: ChapterUnit[] = Array.from({ length: 7 }, (_, i) => ({ bookCode: "PSA", chapter: i + 1 }));
    const days = buildSchedule(units, parseDateOnly("2026-01-01"), parseDateOnly("2026-01-05"));
    const counts = days.map((d) => d.chapters.reduce((s, r) => s + (r.chapterTo - r.chapterFrom + 1), 0));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(7);
    // étalement de Bresenham : les deux jours "à 2" sont espacés (index 2 et 4),
    // jamais groupés en tête ([2,2,1,1,1]) ni en queue ([1,1,1,2,2]) du plan.
    expect(counts).toEqual([1, 1, 2, 1, 2]);
  });

  it("laisse des jours de repos quand il y a plus de jours que de chapitres", () => {
    // 3 chapitres sur 7 jours : la majorité des jours sont à 0.
    const units: ChapterUnit[] = [
      { bookCode: "OBA", chapter: 1 },
      { bookCode: "PHM", chapter: 1 },
      { bookCode: "JUD", chapter: 1 },
    ];
    const days = buildSchedule(units, parseDateOnly("2026-01-01"), parseDateOnly("2026-01-07"));
    const counts = days.map((d) => d.chapters.reduce((s, r) => s + (r.chapterTo - r.chapterFrom + 1), 0));
    expect(counts.filter((c) => c === 0)).toHaveLength(4);
    expect(counts.filter((c) => c === 1)).toHaveLength(3);
    expect(totalChapters(days)).toBe(3);
  });

  it("ne scinde jamais un chapitre et couvre chaque unité exactement une fois (Nouveau Testament / 90 jours)", () => {
    const units = unitsFor("new_testament");
    const days = buildSchedule(units, parseDateOnly("2026-09-01"), parseDateOnly("2026-11-29"));
    expect(days).toHaveLength(90);

    const seen = new Set<string>();
    for (const day of days) {
      for (const range of day.chapters) {
        for (const unit of expandRange(range)) {
          const key = chapterKey(unit);
          expect(seen.has(key)).toBe(false); // jamais deux fois le même chapitre
          seen.add(key);
        }
      }
    }
    expect(seen.size).toBe(units.length);
    // et l'ordre canonique est respecté : le tout dernier chapitre couvert est APO 22
    const lastDayWithChapters = [...days].reverse().find((d) => d.chapters.length > 0)!;
    const lastRange = lastDayWithChapters.chapters[lastDayWithChapters.chapters.length - 1];
    expect(lastRange.bookCode).toBe("REV");
    expect(lastRange.chapterTo).toBe(22);
  });

  it("couvre la Bible entière (1189 chapitres) sur un an sans en perdre ni en dupliquer", () => {
    const units = unitsFor("full_bible");
    const days = buildSchedule(units, parseDateOnly("2026-01-01"), parseDateOnly("2026-12-31"));
    expect(days).toHaveLength(365);
    expect(totalChapters(days)).toBe(1189);
  });

  it("rejette une date de fin antérieure à la date de début", () => {
    expect(() => buildSchedule([], parseDateOnly("2026-01-10"), parseDateOnly("2026-01-01"))).toThrow();
  });
});

