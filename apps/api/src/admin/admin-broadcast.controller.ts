import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/types/jwt-payload.type";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminBroadcastService } from "./admin-broadcast.service";
import { SendBroadcastDto } from "./dto/send-broadcast.dto";

@Controller("admin/broadcast")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminBroadcastController {
  constructor(private readonly adminBroadcastService: AdminBroadcastService) {}

  @Post()
  send(@CurrentUser() admin: JwtPayload, @Body() dto: SendBroadcastDto) {
    return this.adminBroadcastService.send(admin.sub, dto);
  }
}
