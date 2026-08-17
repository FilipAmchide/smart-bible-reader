import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { DevicesModule } from "../devices/devices.module";
import { ReadingLog, ReadingLogSchema } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, ReadingPlanSchema } from "../reading-plans/schemas/reading-plan.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationsSchedulerService } from "./notifications-scheduler.service";
import { NotificationLog, NotificationLogSchema } from "./schemas/notification-log.schema";
import { WebPushService } from "./web-push.service";

@Module({
  imports: [
    AuthModule, // réexploite NotificationSenderService (SMS/email)
    DevicesModule, // WebPushService en a besoin pour retrouver les abonnements
    MongooseModule.forFeature([
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: User.name, schema: UserSchema },
      { name: ReadingPlan.name, schema: ReadingPlanSchema },
      { name: ReadingLog.name, schema: ReadingLogSchema },
    ]),
  ],
  providers: [NotificationDispatchService, NotificationsSchedulerService, WebPushService],
  exports: [NotificationDispatchService],
})
export class NotificationsModule {}
