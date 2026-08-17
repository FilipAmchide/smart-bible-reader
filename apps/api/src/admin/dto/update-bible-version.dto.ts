import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateBibleVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  provider?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  linkTemplate?: string;

  /** Bascule vers `false` pour retirer la version des choix proposés (§2.7),
   * sans la supprimer ni casser les utilisateurs qui l'ont déjà en préférence. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
