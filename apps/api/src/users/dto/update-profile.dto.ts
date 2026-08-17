import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { Language } from "@sbr/shared-types";

const LANGUAGES: Language[] = ["fr", "en", "es", "de", "ar", "bas"];

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;

  @IsOptional()
  @IsString()
  timezone?: string;

  /** Code d'une BibleVersion — validé côté service (existence en base). */
  @IsOptional()
  @IsString()
  preferredVersionCode?: string;
}
