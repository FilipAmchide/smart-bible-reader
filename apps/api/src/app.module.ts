import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BibleModule } from "./bible/bible.module";
import { ReadingPlansModule } from "./reading-plans/reading-plans.module";
import { DevicesModule } from "./devices/devices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    ScheduleModule.forRoot(), // active les @Cron() (rappels/alertes/résumés, voir NotificationsSchedulerService)
    DatabaseModule,
    AuthModule,
    UsersModule,
    BibleModule,
    ReadingPlansModule,
    DevicesModule,
    NotificationsModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
