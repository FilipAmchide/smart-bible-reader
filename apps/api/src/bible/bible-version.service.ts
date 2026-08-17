import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Language } from "@sbr/shared-types";
import { bibleVersionSeed } from "./bible-version-seed.data";
import { BibleVersion, type BibleVersionDocument } from "./schemas/bible-version.schema";

@Injectable()
export class BibleVersionService implements OnModuleInit {
  private readonly logger = new Logger(BibleVersionService.name);

  constructor(
    @InjectModel(BibleVersion.name) private readonly versionModel: Model<BibleVersionDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((await this.versionModel.estimatedDocumentCount()) === 0) {
      this.logger.log("Collection bible_versions vide — amorçage du catalogue par défaut…");
      await this.seed();
    }
  }

  async seed(): Promise<number> {
    const ops = bibleVersionSeed.map((version) => ({
      updateOne: { filter: { code: version.code }, update: { $set: version }, upsert: true },
    }));
    await this.versionModel.bulkWrite(ops);
    return ops.length;
  }

  findAll(lang?: Language): Promise<BibleVersionDocument[]> {
    return this.versionModel.find(lang ? { language: lang } : {}).sort({ code: 1 });
  }

  findByCode(code: string): Promise<BibleVersionDocument | null> {
    return this.versionModel.findOne({ code });
  }

  /** Version à utiliser pour un utilisateur : sa préférence explicite, sinon
   * la première version disponible dans sa langue d'interface, sinon aucune. */
  async resolveForUser(user: {
    preferredVersionCode?: string;
    language: Language;
  }): Promise<BibleVersionDocument | null> {
    if (user.preferredVersionCode) {
      const preferred = await this.findByCode(user.preferredVersionCode);
      if (preferred) return preferred;
    }
    const [fallback] = await this.findAll(user.language);
    return fallback ?? null;
  }

  buildLink(version: Pick<BibleVersion, "linkTemplate">, bookCode: string, chapter: number): string {
    return version.linkTemplate
      .replace("{bookCode}", bookCode)
      .replace("{chapter}", String(chapter));
  }
}
