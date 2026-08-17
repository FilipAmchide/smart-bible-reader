import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { BibleVersionService } from "../bible/bible-version.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/types/jwt-payload.type";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminAuditLogService } from "./admin-audit-log.service";
import { toBibleVersionAdmin } from "./admin.mapper";
import { CreateBibleVersionDto } from "./dto/create-bible-version.dto";
import { UpdateBibleVersionDto } from "./dto/update-bible-version.dto";

/** Gestion des versions bibliques externes (§2.7) — CRUD réservé à l'admin,
 * distinct de BibleVersionController (public, lecture seule, versions actives
 * uniquement). Réutilise BibleVersionService plutôt que de dupliquer l'accès Mongo. */
@Controller("admin/bible-versions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminBibleVersionsController {
  constructor(
    private readonly bibleVersionService: BibleVersionService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  @Get()
  async findAll() {
    const versions = await this.bibleVersionService.findAll(undefined, true);
    return versions.map(toBibleVersionAdmin);
  }

  @Post()
  async create(@CurrentUser() admin: JwtPayload, @Body() dto: CreateBibleVersionDto) {
    const version = await this.bibleVersionService.create(dto);
    await this.auditLogService.record(admin.sub, "bible_version.create", "bible_version", version.code, { ...dto });
    return toBibleVersionAdmin(version);
  }

  @Patch(":code")
  async update(
    @CurrentUser() admin: JwtPayload,
    @Param("code") code: string,
    @Body() dto: UpdateBibleVersionDto,
  ) {
    const version = await this.bibleVersionService.update(code, dto);
    await this.auditLogService.record(admin.sub, "bible_version.update", "bible_version", code, { ...dto });
    return toBibleVersionAdmin(version);
  }
}
