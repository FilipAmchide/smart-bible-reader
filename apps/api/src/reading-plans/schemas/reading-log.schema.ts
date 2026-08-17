import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export type ReadingLogDocument = ReadingLog & Document;

/** Journal d'événements "chapitre lu" — source de vérité pour la progression,
 * distincte du planning (qui reste la trace de ce qui était *prévu*). */
@Schema({ timestamps: { createdAt: false, updatedAt: false }, collection: "reading_logs" })
export class ReadingLog {
  // `MongooseSchema.Types.ObjectId` — voir la note dans otp-code.schema.ts.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ReadingPlan", required: true, index: true })
  planId!: Types.ObjectId;

  @Prop({ required: true })
  bookCode!: string;

  @Prop({ required: true })
  chapter!: number;

  @Prop({ required: true, default: () => new Date() })
  readAt!: Date;
}

export const ReadingLogSchema = SchemaFactory.createForClass(ReadingLog);
// Un chapitre donné n'est lu qu'une fois par plan — l'upsert de markRead s'appuie dessus.
ReadingLogSchema.index({ userId: 1, planId: 1, bookCode: 1, chapter: 1 }, { unique: true });
ReadingLogSchema.index({ userId: 1, planId: 1, readAt: 1 });
