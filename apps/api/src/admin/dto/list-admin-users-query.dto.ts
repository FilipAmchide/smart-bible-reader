import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { SUPPORTED_LANGUAGES, type Language, type NotificationChannel } from "@sbr/shared-types";

const NOTIFICATION_CHANNELS: NotificationChannel[] = ["sms", "email", "web_push"];

export class ListAdminUsersQueryDto {
  /** Recherche libre sur le nom, l'email ou le téléphone. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: Language;

  /** Utilisateurs ayant ce canal de notification activé. */
  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS)
  notificationChannel?: NotificationChannel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
