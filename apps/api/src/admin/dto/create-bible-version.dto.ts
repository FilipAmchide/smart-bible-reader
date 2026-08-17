import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { SUPPORTED_LANGUAGES, type Language } from "@sbr/shared-types";

export class CreateBibleVersionDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsIn(SUPPORTED_LANGUAGES)
  language!: Language;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  provider!: string;

  /** Doit contenir les jetons {bookCode} et {chapter} — voir BibleVersionService.buildLink. */
  @IsString()
  @MinLength(1)
  linkTemplate!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
