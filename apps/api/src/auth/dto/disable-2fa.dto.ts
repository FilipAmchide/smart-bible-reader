import { IsOptional, IsString } from "class-validator";

export class Disable2faDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  backupCode?: string;
}
