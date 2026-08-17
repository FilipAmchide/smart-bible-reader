import {
  computeDueNotificationTypes,
  isWithinQuietHours,
  isWithinWindow,
  localTimeParts,
  type DueCheckInput,
} from "../src/notifications/due-notifications.util";
import type { NotificationSettings } from "@sbr/shared-types";

const BASE_SETTINGS: DueCheckInput["settings"] = {
  dailyReminderTime: "06:30",
  lateAlertTime: "20:00",
  quietHoursStart: "21:00",
  quietHoursEnd: "06:00",
  weeklySummary: true,
};

function input(overrides: Partial<DueCheckInput>): DueCheckInput {
  return {
    now: new Date("2026-08-17T00:00:00Z"),
    timezone: "UTC",
    settings: BASE_SETTINGS,
    todayEntryState: "incomplete",
    alreadySentToday: new Set(),
    alreadySentThisWeek: new Set(),
    windowMinutes: 15,
    ...overrides,
  };
}

describe("localTimeParts", () => {
  it("convertit un instant UTC vers un fuseau décalé", () => {
    // 2026-08-17T05:00:00Z -> Kinshasa (UTC+1) = 06:00, lundi
    const parts = localTimeParts(new Date("2026-08-17T05:00:00Z"), "Africa/Kinshasa");
    expect(parts).toEqual({ hh: 6, mm: 0, weekday: 1 });
  });

  it("gère un fuseau à décalage négatif (passage au jour précédent)", () => {
    // 2026-08-17T02:00:00Z -> New York (UTC-4 en été) = 22:00 la veille, dimanche
    const parts = localTimeParts(new Date("2026-08-17T02:00:00Z"), "America/New_York");
    expect(parts).toEqual({ hh: 22, mm: 0, weekday: 0 });
  });
});

describe("isWithinWindow", () => {
  it("est vrai dans la fenêtre, faux juste avant et juste après", () => {
    expect(isWithinWindow({ hh: 6, mm: 30, weekday: 1 }, "06:30", 15)).toBe(true);
    expect(isWithinWindow({ hh: 6, mm: 44, weekday: 1 }, "06:30", 15)).toBe(true);
    expect(isWithinWindow({ hh: 6, mm: 29, weekday: 1 }, "06:30", 15)).toBe(false);
    expect(isWithinWindow({ hh: 6, mm: 45, weekday: 1 }, "06:30", 15)).toBe(false);
  });

  it("gère une fenêtre qui traverse minuit", () => {
    expect(isWithinWindow({ hh: 23, mm: 55, weekday: 1 }, "23:50", 15)).toBe(true);
    expect(isWithinWindow({ hh: 0, mm: 2, weekday: 2 }, "23:50", 15)).toBe(true);
    expect(isWithinWindow({ hh: 0, mm: 10, weekday: 2 }, "23:50", 15)).toBe(false);
  });
});

describe("isWithinQuietHours", () => {
  it("gère une plage nocturne qui traverse minuit (21:00–06:00)", () => {
    expect(isWithinQuietHours({ hh: 22, mm: 0, weekday: 1 }, "21:00", "06:00")).toBe(true);
    expect(isWithinQuietHours({ hh: 3, mm: 0, weekday: 1 }, "21:00", "06:00")).toBe(true);
    expect(isWithinQuietHours({ hh: 12, mm: 0, weekday: 1 }, "21:00", "06:00")).toBe(false);
    expect(isWithinQuietHours({ hh: 6, mm: 0, weekday: 1 }, "21:00", "06:00")).toBe(false); // borne exclue
  });
});

describe("computeDueNotificationTypes", () => {
  it("déclenche le rappel quotidien pile dans la fenêtre, lecture non faite", () => {
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-17T06:35:00Z"), todayEntryState: "incomplete" }),
    );
    expect(due).toContain("daily_reminder");
  });

  it("ne déclenche rien si la lecture du jour est déjà complète", () => {
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-17T06:35:00Z"), todayEntryState: "complete" }),
    );
    expect(due).toEqual([]);
  });

  it("ne redéclenche pas un rappel déjà envoyé aujourd'hui", () => {
    const due = computeDueNotificationTypes(
      input({
        now: new Date("2026-08-17T06:35:00Z"),
        alreadySentToday: new Set(["daily_reminder"]),
      }),
    );
    expect(due).not.toContain("daily_reminder");
  });

  it("respecte les heures calmes pour le rappel quotidien", () => {
    const settings: NotificationSettings = { ...BASE_SETTINGS, dailyReminderTime: "22:00" } as NotificationSettings;
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-17T22:05:00Z"), settings }),
    );
    expect(due).not.toContain("daily_reminder"); // 22:00 est en heures calmes (21:00–06:00)
  });

  it("déclenche l'alerte de retard même en heures calmes", () => {
    const settings: NotificationSettings = { ...BASE_SETTINGS, lateAlertTime: "22:00" } as NotificationSettings;
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-17T22:05:00Z"), settings }),
    );
    expect(due).toContain("late_alert");
  });

  it("déclenche le résumé hebdomadaire le bon jour, à la bonne heure, une seule fois", () => {
    // 2026-08-16 est un dimanche
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-16T18:05:00Z"), todayEntryState: "complete" }),
    );
    expect(due).toContain("weekly_summary");

    const alreadySent = computeDueNotificationTypes(
      input({
        now: new Date("2026-08-16T18:05:00Z"),
        todayEntryState: "complete",
        alreadySentThisWeek: new Set(["weekly_summary"]),
      }),
    );
    expect(alreadySent).not.toContain("weekly_summary");
  });

  it("ne déclenche pas le résumé hebdomadaire si l'utilisateur l'a désactivé", () => {
    const settings: NotificationSettings = { ...BASE_SETTINGS, weeklySummary: false } as NotificationSettings;
    const due = computeDueNotificationTypes(
      input({ now: new Date("2026-08-16T18:05:00Z"), todayEntryState: "complete", settings }),
    );
    expect(due).not.toContain("weekly_summary");
  });
});
