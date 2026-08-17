import type {
  AdminUserDetail,
  AdminUserSummary,
  AuditLogEntry,
  BibleVersionAdmin,
  ReadingPlanSummary,
} from "@sbr/shared-types";
import type { BibleVersionDocument } from "../bible/schemas/bible-version.schema";
import type { UserDocument } from "../users/schemas/user.schema";
import type { AdminAuditLogDocument } from "./schemas/admin-audit-log.schema";

/** Jamais passwordHash/twoFASecretEncrypted/backupCodeHashes — même règle que toUserProfile. */
export function toAdminUserSummary(
  user: UserDocument,
  activePlanCount: number,
  lastReadAt: Date | undefined,
): AdminUserSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    language: user.language,
    createdAt: user.createdAt.toISOString(),
    activePlanCount,
    lastReadAt: lastReadAt?.toISOString(),
  };
}

export function toAdminUserDetail(
  user: UserDocument,
  activePlanCount: number,
  lastReadAt: Date | undefined,
  plans: ReadingPlanSummary[],
): AdminUserDetail {
  return {
    ...toAdminUserSummary(user, activePlanCount, lastReadAt),
    timezone: user.timezone,
    twoFAEnabled: user.twoFAEnabled,
    notificationSettings: {
      smsEnabled: user.notificationSettings.smsEnabled,
      emailEnabled: user.notificationSettings.emailEnabled,
      webPushEnabled: user.notificationSettings.webPushEnabled,
      dailyReminderTime: user.notificationSettings.dailyReminderTime,
      lateAlertTime: user.notificationSettings.lateAlertTime,
      quietHoursStart: user.notificationSettings.quietHoursStart,
      quietHoursEnd: user.notificationSettings.quietHoursEnd,
      weeklySummary: user.notificationSettings.weeklySummary,
    },
    plans,
  };
}

export function toBibleVersionAdmin(version: BibleVersionDocument): BibleVersionAdmin {
  return {
    code: version.code,
    language: version.language,
    name: version.name,
    provider: version.provider,
    linkTemplate: version.linkTemplate,
    active: version.active,
  };
}

/** `adminFullName` est résolu séparément par l'appelant (une requête groupée sur
 * les auteurs distincts d'une page de résultats plutôt qu'un populate par ligne). */
export function toAuditLogEntry(log: AdminAuditLogDocument, adminFullName: string): AuditLogEntry {
  return {
    id: log.id,
    adminUserId: log.adminUserId.toString(),
    adminFullName,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  };
}
