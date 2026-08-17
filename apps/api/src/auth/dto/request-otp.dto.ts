import { IsIn, IsOptional, IsString } from "class-validator";
import type { OtpPurpose } from "@sbr/shared-types";

export class RequestOtpDto {
  /** Email ou numéro de téléphone — le type est détecté côté service. */
  @IsString()
  identifier!: string;

  @IsOptional()
  @IsIn(["login", "verify_identifier"])
  purpose?: OtpPurpose;
}
