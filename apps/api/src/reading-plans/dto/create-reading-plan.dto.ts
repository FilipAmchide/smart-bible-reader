import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { READING_SCOPE_TYPES, type ReadingScopeType } from "@sbr/shared-types";

export class CreateReadingPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsIn(READING_SCOPE_TYPES)
  scopeType!: ReadingScopeType;

  /** Requis (et respecté dans l'ordre fourni) uniquement pour scopeType="custom". */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bookCodes?: string[];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
