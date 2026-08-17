import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { BibleVersionInput } from "../src/bible/bible-version.service";
import { BibleVersionService } from "../src/bible/bible-version.service";

/** Modèle Mongoose minimal couvrant exactement l'API utilisée par
 * BibleVersionService (findOne / create / find().sort()) — même approche que
 * test/otp.service.spec.ts, sans connexion Mongo réelle. */
class FakeVersionModel {
  docs: any[] = [];

  /** Seed direct (contourne create()) — ajoute .save() comme le ferait Mongoose à l'hydratation. */
  seed(data: any) {
    this.docs.push({ ...data, save: async function save(this: any) { return this; } });
  }

  async findOne(filter: Record<string, unknown>) {
    return this.docs.find((d) => d.code === filter.code) ?? null;
  }

  find(filter: Record<string, unknown> = {}) {
    const matches = this.docs.filter((d) => {
      if (filter.language && d.language !== filter.language) return false;
      const activeCond = filter.active as { $ne?: unknown } | boolean | undefined;
      if (activeCond !== undefined) {
        if (typeof activeCond === "object" && activeCond !== null && "$ne" in activeCond) {
          if (d.active === activeCond.$ne) return false;
        } else if (d.active !== activeCond) {
          return false;
        }
      }
      return true;
    });
    return { sort: async () => matches };
  }

  async estimatedDocumentCount() {
    return this.docs.length;
  }

  async create(data: any) {
    const doc = { ...data, save: async function save(this: any) { return this; } };
    this.docs.push(doc);
    return doc;
  }
}

function makeVersion(overrides: Partial<BibleVersionInput> = {}): BibleVersionInput {
  return {
    code: "S21",
    language: "fr",
    name: "Segond 21",
    provider: "YouVersion",
    linkTemplate: "https://example.com/{bookCode}.{chapter}",
    active: true,
    ...overrides,
  };
}

describe("BibleVersionService", () => {
  it("crée une nouvelle version", async () => {
    const model = new FakeVersionModel();
    const service = new BibleVersionService(model as any);
    const created = await service.create(makeVersion());
    expect(created.code).toBe("S21");
    expect(created.active).toBe(true);
  });

  it("refuse de créer un code déjà existant", async () => {
    const model = new FakeVersionModel();
    model.seed(makeVersion());
    const service = new BibleVersionService(model as any);
    await expect(service.create(makeVersion())).rejects.toThrow(BadRequestException);
  });

  it("met à jour une version existante (ex. la désactiver)", async () => {
    const model = new FakeVersionModel();
    model.seed(makeVersion());
    const service = new BibleVersionService(model as any);

    const updated = await service.update("S21", { active: false });
    expect(updated.active).toBe(false);
  });

  it("refuse de mettre à jour un code inconnu", async () => {
    const model = new FakeVersionModel();
    const service = new BibleVersionService(model as any);
    await expect(service.update("INCONNU", { active: false })).rejects.toThrow(NotFoundException);
  });

  it("findAll masque les versions désactivées par défaut", async () => {
    const model = new FakeVersionModel();
    model.seed(makeVersion({ code: "S21" }));
    model.seed(makeVersion({ code: "OLD", active: false }));
    const service = new BibleVersionService(model as any);

    const activeOnly = await service.findAll();
    expect(activeOnly.map((v: any) => v.code)).toEqual(["S21"]);

    const all = await service.findAll(undefined, true);
    expect(all.map((v: any) => v.code).sort()).toEqual(["OLD", "S21"]);
  });

  it("traite un document seedé avant l'ajout du champ `active` comme actif", async () => {
    // Reproduit les documents créés par bulkWrite() avant l'introduction du
    // champ `active` : rien n'est stocké, ni `true` ni `false`. Un filtre
    // `{ active: true }` les exclurait à tort côté Mongo (le défaut du schéma
    // ne s'applique qu'à l'hydratation, jamais au filtre de la requête) — voir
    // la note sur BibleVersionService.findAll.
    const model = new FakeVersionModel();
    const { active: _unused, ...legacyVersion } = makeVersion({ code: "LEGACY" });
    model.seed(legacyVersion);
    const service = new BibleVersionService(model as any);

    const activeOnly = await service.findAll();
    expect(activeOnly.map((v: any) => v.code)).toEqual(["LEGACY"]);
  });
});
