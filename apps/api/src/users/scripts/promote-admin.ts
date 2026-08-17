/**
 * Bootstrap du tout premier compte admin : `npm run promote:admin -- <email-ou-téléphone>`.
 * Aucune UI ne permet de s'auto-promouvoir admin (voir AdminModule) — ce script,
 * sur le modèle de seed/run-seed.ts, est la seule voie prévue pour amorcer le rôle.
 */
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { AppModule } from "../../app.module";
import { User, type UserDocument } from "../schemas/user.schema";

async function run() {
  const logger = new Logger("PromoteAdmin");
  const identifier = process.argv[2];
  if (!identifier) {
    logger.error("Usage : npm run promote:admin -- <email-ou-téléphone>");
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const result = await userModel.updateOne(
      { $or: [{ email: identifier }, { phone: identifier }] },
      { $set: { role: "admin" } },
    );
    if (result.matchedCount === 0) {
      logger.error(`Aucun compte trouvé pour "${identifier}".`);
      process.exit(1);
    }
    logger.log(`Compte "${identifier}" promu administrateur.`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
