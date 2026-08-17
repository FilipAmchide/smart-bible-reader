import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import type { NotificationChannel, NotificationType } from "@sbr/shared-types";

export type NotificationLogDocument = NotificationLog & Document;

/** Journal des notifications envoyées — audit (§2.7) et déduplication du
 * planificateur (ne pas renvoyer deux fois le même rappel le même jour). */
@Schema({ timestamps: { createdAt: false, updatedAt: false }, collection: "notifications" })
export class NotificationLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ["sms", "email", "web_push"] })
  channel!: NotificationChannel;

  @Prop({
    type: String,
    required: true,
    enum: ["daily_reminder", "late_alert", "weekly_summary", "milestone", "broadcast"],
    index: true,
  })
  type!: NotificationType;

  @Prop({ type: String, required: true, enum: ["sent", "failed"] })
  status!: "sent" | "failed";

  @Prop({ required: true, default: () => new Date(), index: true })
  sentAt!: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
NotificationLogSchema.index({ userId: 1, type: 1, sentAt: -1 });
