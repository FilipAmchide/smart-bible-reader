import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/types/jwt-payload.type";
import { CreateReadingPlanDto } from "./dto/create-reading-plan.dto";
import { MarkReadDto } from "./dto/mark-read.dto";
import { ReadingPlansService } from "./reading-plans.service";

@Controller("reading-plans")
@UseGuards(JwtAuthGuard)
export class ReadingPlansController {
  constructor(private readonly readingPlansService: ReadingPlansService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingPlanDto) {
    return this.readingPlansService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.readingPlansService.findAllForUser(user.sub);
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.readingPlansService.findOneDetail(user.sub, id);
  }

  @Patch(":id/entries/:date")
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("date") date: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.readingPlansService.markRead(user.sub, id, date, dto);
  }

  @Post(":id/recalculate")
  recalculate(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.readingPlansService.recalculate(user.sub, id);
  }
}
