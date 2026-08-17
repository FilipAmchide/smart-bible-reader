import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminUsersService } from "./admin-users.service";
import { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.adminUsersService.findOne(id);
  }
}
