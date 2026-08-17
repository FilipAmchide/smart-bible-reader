import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BibleController } from "./bible.controller";
import { BibleService } from "./bible.service";
import { BibleVersionController } from "./bible-version.controller";
import { BibleVersionService } from "./bible-version.service";
import { BibleBook, BibleBookSchema } from "./schemas/bible-book.schema";
import { BibleVersion, BibleVersionSchema } from "./schemas/bible-version.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BibleBook.name, schema: BibleBookSchema },
      { name: BibleVersion.name, schema: BibleVersionSchema },
    ]),
  ],
  controllers: [BibleController, BibleVersionController],
  providers: [BibleService, BibleVersionService],
  exports: [BibleService, BibleVersionService],
})
export class BibleModule {}
