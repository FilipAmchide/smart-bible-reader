import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminAuditLogService } from "./admin-audit-log.service";
import { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";

@Controller("admin/audit-log")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AdminAuditLogService) {}

  @Get()
  findAll(@Query() query: ListAuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }
}
