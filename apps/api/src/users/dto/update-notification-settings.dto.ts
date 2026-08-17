import { IsBoolean, IsOptional, Matches } from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeField = () => Matches(TIME_PATTERN, { message: "Format attendu : HH:mm" });

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  webPushEnabled?: boolean;

  @IsOptional()
  @timeField()
  dailyReminderTime?: string;

  @IsOptional()
  @timeField()
  lateAlertTime?: string;

  @IsOptional()
  @timeField()
  quietHoursStart?: string;

  @IsOptional()
  @timeField()
  quietHoursEnd?: string;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;
}
