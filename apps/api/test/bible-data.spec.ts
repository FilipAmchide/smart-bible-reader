import { bibleBooks } from "@sbr/bible-data";

describe("@sbr/bible-data", () => {
  it("contient les 66 livres du canon protestant", () => {
    expect(bibleBooks).toHaveLength(66);
  });

  it("totalise 1189 chapitres, réparti 929 AT / 260 NT", () => {
    const total = bibleBooks.reduce((sum, b) => sum + b.chapterCount, 0);
    const ot = bibleBooks.filter((b) => b.testament === "AT").reduce((s, b) => s + b.chapterCount, 0);
    const nt = bibleBooks.filter((b) => b.testament === "NT").reduce((s, b) => s + b.chapterCount, 0);
    expect(total).toBe(1189);
    expect(ot).toBe(929);
    expect(nt).toBe(260);
  });

  it("a un ordre canonique continu de 1 à 66 sans doublon", () => {
    const orders = bibleBooks.map((b) => b.canonicalOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 66 }, (_, i) => i + 1));
  });

  it("a des codes uniques et un nom dans les 4 langues couvertes", () => {
    const codes = new Set(bibleBooks.map((b) => b.code));
    expect(codes.size).toBe(66);
    bibleBooks.forEach((b) => {
      expect(b.names.fr).toBeTruthy();
      expect(b.names.en).toBeTruthy();
      expect(b.names.es).toBeTruthy();
      expect(b.names.de).toBeTruthy();
    });
  });

  it("connaît des totaux bien identifiables (Psaumes = 150 chapitres)", () => {
    const psalms = bibleBooks.find((b) => b.code === "PSA");
    expect(psalms?.chapterCount).toBe(150);
    expect(psalms?.names.fr).toBe("Psaumes");
  });
});
