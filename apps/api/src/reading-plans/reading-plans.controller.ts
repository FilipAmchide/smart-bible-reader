import { Controller, Get, Body, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/types/jwt-payload.type";
import { CreateReadingPlanDto } from "./dto/create-reading-plan.dto";
import { MarkReadDto } from "./dto/mark-read.dto";
import { ExcelExportService } from "./export/excel-export.service";
import { PdfExportService } from "./export/pdf-export.service";
import { slugifyFilename } from "./export/format-chapters.util";
import { ReadingPlansService } from "./reading-plans.service";

@Controller("reading-plans")
@UseGuards(JwtAuthGuard)
export class ReadingPlansController {
  constructor(
    private readonly readingPlansService: ReadingPlansService,
    private readonly pdfExportService: PdfExportService,
    private readonly excelExportService: ExcelExportService,
  ) {}

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

  @Get(":id/export/pdf")
  async exportPdf(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { detail, language } = await this.readingPlansService.findOneForExport(user.sub, id);
    const buffer = await this.pdfExportService.build(detail, language);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyFilename(detail.name)}.pdf"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(":id/export/xlsx")
  async exportXlsx(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { detail, language } = await this.readingPlansService.findOneForExport(user.sub, id);
    const buffer = await this.excelExportService.build(detail, language);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slugifyFilename(detail.name)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }
}
