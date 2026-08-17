import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import type { OtpPurpose } from "@sbr/shared-types";

export type OtpCodeDocument = OtpCode & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "otp_codes" })
export class OtpCode {
  // `MongooseSchema.Types.ObjectId` (le SchemaType), pas `Types.ObjectId` (la
  // classe BSON de construction de valeurs) : les deux existent dans
  // "mongoose" et se ressemblent, mais seul le premier fait réellement
  // caster ce champ en ObjectId au lieu de le stocker en chaîne brute.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  identifier!: string;

  // `type: String` explicite — voir la note dans user.schema.ts (union importée).
  @Prop({ type: String, required: true, enum: ["login", "verify_identifier"] })
  purpose!: OtpPurpose;

  /** Jamais le code en clair — un hash salé (voir OtpService). */
  @Prop({ required: true })
  codeHash!: string;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: false })
  used!: boolean;

  /** Index TTL : Mongo purge le document dès que expiresAt est dépassé. */
  @Prop({ required: true, expires: 0, index: true })
  expiresAt!: Date;
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);
OtpCodeSchema.index({ identifier: 1, purpose: 1, createdAt: -1 });
