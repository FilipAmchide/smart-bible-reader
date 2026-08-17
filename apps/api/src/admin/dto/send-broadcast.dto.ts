import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { SUPPORTED_LANGUAGES, type Language } from "@sbr/shared-types";

export class SendBroadcastDto {
  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  /** Non renseigné = diffusion à tous les utilisateurs, quelle que soit leur langue. */
  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: Language;
}
