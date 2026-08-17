import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { AtLeastOneIdentifier } from "../../common/validators/at-least-one-identifier.validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @AtLeastOneIdentifier({ message: "Renseignez un email ou un numéro de téléphone." })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Optionnel : un compte peut rester purement OTP, sans mot de passe. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
