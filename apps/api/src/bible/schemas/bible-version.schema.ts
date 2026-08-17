import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { Language } from "@sbr/shared-types";

export type BibleVersionDocument = BibleVersion & Document;

/** Référentiel des fournisseurs/versions externes vers lesquels pointent les
 * liens de lecture — SBR ne persiste jamais le texte biblique lui-même (§2.4). */
@Schema({ collection: "bible_versions", timestamps: { createdAt: true, updatedAt: true } })
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

  /** Désactivée = plus proposée par `findAll()` (donc plus sélectionnable), mais
   * conservée pour les utilisateurs qui l'ont déjà en `preferredVersionCode`
   * (voir la note sur BibleVersionService.resolveForUser). Gérée depuis la
   * console admin (§2.7) plutôt que par suppression — voir bible-version-seed.data.ts. */
  @Prop({ default: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BibleVersionSchema = SchemaFactory.createForClass(BibleVersion);
