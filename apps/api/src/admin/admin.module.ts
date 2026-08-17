import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { BibleModule } from "../bible/bible.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationLog, NotificationLogSchema } from "../notifications/schemas/notification-log.schema";
import { ReadingLog, ReadingLogSchema } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, ReadingPlanSchema } from "../reading-plans/schemas/reading-plan.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { AdminAuditLogController } from "./admin-audit-log.controller";
import { AdminAuditLogService } from "./admin-audit-log.service";
import { AdminBibleVersionsController } from "./admin-bible-versions.controller";
import { AdminBroadcastController } from "./admin-broadcast.controller";
import { AdminBroadcastService } from "./admin-broadcast.service";
import { AdminStatsController } from "./admin-stats.controller";
import { AdminStatsService } from "./admin-stats.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminAuditLog, AdminAuditLogSchema } from "./schemas/admin-audit-log.schema";

@Module({
  imports: [
    AuthModule, // fournit JwtAuthGuard/RolesGuard + NotificationSenderService
    BibleModule, // réutilise BibleVersionService (CRUD versions bibliques)
    NotificationsModule, // réutilise NotificationDispatchService (diffusion d'annonces)
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ReadingPlan.name, schema: ReadingPlanSchema },
      { name: ReadingLog.name, schema: ReadingLogSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminStatsController,
    AdminBroadcastController,
    AdminBibleVersionsController,
    AdminAuditLogController,
  ],
  providers: [AdminUsersService, AdminStatsService, AdminBroadcastService, AdminAuditLogService],
})
export class AdminModule {}
