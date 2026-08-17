import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { bibleBooks } from "@sbr/bible-data";
import type { DashboardActivityPoint, DashboardSummary, ReadingPlanSummary } from "@sbr/shared-types";
import { addDaysUTC, formatDateOnly, todayUTC } from "../reading-plans/date-only.util";
import { effectiveEntryStatus } from "../reading-plans/schedule-status.util";
import { ReadingLog, type ReadingLogDocument } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, type ReadingPlanDocument } from "../reading-plans/schemas/reading-plan.schema";
import { computeStreak } from "./streak.util";

const TESTAMENT_BY_BOOK = new Map(bibleBooks.map((b) => [b.code, b.testament]));
const ACTIVITY_WINDOW_DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(ReadingPlan.name) private readonly planModel: Model<ReadingPlanDocument>,
    @InjectModel(ReadingLog.name) private readonly logModel: Model<ReadingLogDocument>,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const [plans, logs] = await Promise.all([
      this.planModel.find({ userId }).sort({ createdAt: -1 }),
      this.logModel.find({ userId }),
    ]);

    const today = todayUTC();
    const todayStr = formatDateOnly(today);

    const readDates = logs.map((l) => formatDateOnly(l.readAt));
    const streak = computeStreak(readDates, todayStr);

    let oldTestament = 0;
    let newTestament = 0;
    for (const log of logs) {
      if (TESTAMENT_BY_BOOK.get(log.bookCode) === "AT") oldTestament += 1;
      else newTestament += 1;
    }

    let daysComplete = 0;
    let daysMissed = 0;
    let daysPartial = 0;
    let totalReadingTimeSeconds = 0;
    for (const plan of plans) {
      for (const entry of plan.schedule) {
        totalReadingTimeSeconds += entry.readingDurationSeconds ?? 0;
        if (entry.chapters.length === 0) continue; // jour de repos : ne compte ni pour ni contre
        const status = effectiveEntryStatus(entry, today);
        if (status === "complete") daysComplete += 1;
        else if (status === "missed") daysMissed += 1;
        else if (status === "partial") daysPartial += 1;
      }
    }

    const activity = this.buildActivity(logs, today);

    const logsByPlan = new Map<string, number>();
    for (const log of logs) {
      const key = log.planId.toString();
      logsByPlan.set(key, (logsByPlan.get(key) ?? 0) + 1);
    }
    const toSummary = (plan: ReadingPlanDocument): ReadingPlanSummary => {
      const chaptersRead = logsByPlan.get(plan.id) ?? 0;
      return {
        id: plan.id,
        name: plan.name,
        scopeType: plan.scopeType,
        startDate: formatDateOnly(plan.startDate),
        endDate: formatDateOnly(plan.endDate),
        status: plan.status,
        progress: {
          chaptersRead,
          chaptersTotal: plan.totalChapters,
          percent: plan.totalChapters ? Math.round((chaptersRead / plan.totalChapters) * 100) : 0,
        },
      };
    };

    return {
      streak,
      totalChaptersRead: logs.length,
      totalReadingTimeSeconds,
      daysComplete,
      daysMissed,
      daysPartial,
      testamentSplit: { oldTestament, newTestament },
      activity,
      activePlans: plans.filter((p) => p.status === "active").map(toSummary),
      pastPlans: plans.filter((p) => p.status !== "active").map(toSummary),
    };
  }

  private buildActivity(logs: ReadingLogDocument[], today: ReturnType<typeof todayUTC>): DashboardActivityPoint[] {
    const countByDay = new Map<string, number>();
    for (const log of logs) {
      const key = formatDateOnly(log.readAt);
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }

    const points: DashboardActivityPoint[] = [];
    for (let i = ACTIVITY_WINDOW_DAYS - 1; i >= 0; i--) {
      const date = formatDateOnly(addDaysUTC(today, -i));
      points.push({ date, chaptersRead: countByDay.get(date) ?? 0 });
    }
    return points;
  }
}
