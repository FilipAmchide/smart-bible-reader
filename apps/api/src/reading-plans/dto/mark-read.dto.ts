import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from "class-validator";

export class ChapterRefDto {
  @IsString()
  bookCode!: string;

  @IsInt()
  @Min(1)
  chapter!: number;
}

export class MarkReadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChapterRefDto)
  chapters!: ChapterRefDto[];
}
