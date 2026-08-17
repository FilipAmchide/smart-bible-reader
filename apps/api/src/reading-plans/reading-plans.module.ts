import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { BibleModule } from "../bible/bible.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { ExcelExportService } from "./export/excel-export.service";
import { PdfExportService } from "./export/pdf-export.service";
import { ReadingPlansController } from "./reading-plans.controller";
import { ReadingPlansService } from "./reading-plans.service";
import { ReadingLog, ReadingLogSchema } from "./schemas/reading-log.schema";
import { ReadingPlan, ReadingPlanSchema } from "./schemas/reading-plan.schema";

@Module({
  imports: [
    AuthModule, // JWT guard
    BibleModule, // BibleVersionService (liens de lecture externes)
    MongooseModule.forFeature([
      { name: ReadingPlan.name, schema: ReadingPlanSchema },
      { name: ReadingLog.name, schema: ReadingLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReadingPlansController],
  providers: [ReadingPlansService, PdfExportService, ExcelExportService],
})
export class ReadingPlansModule {}
