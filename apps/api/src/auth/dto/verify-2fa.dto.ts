import { IsOptional, IsString } from "class-validator";

export class Verify2faDto {
  /** Jeton temporaire renvoyé par /auth/otp/verify ou /auth/login quand le 2FA est requis. */
  @IsString()
  preAuthToken!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  backupCode?: string;
}
