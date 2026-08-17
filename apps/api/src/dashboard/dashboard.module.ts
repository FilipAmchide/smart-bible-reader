import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { ReadingLog, ReadingLogSchema } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, ReadingPlanSchema } from "../reading-plans/schemas/reading-plan.schema";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ReadingPlan.name, schema: ReadingPlanSchema },
      { name: ReadingLog.name, schema: ReadingLogSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
