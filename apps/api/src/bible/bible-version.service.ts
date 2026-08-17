import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { FilterQuery } from "mongoose";
import { Model } from "mongoose";
import type { Language } from "@sbr/shared-types";
import { bibleVersionSeed } from "./bible-version-seed.data";
import { BibleVersion, type BibleVersionDocument } from "./schemas/bible-version.schema";

export interface BibleVersionInput {
  code: string;
  language: Language;
  name: string;
  provider: string;
  linkTemplate: string;
  active?: boolean;
}

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

  /** `includeInactive` réservé à la console admin (§2.7) — la liste proposée aux
   * utilisateurs (choix de version préférée, résolution de lien) reste toujours
   * filtrée aux versions actives.
   *
   * `{ $ne: false }` plutôt que `{ active: true }` : les versions seedées avant
   * l'introduction de ce champ n'ont pas `active` stocké en base (le défaut du
   * schéma ne s'applique qu'à la lecture des documents déjà trouvés, jamais au
   * filtre d'une requête Mongo) — un champ absent doit compter comme actif. */
  findAll(lang?: Language, includeInactive = false): Promise<BibleVersionDocument[]> {
    const filter: FilterQuery<BibleVersionDocument> = {};
    if (lang) filter.language = lang;
    if (!includeInactive) filter.active = { $ne: false };
    return this.versionModel.find(filter).sort({ code: 1 });
  }

  findByCode(code: string): Promise<BibleVersionDocument | null> {
    return this.versionModel.findOne({ code });
  }

  async create(input: BibleVersionInput): Promise<BibleVersionDocument> {
    const existing = await this.findByCode(input.code);
    if (existing) throw new BadRequestException("Ce code de version existe déjà.");
    return this.versionModel.create({ ...input, active: input.active ?? true });
  }

  async update(code: string, input: Partial<BibleVersionInput>): Promise<BibleVersionDocument> {
    const version = await this.versionModel.findOne({ code });
    if (!version) throw new NotFoundException("Version biblique introuvable.");
    Object.assign(version, input);
    await version.save();
    return version;
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
