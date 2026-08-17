import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export type DeviceDocument = Device & Document;

/** Un abonnement Web Push par appareil/navigateur — §07 du cahier des charges. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "devices" })
export class Device {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  endpoint!: string;

  @Prop({ required: true })
  p256dh!: string;

  @Prop({ required: true })
  auth!: string;

  createdAt!: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
// Un même endpoint ne doit être enregistré qu'une fois par utilisateur (ré-abonnement idempotent).
DeviceSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
