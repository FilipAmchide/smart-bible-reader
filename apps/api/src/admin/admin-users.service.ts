import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { FilterQuery } from "mongoose";
import { Model } from "mongoose";
import type { AdminUserDetail, AdminUserSummary, Paginated } from "@sbr/shared-types";
import { buildLogsByPlan, toReadingPlanSummary } from "../reading-plans/reading-plan-summary.util";
import { ReadingLog, type ReadingLogDocument } from "../reading-plans/schemas/reading-log.schema";
import { ReadingPlan, type ReadingPlanDocument } from "../reading-plans/schemas/reading-plan.schema";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { toAdminUserDetail, toAdminUserSummary } from "./admin.mapper";
import type { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";

const DEFAULT_PAGE_SIZE = 20;

/** Échappe les caractères spéciaux d'une recherche libre avant de la passer en RegExp Mongo. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ReadingPlan.name) private readonly planModel: Model<ReadingPlanDocument>,
    @InjectModel(ReadingLog.name) private readonly logModel: Model<ReadingLogDocument>,
  ) {}

  async findAll(query: ListAdminUsersQueryDto): Promise<Paginated<AdminUserSummary>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const filter: FilterQuery<UserDocument> = {};
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ fullName: pattern }, { email: pattern }, { phone: pattern }];
    }
    if (query.language) filter.language = query.language;
    if (query.notificationChannel === "sms") filter["notificationSettings.smsEnabled"] = true;
    if (query.notificationChannel === "email") filter["notificationSettings.emailEnabled"] = true;
    if (query.notificationChannel === "web_push") filter["notificationSettings.webPushEnabled"] = true;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.userModel.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const [activePlanCounts, lastReads] = await Promise.all([
      this.planModel.aggregate<{ _id: unknown; count: number }>([
        { $match: { userId: { $in: userIds }, status: "active" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      this.logModel.aggregate<{ _id: unknown; lastReadAt: Date }>([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", lastReadAt: { $max: "$readAt" } } },
      ]),
    ]);
    const planCountById = new Map(activePlanCounts.map((r) => [String(r._id), r.count]));
    const lastReadById = new Map(lastReads.map((r) => [String(r._id), r.lastReadAt]));

    return {
      items: users.map((user) =>
        toAdminUserSummary(user, planCountById.get(user.id) ?? 0, lastReadById.get(user.id)),
      ),
      total,
      page,
      pageSize,
    };
  }

  async findOne(userId: string): Promise<AdminUserDetail> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("Compte introuvable.");

    const [plans, logs] = await Promise.all([
      this.planModel.find({ userId }).sort({ createdAt: -1 }),
      this.logModel.find({ userId }),
    ]);
    const logsByPlan = buildLogsByPlan(logs);
    const planSummaries = plans.map((plan) => toReadingPlanSummary(plan, logsByPlan.get(plan.id) ?? 0));
    const activePlanCount = plans.filter((p) => p.status === "active").length;
    const lastReadAt = logs.reduce<Date | undefined>(
      (latest, log) => (!latest || log.readAt > latest ? log.readAt : latest),
      undefined,
    );

    return toAdminUserDetail(user, activePlanCount, lastReadAt, planSummaries);
  }
}
