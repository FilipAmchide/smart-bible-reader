import { Controller, Get, Query } from "@nestjs/common";
import type { Language } from "@sbr/shared-types";
import { BibleVersionService } from "./bible-version.service";

@Controller("bible/versions")
export class BibleVersionController {
  constructor(private readonly bibleVersionService: BibleVersionService) {}

  @Get()
  findAll(@Query("lang") lang?: Language) {
    return this.bibleVersionService.findAll(lang);
  }
}
