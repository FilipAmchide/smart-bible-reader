import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { createHmac, randomInt } from "crypto";
import { Model, Types } from "mongoose";
import type { OtpPurpose } from "@sbr/shared-types";
import type { AppConfig } from "../config/configuration";
import { OtpCode, type OtpCodeDocument } from "./schemas/otp-code.schema";

@Injectable()
export class OtpService {
  private readonly config: AppConfig;

  constructor(
    @InjectModel(OtpCode.name) private readonly otpModel: Model<OtpCodeDocument>,
    configService: ConfigService,
  ) {
    this.config = configService.get<AppConfig>("app")!;
  }

  /** Génère un code, le persiste sous forme de hash, et renvoie le code en clair à envoyer. */
  async generate(userId: Types.ObjectId, identifier: string, purpose: OtpPurpose): Promise<string> {
    const { length, ttlSeconds } = this.config.otp;
    const max = 10 ** length;
    const code = randomInt(0, max).toString().padStart(length, "0");

    // Un seul code valide à la fois par identifiant/objectif : les précédents
    // sont invalidés pour éviter qu'un ancien code traîne encore utilisable.
    await this.otpModel.updateMany({ identifier, purpose, used: false }, { used: true });

    await this.otpModel.create({
      userId,
      identifier,
      purpose,
      codeHash: this.hash(identifier, purpose, code),
      attempts: 0,
      used: false,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });

    return code;
  }

  /** Vérifie un code ; lève UnauthorizedException si invalide, expiré, ou trop de tentatives. */
  async verify(identifier: string, purpose: OtpPurpose, code: string): Promise<Types.ObjectId> {
    const doc = await this.otpModel
      .findOne({ identifier, purpose, used: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });

    if (!doc || doc.attempts >= this.config.otp.maxAttempts) {
      throw new UnauthorizedException("Code invalide ou expiré.");
    }

    const expected = this.hash(identifier, purpose, code);
    if (expected !== doc.codeHash) {
      doc.attempts += 1;
      await doc.save();
      throw new UnauthorizedException("Code invalide ou expiré.");
    }

    doc.used = true;
    await doc.save();
    return doc.userId;
  }

  private hash(identifier: string, purpose: OtpPurpose, code: string): string {
    return createHmac("sha256", this.config.secretsEncryptionKey)
      .update(`${identifier}:${purpose}:${code}`)
      .digest("hex");
  }
}
