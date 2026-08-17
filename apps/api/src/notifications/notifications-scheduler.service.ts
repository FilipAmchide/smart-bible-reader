import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { NotificationType } from "@sbr/shared-types";
import type { AppConfig } from "../config/configuration";
import { ReadingLog, type ReadingLogDocument } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, type ReadingPlanDocument } from "../reading-plans/schemas/reading-plan.schema";
import { formatDateOnly } from "../reading-plans/date-only.util";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { computeDueNotificationTypes, type TodayEntryState } from "./due-notifications.util";
import { buildNotificationContent } from "./notification-content.util";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationLog, type NotificationLogDocument } from "./schemas/notification-log.schema";

const WEEK_MS = 6 * 24 * 60 * 60 * 1000;
const RECENT_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);
  private readonly config: AppConfig;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ReadingPlan.name) private readonly planModel: Model<ReadingPlanDocument>,
    @InjectModel(ReadingLog.name) private readonly readingLogModel: Model<ReadingLogDocument>,
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLogDocument>,
    private readonly dispatchService: NotificationDispatchService,
    configService: ConfigService,
  ) {
    this.config = configService.get<AppConfig>("app")!;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick(now: Date = new Date()): Promise<void> {
    const candidates = await this.userModel.find({
      $or: [
        { "notificationSettings.smsEnabled": true },
        { "notificationSettings.emailEnabled": true },
        { "notificationSettings.webPushEnabled": true },
      ],
    });

    for (const user of candidates) {
      try {
        await this.processUser(user, now);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`Passage du planificateur en échec pour ${user.id} : ${reason}`);
      }
    }
  }

  private async processUser(user: UserDocument, now: Date): Promise<void> {
    const todayLocalStr = localDateString(now, user.timezone);
    const todayEntryState = await this.computeTodayEntryState(user, todayLocalStr);

    const recentLogs = await this.notificationLogModel.find({
      userId: user._id,
      sentAt: { $gte: new Date(now.getTime() - RECENT_LOOKBACK_MS) },
    });
    const alreadySentToday = new Set(
      recentLogs.filter((l) => localDateString(l.sentAt, user.timezone) === todayLocalStr).map((l) => l.type),
    );
    const alreadySentThisWeek = new Set<NotificationType>(
      recentLogs.some((l) => l.type === "weekly_summary" && now.getTime() - l.sentAt.getTime() < WEEK_MS)
        ? (["weekly_summary"] as const)
        : [],
    );

    const due = computeDueNotificationTypes({
      now,
      timezone: user.timezone,
      settings: user.notificationSettings,
      todayEntryState,
      alreadySentToday,
      alreadySentThisWeek,
      windowMinutes: this.config.scheduler.windowMinutes,
    });

    for (const type of due) {
      const content = buildNotificationContent(type, {
        fullName: user.fullName,
        chaptersThisWeek:
          type === "weekly_summary" ? await this.countChaptersReadSince(user, now, WEEK_MS) : undefined,
      });
      await this.dispatchService.dispatch(user, type, content, now);
    }
  }

  /** "incomplete" si au moins un plan actif a une lecture du jour non terminée. */
  private async computeTodayEntryState(user: UserDocument, todayLocalStr: string): Promise<TodayEntryState> {
    const activePlans = await this.planModel.find({ userId: user._id, status: "active" });
    let hasEntry = false;
    let allComplete = true;

    for (const plan of activePlans) {
      const entry = plan.schedule.find((e) => formatDateOnly(e.date) === todayLocalStr);
      if (!entry || entry.chapters.length === 0) continue; // pas de plan ce jour-là, ou jour de repos
      hasEntry = true;
      if (entry.status !== "complete") allComplete = false;
    }

    if (!hasEntry) return "none";
    return allComplete ? "complete" : "incomplete";
  }

  private async countChaptersReadSince(user: UserDocument, now: Date, lookbackMs: number): Promise<number> {
    return this.readingLogModel.countDocuments({
      userId: user._id,
      readAt: { $gte: new Date(now.getTime() - lookbackMs) },
    });
  }
}

/** Date locale ("YYYY-MM-DD") d'un instant dans un fuseau IANA — le format
 * en-CA rend directement l'ordre ISO, sans reconstruction manuelle. */
function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}
