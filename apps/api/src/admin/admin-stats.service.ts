import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { NotificationChannel, PlatformStats, ReadingScopeType } from "@sbr/shared-types";
import { NotificationLog, type NotificationLogDocument } from "../notifications/schemas/notification-log.schema";
import { addDaysUTC, todayUTC } from "../reading-plans/date-only.util";
import { ReadingLog, type ReadingLogDocument } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, type ReadingPlanDocument } from "../reading-plans/schemas/reading-plan.schema";
import { User, type UserDocument } from "../users/schemas/user.schema";

const ACTIVITY_WINDOW_DAYS = 30;

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ReadingPlan.name) private readonly planModel: Model<ReadingPlanDocument>,
    @InjectModel(ReadingLog.name) private readonly logModel: Model<ReadingLogDocument>,
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLogDocument>,
  ) {}

  async getStats(): Promise<PlatformStats> {
    const since = addDaysUTC(todayUTC(), -ACTIVITY_WINDOW_DAYS);

    const [totalUsers, activeUserIds, plans, chaptersReadByPlan, notificationCounts] = await Promise.all([
      this.userModel.countDocuments(),
      this.logModel.distinct("userId", { readAt: { $gte: since } }),
      this.planModel.find({}, { scopeType: 1, totalChapters: 1 }),
      this.logModel.aggregate<{ _id: unknown; count: number }>([
        { $group: { _id: "$planId", count: { $sum: 1 } } },
      ]),
      this.notificationLogModel.aggregate<{ _id: { channel: NotificationChannel; status: "sent" | "failed" }; count: number }>([
        { $group: { _id: { channel: "$channel", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    const chaptersReadById = new Map(chaptersReadByPlan.map((r) => [String(r._id), r.count]));

    const plansByScope: Partial<Record<ReadingScopeType, number>> = {};
    let percentSum = 0;
    let plansWithChapters = 0;
    for (const plan of plans) {
      plansByScope[plan.scopeType] = (plansByScope[plan.scopeType] ?? 0) + 1;
      if (plan.totalChapters > 0) {
        const chaptersRead = chaptersReadById.get(plan.id) ?? 0;
        percentSum += Math.min(100, Math.round((chaptersRead / plan.totalChapters) * 100));
        plansWithChapters += 1;
      }
    }

    const notificationsByChannel: PlatformStats["notificationsByChannel"] = {};
    for (const row of notificationCounts) {
      const entry = notificationsByChannel[row._id.channel] ?? { sent: 0, failed: 0 };
      entry[row._id.status] = row.count;
      notificationsByChannel[row._id.channel] = entry;
    }

    return {
      totalUsers,
      activeUsers30d: activeUserIds.length,
      totalPlans: plans.length,
      averageCompletionPercent: plansWithChapters ? Math.round(percentSum / plansWithChapters) : 0,
      plansByScope,
      notificationsByChannel,
    };
  }
}
