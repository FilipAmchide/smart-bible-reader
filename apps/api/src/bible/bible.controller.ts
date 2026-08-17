import { Controller, Get, Param, Query } from "@nestjs/common";
import type { Language } from "@sbr/shared-types";
import { BibleService } from "./bible.service";

@Controller("bible")
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get("books")
  findAll(@Query("lang") lang: Language = "fr") {
    return this.bibleService.findAll(lang);
  }

  @Get("books/:code")
  findOne(@Param("code") code: string, @Query("lang") lang: Language = "fr") {
    return this.bibleService.findByCode(code, lang);
  }
}
