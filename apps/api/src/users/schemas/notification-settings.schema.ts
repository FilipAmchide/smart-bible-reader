import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@sbr/shared-types";

/** Sous-document incorporé dans User — jamais persisté comme collection à part. */
@Schema({ _id: false })
export class NotificationSettings {
  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.smsEnabled })
  smsEnabled!: boolean;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.emailEnabled })
  emailEnabled!: boolean;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.webPushEnabled })
  webPushEnabled!: boolean;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime })
  dailyReminderTime!: string;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.quietHoursStart })
  quietHoursStart!: string;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnd })
  quietHoursEnd!: string;

  @Prop({ default: DEFAULT_NOTIFICATION_SETTINGS.weeklySummary })
  weeklySummary!: boolean;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(NotificationSettings);
