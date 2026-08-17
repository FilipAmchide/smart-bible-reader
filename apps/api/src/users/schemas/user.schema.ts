import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { Language, Role } from "@sbr/shared-types";
import { NotificationSettings, NotificationSettingsSchema } from "./notification-settings.schema";

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: true }, collection: "users" })
export class User {
  @Prop({ required: true, trim: true })
  fullName!: string;

  // Index unique partiel : n'applique l'unicité qu'aux documents où le champ
  // existe réellement (voir index déclaré plus bas), pour accepter des
  // comptes identifiés par un seul des deux canaux.
  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  phoneVerifiedAt?: Date;

  /** Absent pour un compte purement OTP (pas de mot de passe défini). */
  @Prop()
  passwordHash?: string;

  // `type: String` explicite : Role est un type importé (union de littéraux),
  // que `--transpile-only` (utilisé par `npm run start:dev`) ne peut pas
  // résoudre sans passer par le vérificateur de types — sans cette précision,
  // @nestjs/mongoose lève "Cannot determine a type for the field" au démarrage.
  @Prop({ type: String, required: true, enum: ["user", "admin"], default: "user" })
  role!: Role;

  @Prop({ default: false })
  twoFAEnabled!: boolean;

  /** Secret TOTP chiffré au repos (voir SecretBox) — jamais en clair en base. */
  @Prop()
  twoFASecretEncrypted?: string;

  /** Hashs argon2 des codes de secours 2FA — un code consommé est retiré du tableau. */
  @Prop({ type: [String], default: [] })
  backupCodeHashes!: string[];

  @Prop({ type: String, required: true, enum: ["fr", "en", "es", "de", "ar", "bas"], default: "fr" })
  language!: Language;

  @Prop({ required: true, default: "UTC" })
  timezone!: string;

  /** Réservé à la phase 2 (liens de lecture externes). */
  @Prop()
  preferredVersionCode?: string;

  @Prop({ type: NotificationSettingsSchema, default: () => ({}) })
  notificationSettings!: NotificationSettings;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Unicité applicative : email/phone uniques *quand renseignés*, sans empêcher
// deux comptes d'avoir tous deux l'un des deux champs absent.
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
UserSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });
