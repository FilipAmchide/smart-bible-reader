import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User, UserSchema } from "./schemas/user.schema";
import { AuthModule } from "../auth/auth.module";
import { BibleModule } from "../bible/bible.module";

@Module({
  imports: [
    AuthModule, // fournit la stratégie/guard JWT utilisés par UsersController
    BibleModule, // fournit BibleVersionService (validation de preferredVersionCode)
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
