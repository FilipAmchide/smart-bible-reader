import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/types/jwt-payload.type";
import { DevicesService } from "./devices.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { UnregisterDeviceDto } from "./dto/unregister-device.dto";

@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(user.sub, dto);
  }

  @Delete()
  unregister(@CurrentUser() user: JwtPayload, @Body() dto: UnregisterDeviceDto) {
    return this.devicesService.unregister(user.sub, dto.endpoint);
  }
}
