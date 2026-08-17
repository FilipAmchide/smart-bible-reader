import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminStatsService } from "./admin-stats.service";

@Controller("admin/stats")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  getStats() {
    return this.adminStatsService.getStats();
  }
}
