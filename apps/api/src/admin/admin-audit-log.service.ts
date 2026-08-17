import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { AdminAuditAction, AuditLogEntry, Paginated } from "@sbr/shared-types";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { toAuditLogEntry } from "./admin.mapper";
import type { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";
import { AdminAuditLog, type AdminAuditLogDocument } from "./schemas/admin-audit-log.schema";

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectModel(AdminAuditLog.name) private readonly auditLogModel: Model<AdminAuditLogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /** N'échoue jamais : une annonce ou une modification de version déjà appliquée
   * ne doit pas être annulée par un souci de journalisation. */
  async record(
    adminUserId: string,
    action: AdminAuditAction,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogModel.create({ adminUserId, action, targetType, targetId, metadata });
  }

  async findAll(query: ListAuditLogQueryDto): Promise<Paginated<AuditLogEntry>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter = query.action ? { action: query.action } : {};

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.auditLogModel.countDocuments(filter),
    ]);

    const adminIds = [...new Set(logs.map((log) => log.adminUserId.toString()))];
    const admins = await this.userModel.find({ _id: { $in: adminIds } }, { fullName: 1 });
    const nameById = new Map(admins.map((a) => [a.id, a.fullName]));

    return {
      items: logs.map((log) => toAuditLogEntry(log, nameById.get(log.adminUserId.toString()) ?? "?")),
      total,
      page,
      pageSize,
    };
  }
}
