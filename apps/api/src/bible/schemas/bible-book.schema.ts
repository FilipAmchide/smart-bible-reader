import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { BibleBookNames, BookCategory, Testament } from "@sbr/shared-types";

export type BibleBookDocument = BibleBook & Document;

/** Référentiel statique — peu de lecture/écriture, jamais modifié par un utilisateur final. */
@Schema({ collection: "bible_books", timestamps: false })
export class BibleBook {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Object, required: true })
  names!: BibleBookNames;

  // `type: String` explicite sur testament/category — voir la note dans
  // user.schema.ts (unions importées, non résolvables en --transpile-only).
  @Prop({ type: String, required: true, enum: ["AT", "NT"] })
  testament!: Testament;

  @Prop({
    type: String,
    required: true,
    enum: [
      "law",
      "history_ot",
      "wisdom",
      "major_prophets",
      "minor_prophets",
      "gospel",
      "history_nt",
      "pauline_epistles",
      "general_epistles",
      "apocalyptic",
    ],
  })
  category!: BookCategory;

  @Prop({ required: true })
  chapterCount!: number;

  @Prop({ required: true, unique: true })
  canonicalOrder!: number;
}

export const BibleBookSchema = SchemaFactory.createForClass(BibleBook);
