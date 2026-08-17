import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import type { AdminAuditAction } from "@sbr/shared-types";

export type AdminAuditLogDocument = AdminAuditLog & Document;

/** Journal des actions administrateur (§2.7) — distinct de NotificationLog,
 * qui journalise l'envoi des notifications elles-mêmes, pas la décision admin
 * qui l'a déclenché. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "admin_audit_logs" })
export class AdminAuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  adminUserId!: Types.ObjectId;

  // `type: String` explicite : AdminAuditAction est une union importée, non
  // résolvable par `--transpile-only` (voir la même note sur user.schema.ts).
  @Prop({ type: String, required: true, index: true })
  action!: AdminAuditAction;

  @Prop({ required: true })
  targetType!: string;

  @Prop()
  targetId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, unknown>;

  createdAt!: Date;
}

export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);
AdminAuditLogSchema.index({ createdAt: -1 });
