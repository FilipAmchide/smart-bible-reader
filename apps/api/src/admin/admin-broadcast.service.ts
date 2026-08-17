import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { FilterQuery } from "mongoose";
import { Model } from "mongoose";
import type { BroadcastResult } from "@sbr/shared-types";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { AdminAuditLogService } from "./admin-audit-log.service";
import type { SendBroadcastDto } from "./dto/send-broadcast.dto";

@Injectable()
export class AdminBroadcastService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly dispatchService: NotificationDispatchService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  async send(adminUserId: string, dto: SendBroadcastDto): Promise<BroadcastResult> {
    const filter: FilterQuery<UserDocument> = {};
    if (dto.language) filter.language = dto.language;
    const users = await this.userModel.find(filter);

    const sentAt = new Date();
    await Promise.all(
      users.map((user) =>
        this.dispatchService.dispatch(user, "broadcast", { subject: dto.subject, body: dto.body }, sentAt),
      ),
    );

    await this.auditLogService.record(adminUserId, "broadcast.send", "user", undefined, {
      subject: dto.subject,
      language: dto.language ?? "all",
      recipientCount: users.length,
    });

    return { recipientCount: users.length };
  }
}
