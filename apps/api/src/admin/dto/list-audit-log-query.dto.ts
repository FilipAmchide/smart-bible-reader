import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type { AdminAuditAction } from "@sbr/shared-types";

const ADMIN_AUDIT_ACTIONS: AdminAuditAction[] = [
  "broadcast.send",
  "bible_version.create",
  "bible_version.update",
];

export class ListAuditLogQueryDto {
  @IsOptional()
  @IsIn(ADMIN_AUDIT_ACTIONS)
  action?: AdminAuditAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
