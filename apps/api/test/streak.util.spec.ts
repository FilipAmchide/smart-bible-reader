import { computeStreak } from "../src/dashboard/streak.util";

describe("computeStreak", () => {
  it("série courante à 0 sans historique", () => {
    expect(computeStreak([], "2026-08-17")).toEqual({ current: 0, record: 0 });
  });

  it("compte une série courante ininterrompue jusqu'à aujourd'hui", () => {
    const dates = ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17"];
    expect(computeStreak(dates, "2026-08-17")).toEqual({ current: 4, record: 4 });
  });

  it("tolère qu'aujourd'hui ne soit pas encore lu sans casser la série d'hier", () => {
    const dates = ["2026-08-15", "2026-08-16"];
    expect(computeStreak(dates, "2026-08-17")).toEqual({ current: 2, record: 2 });
  });

  it("remet la série courante à 0 si hier n'a pas été lu non plus", () => {
    const dates = ["2026-08-10", "2026-08-11"];
    expect(computeStreak(dates, "2026-08-17")).toEqual({ current: 0, record: 2 });
  });

  it("garde le record le plus long même si la série courante est plus courte", () => {
    const dates = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-16", "2026-08-17"];
    expect(computeStreak(dates, "2026-08-17")).toEqual({ current: 2, record: 5 });
  });

  it("ignore les doublons et l'ordre d'entrée", () => {
    const dates = ["2026-08-17", "2026-08-15", "2026-08-16", "2026-08-16", "2026-08-17"];
    expect(computeStreak(dates, "2026-08-17")).toEqual({ current: 3, record: 3 });
  });
});
