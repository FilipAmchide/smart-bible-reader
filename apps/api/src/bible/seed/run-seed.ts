/**
 * Amorçage manuel du référentiel biblique : `npm run seed:bible`.
 * Utile en CI ou après un `docker-compose down -v` — le service le fait
 * aussi automatiquement au démarrage si la collection est vide.
 */
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "../../app.module";
import { BibleService } from "../bible.service";

async function run() {
  const logger = new Logger("SeedBible");
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const count = await app.get(BibleService).seed();
    logger.log(`${count} livres bibliques synchronisés.`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
