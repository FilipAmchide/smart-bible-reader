import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { AppConfig } from "../config/configuration";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<AppConfig>("app")!.mongodbUri,
      }),
    }),
  ],
})
export class DatabaseModule {}
