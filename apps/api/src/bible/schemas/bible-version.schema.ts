import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { Language } from "@sbr/shared-types";

export type BibleVersionDocument = BibleVersion & Document;

/** Référentiel des fournisseurs/versions externes vers lesquels pointent les
 * liens de lecture — SBR ne persiste jamais le texte biblique lui-même (§2.4). */
@Schema({ collection: "bible_versions", timestamps: false })
export class BibleVersion {
  @Prop({ required: true, unique: true })
  code!: string;

  // `type: String` explicite : Language est une union importée, non résolvable
  // par `--transpile-only` (voir la même note sur bible-book.schema.ts).
  @Prop({ type: String, required: true, index: true })
  language!: Language;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  provider!: string;

  /** Gabarit avec jetons {bookCode} et {chapter} — voir BibleVersionService.buildLink. */
  @Prop({ required: true })
  linkTemplate!: string;
}

export const BibleVersionSchema = SchemaFactory.createForClass(BibleVersion);
