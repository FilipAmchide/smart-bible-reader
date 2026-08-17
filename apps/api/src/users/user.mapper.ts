import type { UserProfile } from "@sbr/shared-types";
import type { UserDocument } from "./schemas/user.schema";

/** Ne jamais renvoyer passwordHash, twoFASecretEncrypted ou backupCodeHashes au client. */
export function toUserProfile(user: UserDocument): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    language: user.language,
    timezone: user.timezone,
    twoFAEnabled: user.twoFAEnabled,
    preferredVersionCode: user.preferredVersionCode,
    notificationSettings: {
      smsEnabled: user.notificationSettings.smsEnabled,
      emailEnabled: user.notificationSettings.emailEnabled,
      webPushEnabled: user.notificationSettings.webPushEnabled,
      dailyReminderTime: user.notificationSettings.dailyReminderTime,
      quietHoursStart: user.notificationSettings.quietHoursStart,
      quietHoursEnd: user.notificationSettings.quietHoursEnd,
      weeklySummary: user.notificationSettings.weeklySummary,
    },
    createdAt: user.createdAt.toISOString(),
  };
}
