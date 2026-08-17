import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { Types } from "mongoose";
import { OtpService } from "../src/auth/otp.service";

/**
 * Modèle Mongoose minimal, en mémoire, couvrant exactement l'API utilisée
 * par OtpService (create / updateMany / findOne().sort()). Évite de monter
 * une vraie connexion Mongo pour un test qui ne teste que la logique métier.
 */
class FakeOtpModel {
  docs: any[] = [];

  async create(data: any) {
    const doc = {
      ...data,
      attempts: data.attempts ?? 0,
      used: data.used ?? false,
      createdAt: new Date(),
      save: async function save(this: any) {
        return this;
      },
    };
    this.docs.push(doc);
    return doc;
  }

  async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
    this.docs.filter((d) => this.matches(d, filter)).forEach((d) => Object.assign(d, update));
  }

  findOne(filter: Record<string, unknown>) {
    const matches = this.docs.filter((d) => this.matches(d, filter));
    return {
      sort: async () => {
        matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return matches[0] ?? null;
      },
    };
  }

  private matches(doc: any, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([key, condition]) => {
      const value = doc[key];
      if (condition && typeof condition === "object" && "$gt" in (condition as object)) {
        return value > (condition as { $gt: number | Date }).$gt;
      }
      return value === condition;
    });
  }
}

function makeConfigService(overrides: Partial<{ maxAttempts: number }> = {}) {
  return {
    get: () => ({
      otp: { ttlSeconds: 300, length: 6, maxAttempts: overrides.maxAttempts ?? 5 },
      secretsEncryptionKey: "test-hmac-key",
    }),
  } as unknown as ConfigService;
}

describe("OtpService", () => {
  it("génère un code numérique de la longueur configurée", async () => {
    const model = new FakeOtpModel();
    const service = new OtpService(model as any, makeConfigService());
    const code = await service.generate(new Types.ObjectId(), "user@example.com", "login");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("valide un code correct puis le rejette s'il est réutilisé", async () => {
    const model = new FakeOtpModel();
    const service = new OtpService(model as any, makeConfigService());
    const userId = new Types.ObjectId();
    const code = await service.generate(userId, "user@example.com", "login");

    const verifiedUserId = await service.verify("user@example.com", "login", code);
    expect(verifiedUserId.toString()).toBe(userId.toString());

    await expect(service.verify("user@example.com", "login", code)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejette un mauvais code et verrouille après le nombre max de tentatives", async () => {
    const model = new FakeOtpModel();
    const service = new OtpService(model as any, makeConfigService({ maxAttempts: 2 }));
    await service.generate(new Types.ObjectId(), "+243900000000", "login");

    await expect(service.verify("+243900000000", "login", "000000")).rejects.toThrow(
      UnauthorizedException,
    );
    // deuxième échec : atteint maxAttempts, la porte se referme même sur le bon code ensuite
    await expect(service.verify("+243900000000", "login", "111111")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("invalide les codes précédents quand un nouveau est généré pour le même identifiant", async () => {
    const model = new FakeOtpModel();
    const service = new OtpService(model as any, makeConfigService());
    const userId = new Types.ObjectId();
    const firstCode = await service.generate(userId, "user@example.com", "login");
    await service.generate(userId, "user@example.com", "login");

    await expect(service.verify("user@example.com", "login", firstCode)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
