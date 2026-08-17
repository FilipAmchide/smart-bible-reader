import type { NotificationType } from "@sbr/shared-types";

export interface NotificationContentContext {
  fullName: string;
  chaptersThisWeek?: number;
}

export interface NotificationContent {
  subject: string;
  body: string;
}

/**
 * Construit le message par type de notification — fonction pure, séparée de
 * l'orchestration (NotificationsSchedulerService) pour rester testable sans
 * base de données. Contenu en français uniquement pour l'instant : la
 * localisation des notifications sortantes (selon `user.language`) est un
 * raffinement pour une itération suivante, non couvert ici.
 */
export function buildNotificationContent(
  type: NotificationType,
  ctx: NotificationContentContext,
): NotificationContent {
  switch (type) {
    case "daily_reminder":
      return {
        subject: "Votre lecture du jour vous attend",
        body: `Bonjour ${ctx.fullName}, prenez un instant aujourd'hui pour votre lecture biblique.`,
      };
    case "late_alert":
      return {
        subject: "Vous n'avez pas encore lu aujourd'hui",
        body: `${ctx.fullName}, il n'est pas trop tard pour rattraper la lecture du jour.`,
      };
    case "weekly_summary":
      return {
        subject: "Votre semaine de lecture",
        body: `${ctx.fullName}, vous avez lu ${ctx.chaptersThisWeek ?? 0} chapitre(s) cette semaine. Continuez ainsi !`,
      };
    case "milestone":
      return {
        subject: "Étape franchie !",
        body: `Bravo ${ctx.fullName}, une nouvelle étape de votre plan de lecture est franchie.`,
      };
    case "broadcast":
    default:
      return { subject: "Smart Bible Reader", body: "Notification de l'équipe Smart Bible Reader." };
  }
}
