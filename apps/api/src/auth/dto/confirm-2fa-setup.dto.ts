import { IsString, Length } from "class-validator";

export class Confirm2faSetupDto {
  /** Jeton signé renvoyé par /auth/2fa/setup, porteur du secret le temps de la confirmation. */
  @IsString()
  setupToken!: string;

  /** Code TOTP généré à partir du secret reçu lors de /auth/2fa/setup. */
  @IsString()
  @Length(6, 6)
  code!: string;
}
