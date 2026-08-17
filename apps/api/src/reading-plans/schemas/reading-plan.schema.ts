import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import type { ChapterRange, ReadingPlanStatus, ReadingScopeType, ScheduleEntryStatus } from "@sbr/shared-types";

export type ReadingPlanDocument = ReadingPlan & Document;

@Schema({ _id: false })
export class ChapterRangeSchemaClass implements ChapterRange {
  @Prop({ required: true })
  bookCode!: string;

  @Prop({ required: true })
  chapterFrom!: number;

  @Prop({ required: true })
  chapterTo!: number;
}
export const ChapterRangeSchema = SchemaFactory.createForClass(ChapterRangeSchemaClass);

@Schema({ _id: false })
export class ScheduleEntrySchemaClass {
  @Prop({ required: true })
  date!: Date;

  @Prop({ type: [ChapterRangeSchema], default: [] })
  chapters!: ChapterRangeSchemaClass[];

  // `type: String` explicite — ScheduleEntryStatus est une union importée
  // (voir la note sur user.schema.ts pour --transpile-only).
  @Prop({ type: String, required: true, enum: ["pending", "partial", "complete", "rest"], default: "pending" })
  status!: ScheduleEntryStatus;

  @Prop()
  completedAt?: Date;

  /** Cumulé à chaque appel de markRead qui fournit une durée — voir la note
   * sur ScheduleEntryView (temps déclaré, pas mesuré automatiquement). */
  @Prop({ default: 0 })
  readingDurationSeconds!: number;
}
export const ScheduleEntrySchema = SchemaFactory.createForClass(ScheduleEntrySchemaClass);

@Schema({ timestamps: { createdAt: true, updatedAt: true }, collection: "reading_plans" })
export class ReadingPlan {
  // `MongooseSchema.Types.ObjectId` — voir la note dans otp-code.schema.ts.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    required: true,
    enum: ["full_bible", "old_testament", "new_testament", "prophets", "psalms", "proverbs", "custom"],
  })
  scopeType!: ReadingScopeType;

  @Prop({ type: [String], required: true })
  bookCodes!: string[];

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: String, required: true, enum: ["active", "completed", "abandoned"], default: "active" })
  status!: ReadingPlanStatus;

  /** Figé à la création (et recalculé s'il change un jour) — évite de
   * recompter le référentiel biblique à chaque lecture de progression. */
  @Prop({ required: true })
  totalChapters!: number;

  @Prop({ type: [ScheduleEntrySchema], default: [] })
  schedule!: ScheduleEntrySchemaClass[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReadingPlanSchema = SchemaFactory.createForClass(ReadingPlan);
ReadingPlanSchema.index({ userId: 1, status: 1 });
