import { IsIn, IsOptional, IsString, Length } from "class-validator";
import type { OtpPurpose } from "@sbr/shared-types";

export class VerifyOtpDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsIn(["login", "verify_identifier"])
  purpose?: OtpPurpose;
}
