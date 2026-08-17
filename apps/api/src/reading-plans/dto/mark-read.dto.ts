import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class ChapterRefDto {
  @IsString()
  bookCode!: string;

  @IsInt()
  @Min(1)
  chapter!: number;
}

/**
 * `chapters` et `durationSeconds` sont deux mises à jour indépendantes du
 * même jour — cocher des chapitres et déclarer un temps de lecture sont deux
 * actions distinctes côté écran (voir ReadingDurationInput côté web, une
 * simple saisie "j'ai mis XX min/h", pas un chronomètre), pas liées l'une à
 * l'autre. Au moins l'une des deux doit être fournie (vérifié en service).
 */
export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterRefDto)
  chapters?: ChapterRefDto[];

  /** Plafonné à 24h : garde-fou contre une saisie aberrante, pas une limite métier. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  durationSeconds?: number;
}
