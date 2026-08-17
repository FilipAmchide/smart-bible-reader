import { buildNotificationContent } from "../src/notifications/notification-content.util";

describe("buildNotificationContent", () => {
  it("personnalise le rappel quotidien avec le nom de l'utilisateur", () => {
    const content = buildNotificationContent("daily_reminder", { fullName: "Naomi" });
    expect(content.body).toContain("Naomi");
  });

  it("inclut le nombre de chapitres dans le résumé hebdomadaire", () => {
    const content = buildNotificationContent("weekly_summary", { fullName: "Naomi", chaptersThisWeek: 12 });
    expect(content.body).toContain("12");
  });

  it("retombe sur 0 chapitre si le compteur n'est pas fourni", () => {
    const content = buildNotificationContent("weekly_summary", { fullName: "Naomi" });
    expect(content.body).toContain("0 chapitre");
  });
});
